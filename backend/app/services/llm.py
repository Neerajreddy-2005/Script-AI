"""LLM clients. The provider and model are chosen entirely by environment variables."""

import json
import re
from collections.abc import Callable
from dataclasses import dataclass
from typing import Protocol

import httpx

from app.core.config import Settings
from app.core.errors import ProviderError, ServiceUnavailableError
from app.services.http import post_json


@dataclass
class LLMResult:
	text: str
	provider: str
	model: str
	input_tokens: int | None = None
	output_tokens: int | None = None


class LLMClient(Protocol):
	provider: str
	model: str

	def complete(self, system: str, user: str, max_tokens: int | None = None) -> LLMResult: ...


class OpenAICompatibleLLM:
	"""Any `/chat/completions` API: OpenAI, Groq, OpenRouter, Gemini, DeepSeek, Together, Ollama..."""

	provider = "openai_compatible"

	def __init__(self, settings: Settings, client: httpx.Client | None = None):
		if not settings.llm_model:
			raise ServiceUnavailableError("LLM_MODEL is not configured.", "llm_not_configured")
		self.settings = settings
		self.model = settings.llm_model
		self.client = client or httpx.Client()

	def complete(self, system: str, user: str, max_tokens: int | None = None) -> LLMResult:
		s = self.settings
		limit = min(max_tokens or s.llm_max_output_tokens, s.llm_max_output_tokens)
		payload: dict = {
			"model": self.model,
			"messages": [{"role": "system", "content": system}, {"role": "user", "content": user}],
			"temperature": s.llm_temperature,
			"max_tokens": limit,
		}
		if s.llm_json_mode:
			payload["response_format"] = {"type": "json_object"}
		headers = {"Content-Type": "application/json"}
		if s.llm_api_key:  # local servers such as Ollama need no key
			headers["Authorization"] = f"Bearer {s.llm_api_key}"
		body = post_json(
			self.client,
			f"{s.llm_base_url.rstrip('/')}/chat/completions",
			headers=headers,
			payload=payload,
			timeout=s.llm_timeout_seconds,
			max_retries=s.llm_max_retries,
			provider=self.provider,
		)
		try:
			text = body["choices"][0]["message"]["content"] or ""
		except (KeyError, IndexError, TypeError) as exc:
			raise ProviderError("The AI provider returned an unexpected response.", "provider_bad_response") from exc
		usage = body.get("usage") or {}
		return LLMResult(
			text=text,
			provider=self.provider,
			model=body.get("model") or self.model,
			input_tokens=usage.get("prompt_tokens"),
			output_tokens=usage.get("completion_tokens"),
		)


class AnthropicLLM:
	"""Claude via the Messages API."""

	provider = "anthropic"
	url = "https://api.anthropic.com/v1/messages"

	def __init__(self, settings: Settings, client: httpx.Client | None = None):
		if not settings.llm_model or not settings.llm_api_key:
			raise ServiceUnavailableError("LLM_MODEL and LLM_API_KEY are required for Anthropic.", "llm_not_configured")
		self.settings = settings
		self.model = settings.llm_model
		self.client = client or httpx.Client()

	def complete(self, system: str, user: str, max_tokens: int | None = None) -> LLMResult:
		s = self.settings
		limit = min(max_tokens or s.llm_max_output_tokens, s.llm_max_output_tokens)
		body = post_json(
			self.client,
			self.url,
			headers={
				"x-api-key": s.llm_api_key,
				"anthropic-version": "2023-06-01",
				"content-type": "application/json",
			},
			payload={
				"model": self.model,
				"max_tokens": limit,
				"temperature": s.llm_temperature,
				"system": system,
				"messages": [{"role": "user", "content": user}],
			},
			timeout=s.llm_timeout_seconds,
			max_retries=s.llm_max_retries,
			provider=self.provider,
		)
		try:
			text = "".join(block.get("text", "") for block in body["content"] if block.get("type") == "text")
		except (KeyError, TypeError) as exc:
			raise ProviderError("The AI provider returned an unexpected response.", "provider_bad_response") from exc
		usage = body.get("usage") or {}
		return LLMResult(
			text=text,
			provider=self.provider,
			model=body.get("model") or self.model,
			input_tokens=usage.get("input_tokens"),
			output_tokens=usage.get("output_tokens"),
		)


Responder = Callable[[str, str], str]


class FakeLLM:
	"""Deterministic offline model for tests, CI, the eval harness, and keyless local development.

	It reads the target word range, required keywords, and source labels from the prompt so its
	output passes validation, which lets the whole pipeline run end to end without a provider.
	"""

	provider = "fake"
	model = "fake-script-model"

	def __init__(self, responder: Responder | None = None):
		self.responder = responder or fake_script_responder
		self.calls: list[tuple[str, str]] = []

	def complete(self, system: str, user: str, max_tokens: int | None = None) -> LLMResult:
		self.calls.append((system, user))
		text = self.responder(system, user)
		return LLMResult(
			text=text,
			provider=self.provider,
			model=self.model,
			input_tokens=(len(system) + len(user)) // 4,
			output_tokens=len(text) // 4,
		)


def fake_script_responder(_system: str, user: str) -> str:
	topic_match = re.search(r"^Topic: (.+)$", user, re.M)
	topic = topic_match.group(1).strip() if topic_match else "your topic"
	range_match = re.search(r"Target length: (\d+)-(\d+) words", user)
	low, high = (int(range_match.group(1)), int(range_match.group(2))) if range_match else (300, 450)
	target = (low + high) // 2
	kw_match = re.search(r"^Required keywords: (.+)$", user, re.M)
	keywords = [k.strip() for k in kw_match.group(1).split(",")] if kw_match else []
	cta_match = re.search(r"^Call to action: (.+)$", user, re.M)
	sources = sorted(set(re.findall(r"\[(S\d+)\]", user)), key=lambda s: int(s[1:]))

	filler = f"This part explains {topic} with clear practical detail for the audience".split()
	def words(n: int) -> str:
		return " ".join(filler[i % len(filler)] for i in range(n)) + "."

	intro = f"Welcome! Today we explore {topic}. " + words(target // 5)
	main = " ".join(keywords) + (" " if keywords else "") + words(target * 3 // 5)
	if sources:
		main += f" According to the reference material [{sources[0]}], this is well supported."
	conclusion = words(target // 5) + (f" {cta_match.group(1).strip()}" if cta_match else " Thanks for watching!")
	return json.dumps({
		"title": f"{topic} - Script",
		"introduction": intro,
		"mainContent": main,
		"conclusion": conclusion,
		"sources_used": sources[:1],
	})


def build_llm(settings: Settings) -> LLMClient:
	if settings.llm_provider == "anthropic":
		return AnthropicLLM(settings)
	if settings.llm_provider == "openai_compatible":
		return OpenAICompatibleLLM(settings)
	return FakeLLM()


def estimate_cost(settings: Settings, input_tokens: int | None, output_tokens: int | None) -> float | None:
	if input_tokens is None or output_tokens is None:
		return None
	if settings.llm_input_cost_per_mtok is None or settings.llm_output_cost_per_mtok is None:
		return None
	cost = input_tokens * settings.llm_input_cost_per_mtok + output_tokens * settings.llm_output_cost_per_mtok
	return round(cost / 1_000_000, 6)
