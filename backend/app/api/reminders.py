from uuid import UUID

from fastapi import APIRouter, Depends, Query, status

from app.core.auth import CurrentUser, get_current_user, require_n8n
from app.deps import get_email_limiter, get_reminder_service
from app.schemas.reminders import (
	ClaimResponse,
	CompleteReminderRequest,
	CreateReminderRequest,
	DueReminder,
	ReminderListResponse,
	ReminderOut,
	ReminderResponse,
)
from app.services.email_limit import EmailRateLimiter
from app.services.reminders import ReminderService

router = APIRouter(prefix="/api/reminders", tags=["reminders"])
internal = APIRouter(prefix="/api/internal/reminders", tags=["internal (n8n only)"], dependencies=[Depends(require_n8n)])


@router.post("", response_model=ReminderResponse, status_code=status.HTTP_201_CREATED)
def create_reminder(
	req: CreateReminderRequest,
	user: CurrentUser = Depends(get_current_user),
	service: ReminderService = Depends(get_reminder_service),
	limiter: EmailRateLimiter = Depends(get_email_limiter),
) -> ReminderResponse:
	"""Schedule an email reminder to the signed-in user's own address."""
	limiter.consume(user.id)  # each reminder becomes one email
	return ReminderResponse(reminder=ReminderOut.from_reminder(service.create(user, req)))


@router.get("", response_model=ReminderListResponse)
def list_reminders(
	user: CurrentUser = Depends(get_current_user),
	service: ReminderService = Depends(get_reminder_service),
) -> ReminderListResponse:
	return ReminderListResponse(reminders=[ReminderOut.from_reminder(r) for r in service.list_for(user)])


@router.delete("/{reminder_id}", status_code=status.HTTP_204_NO_CONTENT)
def cancel_reminder(
	reminder_id: UUID,
	user: CurrentUser = Depends(get_current_user),
	service: ReminderService = Depends(get_reminder_service),
) -> None:
	service.cancel(user, str(reminder_id))


@internal.post("/claim", response_model=ClaimResponse)
def claim_due_reminders(
	limit: int = Query(default=20, ge=1, le=100),
	service: ReminderService = Depends(get_reminder_service),
) -> ClaimResponse:
	"""Called by the n8n Reminders workflow on a schedule: returns due reminders and marks them
	as being delivered, so overlapping runs never send the same reminder twice."""
	return ClaimResponse(reminders=[DueReminder(**r.model_dump(include=set(DueReminder.model_fields))) for r in service.claim_due(limit)])


@internal.post("/{reminder_id}/complete", response_model=ReminderResponse)
def complete_reminder(
	reminder_id: UUID,
	req: CompleteReminderRequest,
	service: ReminderService = Depends(get_reminder_service),
) -> ReminderResponse:
	"""n8n reports whether the email was sent. Failures are retried up to 3 times."""
	return ReminderResponse(reminder=ReminderOut.from_reminder(service.complete(str(reminder_id), req.success, req.error)))
