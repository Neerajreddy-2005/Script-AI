"""Shared HTTP call helper with timeouts and bounded retries for AI providers."""

import logging
import random
import time

import httpx

from app.core.errors import ProviderError, ProviderTimeoutError
from app.core.logging import log_event

logger = logging.getLogger("scriptai.http")

RETRYABLE_STATUS = {408, 409, 425, 429, 500, 502, 503, 504, 529}
MAX_BACKOFF_SECONDS = 10.0


def post_json(
	client: httpx.Client,
	url: str,
	*,
	headers: dict[str, str],
	payload: dict,
	timeout: float,
	max_retries: int,
	provider: str,
) -> dict:
	"""POST JSON and return the decoded body. Only transient failures are retried."""
	attempt = 0
	while True:
		try:
			response = client.post(url, headers=headers, json=payload, timeout=timeout)
		except httpx.TimeoutException as exc:
			if attempt < max_retries:
				attempt += 1
				_sleep(attempt, None)
				continue
			log_event(logger, "provider_timeout", logging.WARNING, provider=provider, attempts=attempt + 1)
			raise ProviderTimeoutError() from exc
		except httpx.HTTPError as exc:
			if attempt < max_retries:
				attempt += 1
				_sleep(attempt, None)
				continue
			log_event(logger, "provider_unreachable", logging.WARNING, provider=provider, error=type(exc).__name__)
			raise ProviderError("Could not reach the AI provider.", "provider_unreachable") from exc

		if response.status_code < 300:
			try:
				return response.json()
			except ValueError as exc:
				raise ProviderError("The AI provider returned an unreadable response.", "provider_bad_response") from exc

		if response.status_code in RETRYABLE_STATUS and attempt < max_retries:
			attempt += 1
			_sleep(attempt, response.headers.get("retry-after"))
			continue

		# Provider bodies can echo prompts or account details, so only the status is logged.
		log_event(logger, "provider_http_error", logging.WARNING, provider=provider, status=response.status_code)
		if response.status_code in (401, 403):
			raise ProviderError("The AI provider rejected the server's credentials.", "provider_auth_failed")
		if response.status_code == 429:
			raise ProviderError("The AI provider is rate limiting requests. Please wait and retry.", "provider_rate_limited")
		raise ProviderError()


def _sleep(attempt: int, retry_after: str | None) -> None:
	delay = 0.5 * (2 ** (attempt - 1)) + random.uniform(0, 0.25)
	if retry_after:
		try:
			delay = float(retry_after)
		except ValueError:
			pass
	time.sleep(min(delay, MAX_BACKOFF_SECONDS))
