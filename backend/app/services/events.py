"""Outbound automation events for n8n (emails, notifications, scheduling...).

FastAPI posts a small JSON event to N8N_EVENTS_URL after important actions. Delivery is
fire-and-forget on a background thread: n8n being slow or offline never delays or fails a
user request.

Events carry IDs, titles, and statuses; `script.email_requested` also carries the script itself,
because emailing it to the user is the point. Uploaded document text is never sent.

Payload:
    {"event": "generation.succeeded", "occurred_at": "...", "request_id": "...",
     "user": {"id": "...", "email": "..."}, "data": {...}}
"""

import logging
import threading
from datetime import datetime, timezone
from typing import Any, Protocol

import httpx

from app.core.auth import CurrentUser
from app.core.logging import log_event, request_id_var

logger = logging.getLogger("scriptai.events")

EVENT_TYPES = {
	"generation.succeeded",
	"generation.failed",
	"script.email_requested",  # n8n emails the script to user.email
	"document.ingested",
	"document.deleted",
}


class EventPublisher(Protocol):
	enabled: bool

	def publish(self, event: str, user: CurrentUser, data: dict[str, Any]) -> None: ...


def build_event(event: str, user: CurrentUser, data: dict[str, Any]) -> dict[str, Any]:
	if event not in EVENT_TYPES:
		raise ValueError(f"unknown event type: {event}")
	return {
		"event": event,
		"occurred_at": datetime.now(timezone.utc).isoformat(timespec="seconds"),
		"request_id": request_id_var.get(),
		"user": {"id": user.id, "email": user.email},
		"data": data,
	}


class NullPublisher:
	"""Used when N8N_EVENTS_URL is empty."""

	enabled = False

	def publish(self, event: str, user: CurrentUser, data: dict[str, Any]) -> None:
		return None


class N8nWebhookPublisher:
	enabled = True

	def __init__(self, url: str, secret: str = "", timeout: float = 5.0, client: httpx.Client | None = None):
		self.url = url
		self.secret = secret
		self.timeout = timeout
		self.client = client or httpx.Client()

	def publish(self, event: str, user: CurrentUser, data: dict[str, Any]) -> None:
		payload = build_event(event, user, data)
		threading.Thread(target=self._send, args=(payload,), daemon=True).start()

	def _send(self, payload: dict[str, Any]) -> None:
		headers = {"Content-Type": "application/json"}
		if self.secret:
			headers["X-ScriptAI-Secret"] = self.secret
		try:
			response = self.client.post(self.url, json=payload, headers=headers, timeout=self.timeout)
			if response.status_code >= 300:
				log_event(logger, "event_rejected", logging.WARNING, event=payload["event"], status=response.status_code)
		except httpx.HTTPError as exc:
			log_event(logger, "event_delivery_failed", logging.WARNING, event=payload["event"], error=type(exc).__name__)
