import json
import threading

import httpx

from app.core.auth import CurrentUser
from app.core.errors import ProviderError
from app.services.events import N8nWebhookPublisher, build_event
from app.services.llm import FakeLLM
from tests.conftest import BRIEF, USER_A, auth

USER = CurrentUser(id=USER_A, email="a@example.com")


def test_generation_success_and_failure_events(make_client, events):
	client = make_client()
	client.post("/api/generate-script", json=BRIEF, headers=auth())
	name, user_id, data = events.events[-1]
	assert (name, user_id) == ("generation.succeeded", USER_A)
	assert data["platform"] == "YouTube" and data["validation_passed"] is True and data["title"]

	def boom(*_):
		raise ProviderError()

	make_client(llm=FakeLLM(boom)).post("/api/generate-script", json=BRIEF, headers=auth())
	assert events.events[-1][0] == "generation.failed"
	assert events.events[-1][2]["error_code"] == "provider_error"


def test_invalid_request_publishes_nothing(client, events):
	client.post("/api/generate-script", json={"topic": "x"}, headers=auth())
	assert events.events == []


def test_document_events(client, events):
	files = {"file": ("brew.md", b"# Brew\nCold brew steeps 18 hours.", "text/markdown")}
	doc_id = client.post("/api/knowledge/documents", files=files, headers=auth()).json()["document"]["id"]
	client.post("/api/knowledge/documents", files=files, headers=auth())  # duplicate: no second event
	client.delete(f"/api/knowledge/documents/{doc_id}", headers=auth())
	assert events.names() == ["document.ingested", "document.deleted"]
	assert events.events[0][2]["filename"] == "brew.md"


def test_events_carry_no_document_text(client, events):
	files = {"file": ("secret.md", b"Top secret launch plan for Brewly nitro.", "text/markdown")}
	client.post("/api/knowledge/documents", files=files, headers=auth())
	assert "launch plan" not in json.dumps(events.events)


def test_webhook_publisher_sends_secret_and_survives_failures():
	received = []
	done = threading.Event()

	def handler(request: httpx.Request):
		received.append((request.headers.get("x-scriptai-secret"), json.loads(request.content)))
		done.set()
		return httpx.Response(200)

	publisher = N8nWebhookPublisher("http://n8n.test/webhook/scriptai-events", "s3cret",
		client=httpx.Client(transport=httpx.MockTransport(handler)))
	publisher.publish("document.deleted", USER, {"document_id": "d1"})
	assert done.wait(5)
	secret, body = received[0]
	assert secret == "s3cret"
	assert body["event"] == "document.deleted" and body["user"]["email"] == "a@example.com"

	def offline(request):
		raise httpx.ConnectError("n8n is down", request=request)

	failing = N8nWebhookPublisher("http://n8n.test/x", client=httpx.Client(transport=httpx.MockTransport(offline)))
	failing._send(build_event("document.deleted", USER, {}))  # must not raise


def test_unknown_event_type_is_rejected():
	import pytest

	with pytest.raises(ValueError):
		build_event("something.else", USER, {})
