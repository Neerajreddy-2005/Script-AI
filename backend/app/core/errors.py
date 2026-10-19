"""Application error types. Each maps to a safe HTTP response; details never include secrets."""

import logging

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.core.logging import log_event, request_id_var

logger = logging.getLogger("scriptai.errors")


class AppError(Exception):
	status_code = 500
	code = "internal_error"
	message = "Something went wrong. Please try again."

	def __init__(self, message: str | None = None, code: str | None = None):
		super().__init__(message or self.message)
		if message:
			self.message = message
		if code:
			self.code = code


class BadRequestError(AppError):
	status_code = 400
	code = "bad_request"
	message = "The request is invalid."


class AuthError(AppError):
	status_code = 401
	code = "unauthorized"
	message = "Authentication is required."


class NotFoundError(AppError):
	status_code = 404
	code = "not_found"
	message = "The requested resource was not found."


class PayloadTooLargeError(AppError):
	status_code = 413
	code = "file_too_large"
	message = "The uploaded file is too large."


class UnsupportedMediaError(AppError):
	status_code = 415
	code = "unsupported_file_type"
	message = "This file type is not supported."


class UnprocessableError(AppError):
	status_code = 422
	code = "unprocessable"
	message = "The input could not be processed."


class QuotaExceededError(AppError):
	status_code = 429
	code = "quota_exceeded"
	message = "Daily generation limit reached. Try again tomorrow."


class RateLimitedError(AppError):
	status_code = 429
	code = "email_rate_limited"
	message = "Too many emails. Please try again later."


class ProviderError(AppError):
	"""The upstream model/embedding provider failed or returned unusable output."""

	status_code = 502
	code = "provider_error"
	message = "The AI provider failed to respond correctly. Please try again."


class ProviderTimeoutError(ProviderError):
	status_code = 504
	code = "provider_timeout"
	message = "The AI provider took too long to respond. Please try again."


class ServiceUnavailableError(AppError):
	status_code = 503
	code = "service_unavailable"
	message = "A required service is unavailable."


def error_body(code: str, message: str) -> dict:
	return {"success": False, "error": {"code": code, "message": message}, "request_id": request_id_var.get()}


def install_error_handlers(app: FastAPI) -> None:
	@app.exception_handler(AppError)
	async def _app_error(_: Request, exc: AppError):
		level = logging.ERROR if exc.status_code >= 500 else logging.INFO
		log_event(logger, "request_failed", level, error_code=exc.code, status=exc.status_code)
		return JSONResponse(error_body(exc.code, exc.message), status_code=exc.status_code)

	@app.exception_handler(RequestValidationError)
	async def _validation_error(_: Request, exc: RequestValidationError):
		# Report which fields failed without echoing user input back.
		fields = [".".join(str(p) for p in e["loc"] if p not in ("body", "path", "query")) for e in exc.errors()]
		message = "Invalid input: " + ", ".join(sorted(set(f for f in fields if f))) if fields else "Invalid input."
		log_event(logger, "validation_failed", fields=fields)
		return JSONResponse(error_body("validation_error", message), status_code=422)

	@app.exception_handler(StarletteHTTPException)
	async def _http_error(_: Request, exc: StarletteHTTPException):
		code = {404: "not_found", 405: "method_not_allowed"}.get(exc.status_code, "http_error")
		return JSONResponse(error_body(code, str(exc.detail)), status_code=exc.status_code)

	@app.exception_handler(Exception)
	async def _unhandled(_: Request, exc: Exception):
		logger.error("unhandled_exception", exc_info=exc, extra={"fields": {"exc": type(exc).__name__}})
		return JSONResponse(error_body(AppError.code, AppError.message), status_code=500)
