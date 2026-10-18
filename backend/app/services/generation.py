"""Generation use case: quota -> optional retrieval -> workflow -> cleaning -> record."""

import logging
import time
import uuid
from datetime import datetime, timezone

from app.core.auth import CurrentUser
from app.core.config import Settings
from app.core.errors import AppError, ProviderError, QuotaExceededError
from app.core.logging import log_event
from app.repositories.base import Repository
from app.schemas.generation import (
	GenerateRequest,
	GenerateResponse,
	GenerationMetadata,
	KnowledgeBaseInfo,
	ScriptData,
	Section,
	SourceRef,
	Usage,
	WorkflowStep,
)
from app.schemas.knowledge import ScoredChunk
from app.services.agent_workflow import ScriptWorkflow
from app.services.knowledge import KnowledgeService
from app.services.llm import LLMClient, estimate_cost
from app.services.prompts import build_search_query, source_label
from app.services.text_cleaner import clean_text_block

logger = logging.getLogger("scriptai.generation")

MIN_WORKFLOW_STEPS = 3  # retrieve + draft + validate


def start_of_utc_day() -> datetime:
	return datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)


def clean_script(script: ScriptData) -> ScriptData:
	"""Strip emojis, unwanted quotes, and markdown from every section."""
	return ScriptData(
		title=clean_text_block(script.title),
		introduction=Section(script=clean_text_block(script.introduction.script)),
		mainContent=Section(script=clean_text_block(script.mainContent.script)),
		conclusion=Section(script=clean_text_block(script.conclusion.script)),
	)


def to_source_refs(context: list[ScoredChunk], cited: list[str]) -> list[SourceRef]:
	"""Only sources the model cited and that were actually retrieved are returned."""
	by_label = {source_label(i): hit for i, hit in enumerate(context)}
	refs = []
	for label in cited:
		hit = by_label.get(label)
		if not hit:
			continue
		snippet = hit.chunk.text[:240].rsplit(" ", 1)[0] + ("..." if len(hit.chunk.text) > 240 else "")
		refs.append(
			SourceRef(
				id=label,
				document_id=hit.chunk.document_id,
				filename=hit.filename,
				chunk_index=hit.chunk.chunk_index,
				section=hit.chunk.section,
				page_number=hit.chunk.page_number,
				score=round(hit.similarity if hit.similarity is not None else hit.fused_score, 4),
				snippet=snippet,
			)
		)
	return refs


class GenerationService:
	def __init__(self, llm: LLMClient, knowledge: KnowledgeService, repo: Repository, settings: Settings):
		self.llm = llm
		self.knowledge = knowledge
		self.repo = repo
		self.settings = settings

	def check_quota(self, user: CurrentUser) -> dict[str, int]:
		limit = self.settings.quota_for(user.tier)
		used = self.repo.count_generations_since(user.id, start_of_utc_day())
		if used >= limit:
			raise QuotaExceededError()
		return {"limit": limit, "used": used, "remaining": limit - used}

	def generate(self, user: CurrentUser, req: GenerateRequest, request_id: str) -> GenerateResponse:
		started = time.perf_counter()
		quota = self.check_quota(user)
		steps: list[WorkflowStep] = []
		context: list[ScoredChunk] = []
		kb = KnowledgeBaseInfo(status="disabled")

		if req.use_knowledge_base:
			t0 = time.perf_counter()
			try:
				doc_ids = [str(d) for d in req.document_ids] if req.document_ids else None
				result = self.knowledge.retrieve(user.id, build_search_query(req), document_ids=doc_ids)
				context = result.chunks
				kb = KnowledgeBaseInfo(status="used" if context else "no_relevant_context", retrieved=len(context))
				steps.append(WorkflowStep(name="retrieve", status="ok", duration_ms=_ms(t0), detail=f"{len(context)} chunk(s)"))
			except ProviderError as exc:
				# Retrieval is an enhancement: degrade to generation without context.
				kb = KnowledgeBaseInfo(status="unavailable")
				steps.append(WorkflowStep(name="retrieve", status="failed", duration_ms=_ms(t0), detail=exc.code))

		max_revisions = self.settings.max_agent_revisions if req.mode == "assisted" else 0
		workflow = ScriptWorkflow(self.llm, max(self.settings.max_agent_steps, MIN_WORKFLOW_STEPS + (1 if req.use_knowledge_base else 0)), max_revisions)
		record = {
			"id": request_id if _is_uuid(request_id) else str(uuid.uuid4()),
			"owner_id": user.id,
			"request": req.model_dump(mode="json", exclude={"topic"}) | {"topic_chars": len(req.topic)},
			"mode": req.mode,
			"provider": self.llm.provider,
			"created_at": datetime.now(timezone.utc),
		}
		try:
			outcome = workflow.run(req, context, steps)
		except AppError as exc:
			self._record(record, status="failed", error_code=exc.code, started=started)
			raise

		usage = Usage(
			provider=self.llm.provider,
			model=outcome.usage.model or self.llm.model,
			llm_calls=outcome.usage.llm_calls,
			input_tokens=outcome.usage.input_tokens,
			output_tokens=outcome.usage.output_tokens,
			estimated_cost_usd=estimate_cost(self.settings, outcome.usage.input_tokens, outcome.usage.output_tokens),
		)
		sources = to_source_refs(context, outcome.cited)
		duration_ms = _ms(started)
		self._record(
			record,
			status="succeeded",
			started=started,
			validation=outcome.validation.model_dump(),
			sources=[{"document_id": s.document_id, "chunk_index": s.chunk_index} for s in sources],
			usage=usage,
		)
		log_event(
			logger,
			"generation_succeeded",
			mode=req.mode,
			provider=usage.provider,
			model=usage.model,
			llm_calls=usage.llm_calls,
			input_tokens=usage.input_tokens,
			output_tokens=usage.output_tokens,
			kb_status=kb.status,
			retrieved=kb.retrieved,
			validation_passed=outcome.validation.passed,
			duration_ms=duration_ms,
		)
		return GenerateResponse(
			data=clean_script(outcome.script),
			metadata=GenerationMetadata(
				request_id=request_id,
				mode=req.mode,
				duration_ms=duration_ms,
				knowledge_base=kb,
				sources=sources,
				validation=outcome.validation,
				workflow=outcome.steps,
				usage=usage,
				quota={**quota, "used": quota["used"] + 1, "remaining": quota["remaining"] - 1},
			),
		)

	def _record(self, record: dict, *, status: str, started: float, error_code: str | None = None,
				validation: dict | None = None, sources: list | None = None, usage: Usage | None = None) -> None:
		"""Generation records hold metadata only (no topic text or script output) for privacy."""
		try:
			self.repo.record_generation({
				**record,
				"status": status,
				"error_code": error_code,
				"validation": validation,
				"sources": sources or [],
				"model": usage.model if usage else self.llm.model,
				"llm_calls": usage.llm_calls if usage else None,
				"input_tokens": usage.input_tokens if usage else None,
				"output_tokens": usage.output_tokens if usage else None,
				"estimated_cost_usd": usage.estimated_cost_usd if usage else None,
				"duration_ms": _ms(started),
			})
		except Exception:  # analytics must never break generation
			logger.warning("generation_record_failed", exc_info=True)


def _ms(started: float) -> int:
	return int((time.perf_counter() - started) * 1000)


def _is_uuid(value: str) -> bool:
	try:
		uuid.UUID(value)
		return True
	except ValueError:
		return False
