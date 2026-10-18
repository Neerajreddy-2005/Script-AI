"""Structured JSON logging with request IDs and secret redaction."""

import json
import logging
import re
import sys
from contextvars import ContextVar
from datetime import datetime, timezone
from typing import Any

request_id_var: ContextVar[str] = ContextVar("request_id", default="-")

_SENSITIVE_KEYS = re.compile(r"(api[_-]?key|authorization|password|secret|token|cookie)", re.I)
_SECRET_PATTERNS = [
	re.compile(r"Bearer\s+[A-Za-z0-9\-._~+/]+=*", re.I),
	re.compile(r"\bsk-[A-Za-z0-9_\-]{8,}"),
	re.compile(r"\beyJ[A-Za-z0-9_\-]+\.[A-Za-z0-9_\-]+\.[A-Za-z0-9_\-]+"),  # JWTs
	re.compile(r"postgres(?:ql)?://[^\s\"']+", re.I),
]
REDACTED = "[REDACTED]"


def redact(value: Any) -> Any:
	"""Recursively redact secrets from strings, dicts, and lists."""
	if isinstance(value, str):
		for pattern in _SECRET_PATTERNS:
			value = pattern.sub(REDACTED, value)
		return value
	if isinstance(value, dict):
		return {
			k: (REDACTED if isinstance(k, str) and _SENSITIVE_KEYS.search(k) else redact(v))
			for k, v in value.items()
		}
	if isinstance(value, list | tuple):
		return [redact(v) for v in value]
	return value


class JsonFormatter(logging.Formatter):
	def format(self, record: logging.LogRecord) -> str:
		entry: dict[str, Any] = {
			"ts": datetime.now(timezone.utc).isoformat(timespec="milliseconds"),
			"level": record.levelname,
			"logger": record.name,
			"request_id": request_id_var.get(),
			"msg": record.getMessage(),
		}
		fields = getattr(record, "fields", None)
		if fields:
			entry.update(fields)
		if record.exc_info:
			entry["exc_type"] = record.exc_info[0].__name__ if record.exc_info[0] else None
		return json.dumps(redact(entry), default=str)


def configure_logging(level: str = "INFO") -> None:
	handler = logging.StreamHandler(sys.stdout)
	handler.setFormatter(JsonFormatter())
	root = logging.getLogger()
	root.handlers = [handler]
	root.setLevel(level.upper())
	# Keep third-party noise down; uvicorn access logs are replaced by our middleware.
	logging.getLogger("uvicorn.access").disabled = True
	logging.getLogger("httpx").setLevel(logging.WARNING)


def log_event(logger: logging.Logger, msg: str, level: int = logging.INFO, **fields: Any) -> None:
	logger.log(level, msg, extra={"fields": fields})
