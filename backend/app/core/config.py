from functools import lru_cache
from typing import Literal

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
	"""All runtime configuration. Values come from environment variables or backend/.env."""

	model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore", env_ignore_empty=True)

	app_env: Literal["development", "test", "staging", "production"] = "development"
	log_level: str = "INFO"
	frontend_origins: str = "http://localhost:8081"

	# --- LLM ---------------------------------------------------------------
	# "openai_compatible" covers OpenAI, Groq, OpenRouter, Gemini (OpenAI endpoint),
	# DeepSeek, Together, Ollama, LM Studio... "anthropic" uses the Messages API.
	llm_provider: Literal["openai_compatible", "anthropic", "fake"] = "fake"
	llm_base_url: str = "https://api.openai.com/v1"
	llm_api_key: str = ""
	llm_model: str = ""
	llm_temperature: float = 0.7
	# Upper bound; each request asks only for what its target length needs.
	llm_max_output_tokens: int = 8192
	llm_timeout_seconds: float = 60.0
	llm_max_retries: int = 2
	# Send response_format={"type":"json_object"}; disable for providers that reject it.
	llm_json_mode: bool = True
	# Optional, for cost estimates. Leave empty if unknown -> cost reported as unavailable.
	llm_input_cost_per_mtok: float | None = None
	llm_output_cost_per_mtok: float | None = None

	# --- Embeddings --------------------------------------------------------
	embedding_provider: Literal["openai_compatible", "local", "fake"] = "fake"
	embedding_base_url: str = ""
	embedding_api_key: str = ""
	embedding_model: str = ""
	# Must equal the vector(N) size in migrations/001_init.sql.
	embedding_dim: int = 768
	# Send "dimensions": embedding_dim in the request (for models that support truncation).
	embedding_send_dimensions: bool = False
	embedding_batch_size: int = 32
	embedding_timeout_seconds: float = 30.0

	# --- Storage -----------------------------------------------------------
	# Postgres connection string (Supabase: Project Settings -> Database). Empty = in-memory store.
	database_url: str = ""

	# --- Auth (Supabase) ---------------------------------------------------
	auth_disabled: bool = False
	supabase_url: str = ""
	# Legacy HS256 secret. If empty, tokens are verified with the project's JWKS (asymmetric keys).
	supabase_jwt_secret: str = ""
	supabase_jwt_audience: str = "authenticated"

	# --- RAG ---------------------------------------------------------------
	max_upload_size_mb: float = 5.0
	max_documents_per_user: int = 50
	chunk_size: int = 1200
	chunk_overlap: int = 200
	rag_top_k: int = 5
	rag_min_similarity: float = 0.25

	# --- n8n automation ----------------------------------------------------
	# n8n webhook that receives events (emails, generation results...). Empty = automations off.
	n8n_events_url: str = ""
	# One shared secret for both directions, sent as X-ScriptAI-Secret:
	# FastAPI -> n8n events, and n8n -> FastAPI internal endpoints (reminder delivery).
	n8n_shared_secret: str = ""

	# --- Reminders ---------------------------------------------------------
	max_pending_reminders_per_user: int = 50
	# Emails + new reminders per user per hour; protects the shared SMTP account's daily cap.
	max_emails_per_user_per_hour: int = 20

	# --- Agent & quotas ----------------------------------------------------
	max_agent_steps: int = 8
	max_agent_revisions: int = 2
	quota_basic: int = 10
	quota_pro: int = 50
	quota_premium: int = 200

	@field_validator("chunk_overlap")
	@classmethod
	def _overlap_smaller_than_chunk(cls, v: int, info) -> int:
		size = info.data.get("chunk_size", 1200)
		if v >= size:
			raise ValueError("CHUNK_OVERLAP must be smaller than CHUNK_SIZE")
		return v

	@property
	def cors_origins(self) -> list[str]:
		return [o.strip() for o in self.frontend_origins.split(",") if o.strip()]

	@property
	def max_upload_bytes(self) -> int:
		return int(self.max_upload_size_mb * 1024 * 1024)

	def quota_for(self, tier: str) -> int:
		return {"pro": self.quota_pro, "premium": self.quota_premium}.get(tier, self.quota_basic)

	def production_problems(self) -> list[str]:
		"""Settings that are unsafe outside local development."""
		problems = []
		if self.auth_disabled:
			problems.append("AUTH_DISABLED must be false")
		if not self.database_url:
			problems.append("DATABASE_URL is required")
		if self.llm_provider == "fake":
			problems.append("LLM_PROVIDER cannot be 'fake'")
		if self.embedding_provider == "fake":
			problems.append("EMBEDDING_PROVIDER cannot be 'fake'")
		if "*" in self.cors_origins:
			problems.append("FRONTEND_ORIGINS cannot contain '*'")
		if self.n8n_events_url and len(self.n8n_shared_secret) < 16:
			problems.append("N8N_SHARED_SECRET must be a random string of at least 16 characters")
		return problems


@lru_cache
def get_settings() -> Settings:
	return Settings()
