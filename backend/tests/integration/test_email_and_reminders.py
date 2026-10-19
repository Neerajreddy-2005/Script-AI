from datetime import datetime, timedelta, timezone

from app.core.errors import ProviderTimeoutError
from app.deps import get_event_publisher
from app.services.events import NullPublisher
from app.services.llm import FakeLLM
from tests.conftest import BRIEF, N8N_SECRET, USER_A, USER_B, auth, make_settings

N8N = {"X-ScriptAI-Secret": N8N_SECRET}

SCRIPT = {
	"title": "Cold brew 101",
	"introduction": {"script": "Hi!"},
	"mainContent": {"script": "Steep 18 hours [S1]."},
	"conclusion": {"script": "Bye."},
}


def in_minutes(m: int) -> str:
	return (datetime.now(timezone.utc) + timedelta(minutes=m)).isoformat()


def make_due(repo, reminder_id: str) -> None:
	"""Move a reminder into the past (the API itself refuses past times)."""
	r = repo.reminders[reminder_id]
	repo.reminders[reminder_id] = r.model_copy(update={"remind_at": datetime.now(timezone.utc) - timedelta(seconds=1)})


def create(client, title="Post the video", minutes=60, user=USER_A):
	r = client.post("/api/reminders", json={"title": title, "remind_at": in_minutes(minutes)}, headers=auth(user))
	assert r.status_code == 201, r.text
	return r.json()["reminder"]["id"]


# --- email the current script ------------------------------------------------------


def test_email_script_publishes_event_to_own_address(client, events):
	body = {"script": SCRIPT, "platform": "YouTube", "sources": [{"id": "S1", "filename": "brew.md"}]}
	r = client.post("/api/scripts/email", json=body, headers=auth())
	assert r.status_code == 202, r.text
	assert r.json()["email"] == "1111@example.com"
	name, user_id, data = events.events[-1]
	assert (name, user_id) == ("script.email_requested", USER_A)
	assert data["title"] == "Cold brew 101" and data["mainContent"] == "Steep 18 hours [S1]."
	assert data["sources"] == [{"id": "S1", "filename": "brew.md"}]
	assert data["background"] is False


def test_email_requires_login_and_bounded_size(client):
	assert client.post("/api/scripts/email", json={"script": SCRIPT}).status_code == 401
	huge = {**SCRIPT, "mainContent": {"script": "x" * 70_000}}
	assert client.post("/api/scripts/email", json={"script": huge}, headers=auth()).status_code == 422


def test_email_unavailable_without_n8n(make_client):
	client = make_client()
	client.app.dependency_overrides[get_event_publisher] = NullPublisher
	r = client.post("/api/scripts/email", json={"script": SCRIPT}, headers=auth())
	assert r.status_code == 503
	assert r.json()["error"]["code"] == "automations_not_configured"


# --- background generation ---------------------------------------------------------


def test_background_generation_emails_the_result(client, events):
	r = client.post("/api/generate-script/background", json=BRIEF, headers=auth())
	assert r.status_code == 202, r.text
	assert r.json()["status"] == "queued"
	# TestClient runs background tasks before returning the response.
	assert events.names()[-2:] == ["generation.succeeded", "script.email_requested"]
	data = events.events[-1][2]
	assert data["background"] is True and data["introduction"] and data["platform"] == "YouTube"


def test_background_failure_is_reported_for_email(make_client, events):
	def slow(*_):
		raise ProviderTimeoutError()

	client = make_client(llm=FakeLLM(slow))
	assert client.post("/api/generate-script/background", json=BRIEF, headers=auth()).status_code == 202
	name, _, data = events.events[-1]
	assert name == "generation.failed"
	assert data["background"] is True and data["error_code"] == "provider_timeout"
	assert "too long" in data["message"]


def test_background_checks_quota_before_queueing(client):
	for _ in range(3):  # quota_basic=3 in tests
		client.post("/api/generate-script", json=BRIEF, headers=auth())
	assert client.post("/api/generate-script/background", json=BRIEF, headers=auth()).status_code == 429


# --- reminders ---------------------------------------------------------------------


def test_create_list_cancel_reminder(client):
	r = client.post(
		"/api/reminders",
		json={"title": "Post the cold brew video", "note": "Use the B-roll", "remind_at": in_minutes(60)},
		headers=auth(),
	)
	assert r.status_code == 201, r.text
	rid = r.json()["reminder"]["id"]
	assert r.json()["reminder"]["status"] == "pending"
	listed = client.get("/api/reminders", headers=auth()).json()["reminders"]
	assert [x["id"] for x in listed] == [rid]
	assert "email" not in listed[0]
	assert client.delete(f"/api/reminders/{rid}", headers=auth()).status_code == 204
	assert client.get("/api/reminders", headers=auth()).json()["reminders"] == []
	assert client.delete(f"/api/reminders/{rid}", headers=auth()).status_code == 404


def test_reminder_validation(client):
	def code(body):
		return client.post("/api/reminders", json=body, headers=auth())

	assert code({"title": "x", "remind_at": in_minutes(-5)}).json()["error"]["code"] == "reminder_in_past"
	assert code({"title": "x", "remind_at": in_minutes(60 * 24 * 400)}).json()["error"]["code"] == "reminder_too_far"
	naive = (datetime.now() + timedelta(hours=1)).isoformat()
	assert code({"title": "x", "remind_at": naive}).status_code == 422
	assert code({"title": "", "remind_at": in_minutes(60)}).status_code == 422
	# The recipient can't be chosen by the client: always the signed-in user's email.
	assert code({"title": "x", "remind_at": in_minutes(60), "email": "victim@example.com"}).status_code == 422


def test_reminders_are_private(client):
	rid = create(client, user=USER_A)
	assert client.get("/api/reminders", headers=auth(USER_B)).json()["reminders"] == []
	assert client.delete(f"/api/reminders/{rid}", headers=auth(USER_B)).status_code == 404


def test_n8n_claims_due_reminders_once_and_completes_them(client, repo):
	rid = create(client, title="Film it", minutes=5)
	assert client.post("/api/internal/reminders/claim", headers=N8N).json()["reminders"] == []  # not due yet
	make_due(repo, rid)
	claimed = client.post("/api/internal/reminders/claim", headers=N8N).json()["reminders"]
	assert [c["id"] for c in claimed] == [rid]
	assert claimed[0]["email"] == "1111@example.com" and claimed[0]["title"] == "Film it"
	# An overlapping n8n run gets nothing, so the email is never sent twice.
	assert client.post("/api/internal/reminders/claim", headers=N8N).json()["reminders"] == []
	done = client.post(f"/api/internal/reminders/{rid}/complete", json={"success": True}, headers=N8N)
	assert done.status_code == 200 and done.json()["reminder"]["status"] == "sent"
	again = client.post(f"/api/internal/reminders/{rid}/complete", json={"success": True}, headers=N8N)
	assert again.status_code == 404


def test_failed_delivery_is_retried_then_marked_failed(client, repo):
	rid = create(client, title="Retry me", minutes=5)
	for attempt in range(1, 4):
		make_due(repo, rid)
		assert len(client.post("/api/internal/reminders/claim", headers=N8N).json()["reminders"]) == 1
		result = client.post(
			f"/api/internal/reminders/{rid}/complete", json={"success": False, "error": "SMTP down"}, headers=N8N
		)
		assert result.json()["reminder"]["status"] == ("failed" if attempt == 3 else "pending")
	assert repo.reminders[rid].last_error == "SMTP down"


def test_cancelled_reminders_are_never_claimed(client, repo):
	rid = create(client, minutes=5)
	client.delete(f"/api/reminders/{rid}", headers=auth())
	make_due(repo, rid)
	assert client.post("/api/internal/reminders/claim", headers=N8N).json()["reminders"] == []


def test_internal_endpoints_require_n8n_secret(client):
	assert client.post("/api/internal/reminders/claim").status_code == 401
	assert client.post("/api/internal/reminders/claim", headers={"X-ScriptAI-Secret": "wrong"}).status_code == 401
	# A normal user login is not enough.
	assert client.post("/api/internal/reminders/claim", headers=auth()).status_code == 401


def test_internal_endpoints_disabled_without_secret(make_client):
	client = make_client(settings=make_settings(n8n_shared_secret=""))
	assert client.post("/api/internal/reminders/claim", headers=N8N).status_code == 503


def test_pending_reminder_limit(make_client):
	client = make_client(settings=make_settings(max_pending_reminders_per_user=1))
	create(client, title="a", minutes=10)
	r = client.post("/api/reminders", json={"title": "b", "remind_at": in_minutes(10)}, headers=auth())
	assert r.status_code == 400 and r.json()["error"]["code"] == "reminder_limit_reached"
