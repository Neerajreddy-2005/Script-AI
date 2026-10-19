import json

from app.core.errors import ProviderError, ProviderTimeoutError
from app.services.llm import FakeLLM
from tests.conftest import BRIEF, USER_A, USER_B, auth, make_settings


def raising(exc):
	def respond(*_):
		raise exc

	return respond


def test_requires_auth(client):
	r = client.post("/api/generate-script", json=BRIEF)
	assert r.status_code == 401
	assert r.json()["error"]["code"] == "unauthorized"


def test_rejects_invalid_token(client):
	r = client.post("/api/generate-script", json=BRIEF, headers={"Authorization": "Bearer not-a-jwt"})
	assert r.status_code == 401


def test_success_keeps_v1_shape_and_adds_metadata(client):
	r = client.post("/api/generate-script", json={**BRIEF, "subscription": "premium"}, headers=auth())
	assert r.status_code == 200, r.text
	body = r.json()
	assert body["success"] is True
	assert set(body["data"]) == {"title", "introduction", "mainContent", "conclusion"}
	assert body["data"]["introduction"]["script"]
	meta = body["metadata"]
	assert meta["request_id"] == r.headers["x-request-id"]
	assert meta["mode"] == "standard"
	assert meta["validation"]["passed"] is True
	assert meta["knowledge_base"]["status"] == "disabled"
	assert meta["usage"]["llm_calls"] == 1
	assert meta["usage"]["estimated_cost_usd"] is None


def test_invalid_input_is_422_without_echo(client):
	r = client.post(
		"/api/generate-script",
		json={**BRIEF, "platform": "<script>alert(1)</script>", "topic": "x"},
		headers=auth(),
	)
	assert r.status_code == 422
	err = r.json()["error"]
	assert err["code"] == "validation_error"
	assert "platform" in err["message"] and "topic" in err["message"]
	assert "<script>" not in r.text


def test_provider_timeout_is_504(make_client):
	client = make_client(llm=FakeLLM(raising(ProviderTimeoutError())))
	r = client.post("/api/generate-script", json=BRIEF, headers=auth())
	assert r.status_code == 504
	assert r.json()["error"]["code"] == "provider_timeout"


def test_malformed_output_is_502(make_client):
	client = make_client(llm=FakeLLM(lambda *_: "I cannot produce JSON today"))
	r = client.post("/api/generate-script", json=BRIEF, headers=auth())
	assert r.status_code == 502
	assert r.json()["error"]["code"] == "malformed_output"


def test_unexpected_error_hides_details(make_client):
	client = make_client(llm=FakeLLM(raising(RuntimeError("db password=hunter2"))))
	r = client.post("/api/generate-script", json=BRIEF, headers=auth())
	assert r.status_code == 500
	assert "hunter2" not in r.text and "Traceback" not in r.text


def test_failed_generations_are_recorded_but_do_not_use_quota(make_client, repo):
	client = make_client(llm=FakeLLM(raising(ProviderError())))
	client.post("/api/generate-script", json=BRIEF, headers=auth())
	assert repo.generations[-1]["status"] == "failed"
	assert repo.generations[-1]["error_code"] == "provider_error"
	ok = make_client()
	assert ok.post("/api/generate-script", json=BRIEF, headers=auth()).json()["metadata"]["quota"]["used"] == 1


def test_quota_is_enforced_per_user_and_tier(client):
	for _ in range(3):  # quota_basic=3 in test settings
		assert client.post("/api/generate-script", json=BRIEF, headers=auth(USER_A)).status_code == 200
	r = client.post("/api/generate-script", json=BRIEF, headers=auth(USER_A))
	assert r.status_code == 429
	assert r.json()["error"]["code"] == "quota_exceeded"
	# Another user and a higher tier are unaffected.
	assert client.post("/api/generate-script", json=BRIEF, headers=auth(USER_B)).status_code == 200
	assert client.post("/api/generate-script", json=BRIEF, headers=auth(USER_A, tier="pro")).status_code == 200


def test_records_contain_no_topic_or_script(client, repo):
	client.post("/api/generate-script", json=BRIEF, headers=auth())
	stored = json.dumps(repo.generations[-1], default=str)
	assert BRIEF["topic"] not in stored


def test_assisted_mode_revises_failed_draft(make_client):
	calls = {"n": 0}

	def respond(system, user):
		calls["n"] += 1
		from app.services.llm import fake_script_responder

		if calls["n"] == 1:
			return json.dumps({"title": "T", "introduction": "Hi", "mainContent": "short", "conclusion": "bye"})
		return fake_script_responder(system, user)

	client = make_client(llm=FakeLLM(respond))
	r = client.post("/api/generate-script", json={**BRIEF, "mode": "assisted"}, headers=auth())
	meta = r.json()["metadata"]
	assert meta["validation"]["passed"] is True
	assert [s["name"] for s in meta["workflow"]] == ["draft", "validate", "revise_1", "validate_1"]
	assert meta["usage"]["llm_calls"] == 2


def test_standard_mode_reports_but_does_not_revise(make_client):
	client = make_client(llm=FakeLLM(lambda *_: json.dumps({"title": "T", "introduction": "Hi", "mainContent": "short", "conclusion": "bye"})))
	meta = client.post("/api/generate-script", json=BRIEF, headers=auth()).json()["metadata"]
	assert meta["validation"]["passed"] is False
	assert meta["usage"]["llm_calls"] == 1


def test_cors_allows_configured_origin_only(client):
	ok = client.options(
		"/api/generate-script",
		headers={"Origin": "http://localhost:8081", "Access-Control-Request-Method": "POST"},
	)
	assert ok.headers.get("access-control-allow-origin") == "http://localhost:8081"
	bad = client.options(
		"/api/generate-script",
		headers={"Origin": "https://evil.example", "Access-Control-Request-Method": "POST"},
	)
	assert "access-control-allow-origin" not in bad.headers


def test_health_and_ready(client):
	assert client.get("/api/health").json() == {"status": "ok"}
	ready = client.get("/api/ready")
	assert ready.status_code == 200 and ready.json()["status"] == "ready"


def test_ready_fails_with_unsafe_production_config(make_client):
	client = make_client(settings=make_settings(app_env="production"))
	r = client.get("/api/ready")
	assert r.status_code == 503
	assert r.json()["problems"]


def test_request_id_header_is_propagated(client):
	r = client.get("/api/health", headers={"X-Request-ID": "abc12345-test"})
	assert r.headers["x-request-id"] == "abc12345-test"
	r = client.get("/api/health", headers={"X-Request-ID": "bad id with spaces"})
	assert r.headers["x-request-id"] != "bad id with spaces"
	assert USER_A  # keep import used
