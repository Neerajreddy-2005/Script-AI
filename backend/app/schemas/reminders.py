from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator

ReminderStatus = Literal["pending", "processing", "sent", "failed", "cancelled"]


class Reminder(BaseModel):
	id: str
	owner_id: str
	email: str
	title: str
	note: str | None = None
	remind_at: datetime
	status: ReminderStatus
	attempts: int = 0
	claimed_at: datetime | None = None
	sent_at: datetime | None = None
	last_error: str | None = None
	created_at: datetime
	updated_at: datetime


class ReminderOut(BaseModel):
	id: str
	title: str
	note: str | None
	remind_at: datetime
	status: ReminderStatus
	sent_at: datetime | None
	created_at: datetime

	@classmethod
	def from_reminder(cls, r: Reminder) -> "ReminderOut":
		return cls(**r.model_dump(include=set(cls.model_fields)))


class CreateReminderRequest(BaseModel):
	model_config = ConfigDict(str_strip_whitespace=True, extra="forbid")

	title: str = Field(min_length=1, max_length=200)
	note: str | None = Field(default=None, max_length=2000)
	# Must include a timezone, e.g. "2026-10-20T09:00:00+05:30" or "...Z".
	remind_at: datetime

	@field_validator("remind_at")
	@classmethod
	def _aware(cls, v: datetime) -> datetime:
		if v.tzinfo is None:
			raise ValueError("remind_at must include a timezone offset")
		return v

	@field_validator("note")
	@classmethod
	def _empty_to_none(cls, v: str | None) -> str | None:
		return v or None


class ReminderResponse(BaseModel):
	success: Literal[True] = True
	reminder: ReminderOut


class ReminderListResponse(BaseModel):
	success: Literal[True] = True
	reminders: list[ReminderOut]


# --- n8n-facing (internal) ----------------------------------------------------


class DueReminder(BaseModel):
	id: str
	email: str
	title: str
	note: str | None
	remind_at: datetime
	attempts: int


class ClaimResponse(BaseModel):
	success: Literal[True] = True
	reminders: list[DueReminder]


class CompleteReminderRequest(BaseModel):
	success: bool
	error: str | None = Field(default=None, max_length=500)
