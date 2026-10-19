"""Email reminders.

Users create reminders through the API. The n8n "Script-AI Reminders" workflow runs on a
schedule, claims due reminders through the internal endpoints, sends the emails with its
SMTP/Gmail node, and reports each result back. Emails always go to the address on the
user's verified login, so this can't be used to send mail to arbitrary people.
"""

import logging
import uuid
from datetime import datetime, timedelta, timezone

from app.core.auth import CurrentUser
from app.core.config import Settings
from app.core.errors import BadRequestError, NotFoundError
from app.core.logging import log_event
from app.repositories.base import Repository
from app.schemas.reminders import CreateReminderRequest, Reminder

logger = logging.getLogger("scriptai.reminders")

MAX_ATTEMPTS = 3
STALE_AFTER = timedelta(minutes=15)  # a claimed reminder not completed by then is retried
MIN_LEAD = timedelta(minutes=1)
MAX_LEAD = timedelta(days=366)


class ReminderService:
	def __init__(self, repo: Repository, settings: Settings):
		self.repo = repo
		self.settings = settings

	def create(self, user: CurrentUser, req: CreateReminderRequest) -> Reminder:
		if not user.email:
			raise BadRequestError("Your account has no email address for reminders.", "no_email")
		now = datetime.now(timezone.utc)
		if req.remind_at < now + MIN_LEAD:
			raise BadRequestError("Pick a reminder time at least 1 minute in the future.", "reminder_in_past")
		if req.remind_at > now + MAX_LEAD:
			raise BadRequestError("Reminders can be at most one year ahead.", "reminder_too_far")
		if self.repo.count_pending_reminders(user.id) >= self.settings.max_pending_reminders_per_user:
			raise BadRequestError(
				f"You can have at most {self.settings.max_pending_reminders_per_user} upcoming reminders.",
				"reminder_limit_reached",
			)
		reminder = self.repo.create_reminder(
			Reminder(
				id=str(uuid.uuid4()),
				owner_id=user.id,
				email=user.email,
				title=req.title,
				note=req.note,
				remind_at=req.remind_at.astimezone(timezone.utc),
				status="pending",
				created_at=now,
				updated_at=now,
			)
		)
		log_event(logger, "reminder_created", reminder_id=reminder.id, remind_at=reminder.remind_at.isoformat())
		return reminder

	def list_for(self, user: CurrentUser) -> list[Reminder]:
		return self.repo.list_reminders(user.id)

	def cancel(self, user: CurrentUser, reminder_id: str) -> None:
		if not self.repo.cancel_reminder(user.id, reminder_id):
			raise NotFoundError("No upcoming reminder with that ID.")

	# --- called by n8n -----------------------------------------------------

	def claim_due(self, limit: int = 20) -> list[Reminder]:
		now = datetime.now(timezone.utc)
		claimed = self.repo.claim_due_reminders(now, limit, now - STALE_AFTER, MAX_ATTEMPTS)
		if claimed:
			log_event(logger, "reminders_claimed", count=len(claimed))
		return claimed

	def complete(self, reminder_id: str, success: bool, error: str | None) -> Reminder:
		reminder = self.repo.complete_reminder(reminder_id, success, error, MAX_ATTEMPTS)
		if not reminder:
			raise NotFoundError("Reminder is not awaiting delivery.")
		log_event(logger, "reminder_completed", reminder_id=reminder_id, status=reminder.status)
		return reminder
