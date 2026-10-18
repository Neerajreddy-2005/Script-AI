from fastapi import APIRouter, Depends
from fastapi.responses import JSONResponse

from app.core.config import Settings, get_settings
from app.deps import get_repository
from app.repositories.base import Repository

router = APIRouter(prefix="/api", tags=["health"])


@router.get("/health")
def health() -> dict:
	"""Liveness: the process is up. Never touches dependencies."""
	return {"status": "ok"}


@router.get("/ready")
def ready(settings: Settings = Depends(get_settings), repo: Repository = Depends(get_repository)):
	"""Readiness: configuration is complete and the database answers. Does not call paid APIs."""
	checks: dict[str, str] = {}
	try:
		repo.ping()
		checks["database"] = "ok" if settings.database_url else "ok (in-memory)"
	except Exception:
		checks["database"] = "unavailable"
	checks["llm"] = "ok" if settings.llm_provider == "fake" or settings.llm_model else "not configured"
	checks["embeddings"] = (
		"ok" if settings.embedding_provider in ("fake", "local") or (settings.embedding_model and settings.embedding_base_url)
		else "not configured"
	)
	checks["auth"] = (
		"disabled" if settings.auth_disabled
		else "ok" if settings.supabase_jwt_secret or settings.supabase_url
		else "not configured"
	)
	problems = settings.production_problems() if settings.app_env == "production" else []
	is_ready = all(v.startswith("ok") or v == "disabled" for v in checks.values()) and not problems
	# Informational only: the app works without n8n, but email features need it.
	checks["n8n_automations"] = "ok" if settings.n8n_events_url and settings.n8n_shared_secret else "disabled"
	body = {"status": "ready" if is_ready else "not_ready", "checks": checks, "problems": problems}
	return JSONResponse(body, status_code=200 if is_ready else 503)
