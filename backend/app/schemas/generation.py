from typing import Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_validator

Platform = Literal["YouTube", "TikTok", "Instagram", "Podcast", "LinkedIn", "Twitter"]
Tone = Literal["Casual", "Professional", "Humorous", "Educational", "Persuasive", "Inspirational"]
Length = Literal["Short (2-3 min)", "Medium (5-7 min)", "Long (10-15 min)", "Extra Long (20+ min)"]
Mode = Literal["standard", "assisted"]


class GenerateRequest(BaseModel):
	# Unknown fields are ignored so older clients (and the n8n-era payload) keep working.
	model_config = ConfigDict(extra="ignore", str_strip_whitespace=True)

	topic: str = Field(min_length=3, max_length=300)
	platform: Platform
	tone: Tone
	length: Length
	# Accepted for backward compatibility only. The quota tier comes from the verified token.
	subscription: Literal["basic", "pro", "premium"] | None = None

	use_knowledge_base: bool = False
	document_ids: list[UUID] | None = Field(default=None, max_length=20)
	mode: Mode = "standard"
	keywords: list[str] = Field(default_factory=list, max_length=10)
	audience: str | None = Field(default=None, max_length=200)
	call_to_action: str | None = Field(default=None, max_length=200)

	@field_validator("keywords")
	@classmethod
	def _clean_keywords(cls, v: list[str]) -> list[str]:
		cleaned = []
		for kw in v:
			kw = kw.strip()
			if not kw:
				continue
			if len(kw) > 50:
				raise ValueError("each keyword must be at most 50 characters")
			if kw.lower() not in (c.lower() for c in cleaned):
				cleaned.append(kw)
		return cleaned

	@field_validator("audience", "call_to_action")
	@classmethod
	def _empty_to_none(cls, v: str | None) -> str | None:
		return v or None


class Section(BaseModel):
	script: str


class ScriptData(BaseModel):
	"""Same shape the dashboard has always rendered."""

	title: str
	introduction: Section
	mainContent: Section
	conclusion: Section

	def full_text(self) -> str:
		return "\n\n".join([self.introduction.script, self.mainContent.script, self.conclusion.script])


class SourceRef(BaseModel):
	id: str  # "S1", "S2"... as cited in the script prompt
	document_id: str
	filename: str
	chunk_index: int
	section: str | None = None
	page_number: int | None = None
	score: float
	snippet: str


class ValidationIssue(BaseModel):
	code: str
	message: str
	severity: Literal["error", "warning"]


class ValidationResult(BaseModel):
	passed: bool
	word_count: int
	target_words: tuple[int, int]
	issues: list[ValidationIssue] = Field(default_factory=list)


class WorkflowStep(BaseModel):
	name: str
	status: Literal["ok", "failed", "skipped"]
	duration_ms: int
	detail: str | None = None


class Usage(BaseModel):
	provider: str
	model: str
	llm_calls: int = 0
	input_tokens: int | None = None
	output_tokens: int | None = None
	estimated_cost_usd: float | None = None  # None = provider did not report enough to estimate


class KnowledgeBaseInfo(BaseModel):
	status: Literal["disabled", "used", "no_relevant_context", "unavailable"]
	retrieved: int = 0


class GenerationMetadata(BaseModel):
	request_id: str
	mode: Mode
	duration_ms: int
	knowledge_base: KnowledgeBaseInfo
	sources: list[SourceRef] = Field(default_factory=list)
	validation: ValidationResult
	workflow: list[WorkflowStep] = Field(default_factory=list)
	usage: Usage
	quota: dict[str, int] | None = None


class GenerateResponse(BaseModel):
	success: Literal[True] = True
	data: ScriptData
	metadata: GenerationMetadata


MAX_EMAIL_SCRIPT_CHARS = 60_000


class EmailSourceRef(BaseModel):
	id: str = Field(max_length=10)
	filename: str = Field(max_length=200)


class EmailScriptRequest(BaseModel):
	"""The dashboard sends back the script it is showing (scripts are not stored server-side)."""

	model_config = ConfigDict(extra="ignore")

	script: ScriptData
	platform: Platform | None = None
	sources: list[EmailSourceRef] = Field(default_factory=list, max_length=20)

	@field_validator("script")
	@classmethod
	def _bounded(cls, v: ScriptData) -> ScriptData:
		if len(v.title) + len(v.full_text()) > MAX_EMAIL_SCRIPT_CHARS:
			raise ValueError("script is too long to email")
		return v


class QueuedResponse(BaseModel):
	success: Literal[True] = True
	status: Literal["queued"] = "queued"
	request_id: str
	email: str
