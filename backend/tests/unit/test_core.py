import json
import logging

import httpx
import pytest

from app.core.auth import DEV_USER_ID, decode_token, user_from_claims
from app.core.errors import AuthError, ProviderError, ProviderTimeoutError
from app.core.logging import REDACTED, JsonFormatter, redact
from app.services.embeddings import HashEmbedder, OpenAICompatibleEmbedder, cosine
from app.services.llm import AnthropicLLM, OpenAICompatibleLLM, estimate_cost
from tests.conftest import USER_A, make_settings, make_token


class TestAuth:
	def test_valid_token(self):
		claims = decode_token(make_token(USER_A, tier="pro"), make_settings())
		user = user_from_claims(claims)
		assert user.id == USER_A and user.tier == "pro"

	def test_unknown_tier_defaults_to_basic(self):
		assert user_from_claims({"sub": USER_A, "app_metadata": {"subscription": "god-mode"}}).tier == "basic"

	def test_user_metadata_cannot_grant_tier(self):
		claims = {"sub": USER_A, "user_metadata": {"subscription": "premium"}}
		assert user_from_claims(claims).tier == "basic"

	def test_expired_token(self):
		with pytest.raises(AuthError) as exc:
			decode_token(make_token(USER_A, exp_in=-10), make_settings())
		assert exc.value.code == "token_expired"

	def test_wrong_secret(self):
		with pytest.raises(AuthError):
			decode_token(make_token(USER_A, secret="x" * 40), make_settings())

	def test_wrong_audience(self):
		with pytest.raises(AuthError):
			decode_token(make_token(USER_A, aud="anon"), make_settings())

	def test_dev_user_is_a_uuid(self):
		import uuid

		uuid.UUID(DEV_USER_ID)


class TestRedaction:
	def test_redacts_sensitive_keys_and_patterns(self):
		data = {
			"api_key": "abc",
			"nested": {"Authorization": "Bearer xyz"},
			"msg": "calling with sk-abcdefghijklmnop and postgresql://u:p@host/db",
			"ok": "fine",
		}
		out = redact(data)
		assert out["api_key"] == REDACTED
		assert out["nested"]["Authorization"] == REDACTED
		assert "sk-" not in out["msg"] and "postgresql://" not in out["msg"]
		assert out["ok"] == "fine"

	def test_formatter_emits_json(self):
		record = logging.LogRecord("t", logging.INFO, "", 0, "hello", None, None)
		record.fields = {"token": "secret", "count": 3}
		entry = json.loads(JsonFormatter().format(record))
		assert entry["msg"] == "hello" and entry["count"] == 3 and entry["token"] == REDACTED


def mock_client(handler) -> httpx.Client:
	return httpx.Client(transport=httpx.MockTransport(handler))


class TestProviders:
	def test_openai_compatible_parses_usage(self):
		seen = {}

		def handler(request: httpx.Request):
			seen["body"] = json.loads(request.content)
			seen["auth"] = request.headers.get("authorization")
			return httpx.Response(200, json={
				"model": "m-1",
				"choices": [{"message": {"content": "{}"}}],
				"usage": {"prompt_tokens": 10, "completion_tokens": 5},
			})

		settings = make_settings(llm_provider="openai_compatible", llm_model="m-1", llm_api_key="k", llm_base_url="http://x/v1")
		result = OpenAICompatibleLLM(settings, mock_client(handler)).complete("sys", "user", max_tokens=100)
		assert (result.input_tokens, result.output_tokens) == (10, 5)
		assert seen["body"]["max_tokens"] == 100
		assert seen["body"]["response_format"] == {"type": "json_object"}
		assert seen["auth"] == "Bearer k"

	def test_retries_transient_errors_then_succeeds(self, monkeypatch):
		monkeypatch.setattr("app.services.http.time.sleep", lambda _: None)
		attempts = {"n": 0}

		def handler(_):
			attempts["n"] += 1
			if attempts["n"] < 3:
				return httpx.Response(503)
			return httpx.Response(200, json={"choices": [{"message": {"content": "ok"}}]})

		settings = make_settings(llm_provider="openai_compatible", llm_model="m", llm_max_retries=2)
		assert OpenAICompatibleLLM(settings, mock_client(handler)).complete("s", "u").text == "ok"
		assert attempts["n"] == 3

	def test_auth_failure_is_not_retried(self):
		attempts = {"n": 0}

		def handler(_):
			attempts["n"] += 1
			return httpx.Response(401, json={"error": "bad key sk-secret"})

		settings = make_settings(llm_provider="openai_compatible", llm_model="m")
		with pytest.raises(ProviderError) as exc:
			OpenAICompatibleLLM(settings, mock_client(handler)).complete("s", "u")
		assert exc.value.code == "provider_auth_failed"
		assert "sk-secret" not in exc.value.message
		assert attempts["n"] == 1

	def test_timeout_maps_to_provider_timeout(self, monkeypatch):
		monkeypatch.setattr("app.services.http.time.sleep", lambda _: None)

		def handler(request):
			raise httpx.ReadTimeout("slow", request=request)

		settings = make_settings(llm_provider="openai_compatible", llm_model="m", llm_max_retries=1)
		with pytest.raises(ProviderTimeoutError):
			OpenAICompatibleLLM(settings, mock_client(handler)).complete("s", "u")

	def test_anthropic_request_shape(self):
		seen = {}

		def handler(request: httpx.Request):
			seen["headers"] = request.headers
			seen["body"] = json.loads(request.content)
			return httpx.Response(200, json={
				"content": [{"type": "text", "text": "hi"}],
				"usage": {"input_tokens": 3, "output_tokens": 1},
			})

		settings = make_settings(llm_provider="anthropic", llm_model="claude-x", llm_api_key="k")
		result = AnthropicLLM(settings, mock_client(handler)).complete("sys", "user")
		assert result.text == "hi" and result.input_tokens == 3
		assert seen["headers"]["x-api-key"] == "k"
		assert seen["body"]["system"] == "sys"

	def test_embedder_checks_dimensions(self):
		def handler(_):
			return httpx.Response(200, json={"data": [{"index": 0, "embedding": [0.1, 0.2]}]})

		settings = make_settings(embedding_provider="openai_compatible", embedding_model="e", embedding_base_url="http://emb/v1", embedding_dim=768)
		with pytest.raises(ProviderError) as exc:
			OpenAICompatibleEmbedder(settings, mock_client(handler)).embed(["x"])
		assert exc.value.code == "embedding_dim_mismatch"

	def test_embedder_batches(self):
		batches = []

		def handler(request):
			inputs = json.loads(request.content)["input"]
			batches.append(len(inputs))
			return httpx.Response(200, json={"data": [{"index": i, "embedding": [1.0, 0.0]} for i in range(len(inputs))]})

		settings = make_settings(embedding_provider="openai_compatible", embedding_model="e", embedding_base_url="http://emb/v1", embedding_dim=2, embedding_batch_size=2)
		vectors = OpenAICompatibleEmbedder(settings, mock_client(handler)).embed(["a", "b", "c"])
		assert len(vectors) == 3 and batches == [2, 1]

	def test_hash_embedder_similarity_tracks_overlap(self):
		e = HashEmbedder(256)
		a, b, c = e.embed(["cold brew coffee recipe", "recipe for cold brew coffee", "quarterly tax filing deadline"])
		assert cosine(a, b) > 0.9
		assert cosine(a, c) < 0.3

	def test_cost_estimate(self):
		s = make_settings(llm_input_cost_per_mtok=1.0, llm_output_cost_per_mtok=2.0)
		assert estimate_cost(s, 1_000_000, 500_000) == 2.0
		assert estimate_cost(s, None, 10) is None
		assert estimate_cost(make_settings(), 10, 10) is None


class TestSettings:
	def test_production_problems(self):
		problems = make_settings(app_env="production", auth_disabled=True).production_problems()
		assert any("AUTH_DISABLED" in p for p in problems)
		assert any("DATABASE_URL" in p for p in problems)

	def test_overlap_must_be_smaller_than_chunk(self):
		with pytest.raises(ValueError):
			make_settings(chunk_size=100, chunk_overlap=100)
