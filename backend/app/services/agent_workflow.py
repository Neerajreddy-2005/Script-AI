"""Bounded script workflow: draft -> validate -> (revise -> validate)*.

This is a fixed, inspectable state machine rather than an open-ended agent: the model never
chooses tools, URLs, or actions. Each tool has validated inputs and outputs, every step is
recorded, and hard limits on steps and revisions cap latency and cost.

`standard` mode runs the same workflow with zero revisions (one model call + validation).
"""

import json
import logging
import re
import time
from dataclasses import dataclass, field

from pydantic import BaseModel, ValidationError

from app.core.errors import ProviderError
from app.core.logging import log_event
from app.schemas.generation import GenerateRequest, ScriptData, Section, ValidationResult, WorkflowStep
from app.schemas.knowledge import ScoredChunk
from app.services.llm import LLMClient, LLMResult
from app.services.prompts import (
	REPAIR_PROMPT,
	SYSTEM_PROMPT,
	build_generation_prompt,
	build_revision_prompt,
	max_tokens_for,
	source_label,
)
from app.services.validation import error_count, revisable_issues, revision_score, validate_script

logger = logging.getLogger("scriptai.workflow")

_FENCE = re.compile(r"^```(?:json)?\s*|\s*```$", re.I)


class RawScriptOutput(BaseModel):
	"""Schema the model must return. Sections may be strings or {"script": str} objects."""

	title: str = ""
	introduction: str | Section
	mainContent: str | Section
	conclusion: str | Section
	sources_used: list[str] = []


def parse_script_output(text: str, fallback_title: str) -> tuple[ScriptData, list[str]]:
	"""Parse model output into ScriptData. Raises ProviderError(malformed_output) if unusable."""
	cleaned = _FENCE.sub("", text.strip())
	start, end = cleaned.find("{"), cleaned.rfind("}")
	if start == -1 or end <= start:
		raise ProviderError("The AI returned a response in an unexpected format.", "malformed_output")
	try:
		raw = RawScriptOutput.model_validate(json.loads(cleaned[start : end + 1]))
	except (json.JSONDecodeError, ValidationError) as exc:
		raise ProviderError("The AI returned a response in an unexpected format.", "malformed_output") from exc

	def section(value: str | Section) -> Section:
		return value if isinstance(value, Section) else Section(script=str(value))

	script = ScriptData(
		title=raw.title.strip() or fallback_title,
		introduction=section(raw.introduction),
		mainContent=section(raw.mainContent),
		conclusion=section(raw.conclusion),
	)
	if not any(s.script.strip() for s in (script.introduction, script.mainContent, script.conclusion)):
		raise ProviderError("The AI returned an empty script.", "empty_output")
	cited = [s.strip().upper() for s in raw.sources_used if isinstance(s, str) and re.fullmatch(r"\s*S\d+\s*", s, re.I)]
	return script, list(dict.fromkeys(cited))


@dataclass
class UsageTotals:
	llm_calls: int = 0
	input_tokens: int | None = 0
	output_tokens: int | None = 0
	model: str = ""

	def add(self, result: LLMResult) -> None:
		self.llm_calls += 1
		self.model = result.model
		# A single call without usage data makes the totals unknown rather than understated.
		self.input_tokens = None if self.input_tokens is None or result.input_tokens is None else self.input_tokens + result.input_tokens
		self.output_tokens = None if self.output_tokens is None or result.output_tokens is None else self.output_tokens + result.output_tokens


@dataclass
class WorkflowOutcome:
	script: ScriptData
	cited: list[str]
	validation: ValidationResult
	steps: list[WorkflowStep] = field(default_factory=list)
	usage: UsageTotals = field(default_factory=UsageTotals)


class StepBudgetExceeded(Exception):
	pass


class ScriptWorkflow:
	def __init__(self, llm: LLMClient, max_steps: int, max_revisions: int):
		self.llm = llm
		self.max_steps = max_steps
		self.max_revisions = max_revisions

	def run(self, req: GenerateRequest, context: list[ScoredChunk], steps: list[WorkflowStep]) -> WorkflowOutcome:
		"""`steps` may already contain earlier steps (e.g. retrieval); they count toward the budget."""
		usage = UsageTotals(model=self.llm.model)
		available = {source_label(i) for i in range(len(context))}

		script, cited = self._step(steps, "draft", self._generate, req, context, usage)
		validation = self._step(steps, "validate", validate_script, script, req, available, cited)
		best = (script, cited, validation)

		revisions = 0
		while revisable_issues(best[2]) and revisions < self.max_revisions:
			if len(steps) + 2 > self.max_steps:  # a revision needs a revise + a validate step
				steps.append(WorkflowStep(name="revise", status="skipped", duration_ms=0, detail="step budget reached"))
				break
			revisions += 1
			problems = [i.message for i in revisable_issues(best[2])]
			try:
				script, cited = self._step(steps, f"revise_{revisions}", self._revise, req, context, best[0], problems, usage)
			except ProviderError:
				# Fallback: keep the best draft so far instead of failing the whole request.
				break
			validation = self._step(steps, f"validate_{revisions}", validate_script, script, req, available, cited)
			# Never let a revision make things worse.
			if revision_score(validation) <= revision_score(best[2]):
				best = (script, cited, validation)

		log_event(
			logger,
			"workflow_finished",
			steps=len(steps),
			revisions=revisions,
			passed=best[2].passed,
			llm_calls=usage.llm_calls,
		)
		return WorkflowOutcome(script=best[0], cited=best[1], validation=best[2], steps=steps, usage=usage)

	def _step(self, steps: list[WorkflowStep], name: str, fn, *args):
		if len(steps) >= self.max_steps:
			raise StepBudgetExceeded(name)
		started = time.perf_counter()
		try:
			result = fn(*args)
		except ProviderError as exc:
			steps.append(WorkflowStep(name=name, status="failed", duration_ms=_ms(started), detail=exc.code))
			raise
		detail = None
		if isinstance(result, ValidationResult):
			detail = "passed" if result.passed else f"{error_count(result)} error(s)"
		steps.append(WorkflowStep(name=name, status="ok", duration_ms=_ms(started), detail=detail))
		return result

	# --- tools ---------------------------------------------------------------

	def _call(self, prompt: str, req: GenerateRequest, usage: UsageTotals) -> tuple[ScriptData, list[str]]:
		"""One model call plus at most one repair attempt for malformed JSON."""
		result = self.llm.complete(SYSTEM_PROMPT, prompt, max_tokens=max_tokens_for(req.length))
		usage.add(result)
		try:
			return parse_script_output(result.text, req.topic)
		except ProviderError as exc:
			if exc.code != "malformed_output":
				raise
			retry = self.llm.complete(
				SYSTEM_PROMPT, f"{prompt}\n\n{REPAIR_PROMPT}", max_tokens=max_tokens_for(req.length)
			)
			usage.add(retry)
			return parse_script_output(retry.text, req.topic)

	def _generate(self, req, context, usage):
		return self._call(build_generation_prompt(req, context), req, usage)

	def _revise(self, req, context, draft: ScriptData, problems: list[str], usage):
		return self._call(build_revision_prompt(req, context, draft, problems), req, usage)


def _ms(started: float) -> int:
	return int((time.perf_counter() - started) * 1000)
