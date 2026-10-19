"""Script-AI 2.0 API.

Run locally from the backend/ directory:
    uvicorn app.main:app --reload --port 8000
"""

import logging
import re
import time
import uuid
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api import generation, health, knowledge, reminders
from app.core.config import get_settings
from app.core.errors import install_error_handlers
from app.core.logging import configure_logging, log_event, request_id_var

logger = logging.getLogger("scriptai.http")
_REQUEST_ID = re.compile(r"^[A-Za-z0-9\-]{8,64}$")


class RequestContextMiddleware:
	"""Assigns a request ID (or accepts a well-formed X-Request-ID), returns it in the response
	headers, and writes one structured access log line per request."""

	def __init__(self, app):
		self.app = app

	async def __call__(self, scope, receive, send):
		if scope["type"] != "http":
			await self.app(scope, receive, send)
			return
		incoming = dict(scope["headers"]).get(b"x-request-id", b"").decode("latin-1")
		request_id = incoming if _REQUEST_ID.match(incoming) else str(uuid.uuid4())
		token = request_id_var.set(request_id)
		started = time.perf_counter()
		status_holder = {"status": 500}

		async def send_wrapper(message):
			if message["type"] == "http.response.start":
				status_holder["status"] = message["status"]
				message.setdefault("headers", []).append((b"x-request-id", request_id.encode()))
			await send(message)

		try:
			await self.app(scope, receive, send_wrapper)
		finally:
			log_event(
				logger,
				"request",
				method=scope["method"],
				path=scope["path"],
				status=status_holder["status"],
				duration_ms=int((time.perf_counter() - started) * 1000),
			)
			request_id_var.reset(token)


@asynccontextmanager
async def lifespan(_: FastAPI):
	settings = get_settings()
	configure_logging(settings.log_level)
	if settings.app_env == "production":
		problems = settings.production_problems()
		if problems:
			# Refuse to start with unsafe production settings.
			raise RuntimeError("Unsafe production configuration: " + "; ".join(problems))
	log_event(
		logger,
		"startup",
		env=settings.app_env,
		llm_provider=settings.llm_provider,
		llm_model=settings.llm_model or None,
		embedding_provider=settings.embedding_provider,
		database="postgres" if settings.database_url else "in-memory",
		auth="disabled" if settings.auth_disabled else "supabase",
	)
	yield


def create_app() -> FastAPI:
	settings = get_settings()
	# Interactive API docs are for development; production doesn't advertise its routes.
	docs = {} if settings.app_env != "production" else {"docs_url": None, "redoc_url": None, "openapi_url": None}
	app = FastAPI(title="Script-AI API", version="2.0.0", lifespan=lifespan, **docs)
	app.add_middleware(
		CORSMiddleware,
		allow_origins=settings.cors_origins,
		allow_credentials=False,  # auth uses bearer tokens, not cookies
		allow_methods=["GET", "POST", "DELETE", "OPTIONS"],
		allow_headers=["Authorization", "Content-Type", "X-Request-ID"],
		expose_headers=["X-Request-ID"],
	)
	app.add_middleware(RequestContextMiddleware)
	install_error_handlers(app)

	app.include_router(health.router)
	app.include_router(generation.router)
	app.include_router(knowledge.router)
	app.include_router(reminders.router)
	app.include_router(reminders.internal)

	@app.get("/", include_in_schema=False)
	def root() -> dict:
		return {"status": "ok", "service": "script-ai", "docs": "/docs"}

	return app


app = create_app()
