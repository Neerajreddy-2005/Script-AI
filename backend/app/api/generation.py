from fastapi import APIRouter, BackgroundTasks, Depends, status

from app.core.auth import CurrentUser, get_current_user
from app.core.errors import AppError, BadRequestError, ServiceUnavailableError
from app.core.logging import request_id_var
from app.deps import get_event_publisher, get_generation_service
from app.schemas.generation import EmailScriptRequest, GenerateRequest, GenerateResponse, QueuedResponse, ScriptData
from app.services.events import EventPublisher
from app.services.generation import GenerationService

router = APIRouter(prefix="/api", tags=["generation"])


def _brief(req: GenerateRequest, background: bool) -> dict:
	return {"platform": req.platform, "tone": req.tone, "length": req.length, "mode": req.mode, "background": background}


def _email_payload(script: ScriptData, platform: str | None, sources: list[dict], **extra) -> dict:
	return {
		"title": script.title,
		"introduction": script.introduction.script,
		"mainContent": script.mainContent.script,
		"conclusion": script.conclusion.script,
		"platform": platform,
		"sources": sources,
		**extra,
	}


def _require_email_automation(user: CurrentUser, events: EventPublisher) -> str:
	if not events.enabled:
		raise ServiceUnavailableError("Email delivery is not set up (N8N_EVENTS_URL is empty).", "automations_not_configured")
	if not user.email:
		raise BadRequestError("Your account has no email address.", "no_email")
	return user.email


def _run(service: GenerationService, events: EventPublisher, user: CurrentUser, req: GenerateRequest,
		request_id: str, background: bool) -> GenerateResponse:
	try:
		response = service.generate(user, req, request_id)
	except AppError as exc:
		events.publish("generation.failed", user, {**_brief(req, background), "error_code": exc.code, "message": exc.message})
		raise
	meta = response.metadata
	events.publish("generation.succeeded", user, {
		**_brief(req, background),
		"title": response.data.title,
		"validation_passed": meta.validation.passed,
		"knowledge_base": meta.knowledge_base.status,
		"sources": len(meta.sources),
		"llm_calls": meta.usage.llm_calls,
		"duration_ms": meta.duration_ms,
	})
	return response


@router.post("/generate-script", response_model=GenerateResponse)
def generate_script(
	req: GenerateRequest,
	user: CurrentUser = Depends(get_current_user),
	service: GenerationService = Depends(get_generation_service),
	events: EventPublisher = Depends(get_event_publisher),
) -> GenerateResponse:
	"""Generate a script and wait for it. Same `success`/`data` shape as 1.0, plus `metadata`.
	Called through the n8n gateway workflow (or directly when n8n is not used)."""
	return _run(service, events, user, req, request_id_var.get(), background=False)


def _background_job(service, events, user, req, request_id) -> None:
	try:
		response = _run(service, events, user, req, request_id, background=True)
	except AppError:
		return  # generation.failed was published; n8n emails the user about the failure
	except Exception:  # never let a background task crash silently without telling the user
		events.publish("generation.failed", user, {**_brief(req, True), "error_code": "internal_error",
			"message": "Something went wrong. Please try again."})
		return
	sources = [{"id": s.id, "filename": s.filename} for s in response.metadata.sources]
	events.publish("script.email_requested", user, _email_payload(
		response.data, req.platform, sources, background=True,
		validation_passed=response.metadata.validation.passed,
	))


@router.post("/generate-script/background", response_model=QueuedResponse, status_code=status.HTTP_202_ACCEPTED)
def generate_script_in_background(
	req: GenerateRequest,
	background: BackgroundTasks,
	user: CurrentUser = Depends(get_current_user),
	service: GenerationService = Depends(get_generation_service),
	events: EventPublisher = Depends(get_event_publisher),
) -> QueuedResponse:
	"""Accept the brief, return immediately, generate in the background, and email the finished
	script (or the failure reason) to the user through n8n. The user can close the tab."""
	email = _require_email_automation(user, events)
	service.check_quota(user)  # fail fast instead of emailing a quota error later
	request_id = request_id_var.get()
	background.add_task(_background_job, service, events, user, req, request_id)
	return QueuedResponse(request_id=request_id, email=email)


@router.post("/scripts/email", response_model=QueuedResponse, status_code=status.HTTP_202_ACCEPTED)
def email_script(
	req: EmailScriptRequest,
	user: CurrentUser = Depends(get_current_user),
	events: EventPublisher = Depends(get_event_publisher),
) -> QueuedResponse:
	"""Email the script currently shown in the dashboard to the signed-in user's own address."""
	email = _require_email_automation(user, events)
	events.publish("script.email_requested", user, _email_payload(
		req.script, req.platform, [s.model_dump() for s in req.sources], background=False,
	))
	return QueuedResponse(request_id=request_id_var.get(), email=email)
