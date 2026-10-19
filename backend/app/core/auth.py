"""Supabase JWT verification.

The frontend signs in with Supabase Auth and sends `Authorization: Bearer <access_token>`.
We verify the token server-side and use its `sub` claim as the owner ID for every
document, chunk, and generation. IDs sent by the client are never trusted on their own.
"""

import hmac
from dataclasses import dataclass
from functools import lru_cache

import jwt
from fastapi import Depends, Request

from app.core.config import Settings, get_settings
from app.core.errors import AuthError, ServiceUnavailableError

# Used only when AUTH_DISABLED=true (local development and tests).
DEV_USER_ID = "00000000-0000-0000-0000-000000000001"
VALID_TIERS = {"basic", "pro", "premium"}


@dataclass(frozen=True)
class CurrentUser:
	id: str
	email: str | None = None
	# Comes from app_metadata, which users cannot edit themselves (unlike user_metadata).
	tier: str = "basic"


@lru_cache(maxsize=4)
def _jwks_client(supabase_url: str) -> jwt.PyJWKClient:
	return jwt.PyJWKClient(f"{supabase_url.rstrip('/')}/auth/v1/.well-known/jwks.json", cache_keys=True)


def decode_token(token: str, settings: Settings) -> dict:
	options = {"require": ["sub", "exp"]}
	try:
		if settings.supabase_jwt_secret:
			return jwt.decode(
				token,
				settings.supabase_jwt_secret,
				algorithms=["HS256"],
				audience=settings.supabase_jwt_audience,
				options=options,
			)
		if not settings.supabase_url:
			raise ServiceUnavailableError("Authentication is not configured on the server.", "auth_not_configured")
		signing_key = _jwks_client(settings.supabase_url).get_signing_key_from_jwt(token)
		return jwt.decode(
			token,
			signing_key.key,
			algorithms=["RS256", "ES256"],
			audience=settings.supabase_jwt_audience,
			options=options,
		)
	except jwt.ExpiredSignatureError as exc:
		raise AuthError("Your session has expired. Please log in again.", "token_expired") from exc
	except jwt.PyJWKClientError as exc:
		raise ServiceUnavailableError("Could not verify the session right now.", "auth_unavailable") from exc
	except jwt.InvalidTokenError as exc:
		raise AuthError("Invalid session token.", "invalid_token") from exc


def user_from_claims(claims: dict) -> CurrentUser:
	tier = str((claims.get("app_metadata") or {}).get("subscription", "basic")).lower()
	return CurrentUser(
		id=str(claims["sub"]),
		email=claims.get("email"),
		tier=tier if tier in VALID_TIERS else "basic",
	)


def require_n8n(request: Request, settings: Settings = Depends(get_settings)) -> None:
	"""Guards internal endpoints that only the n8n workflows may call (X-ScriptAI-Secret header)."""
	if not settings.n8n_shared_secret:
		raise ServiceUnavailableError("N8N_SHARED_SECRET is not configured.", "automations_not_configured")
	supplied = request.headers.get("x-scriptai-secret", "")
	if not hmac.compare_digest(supplied.encode(), settings.n8n_shared_secret.encode()):
		raise AuthError("Invalid automation secret.", "invalid_automation_secret")


def get_current_user(request: Request, settings: Settings = Depends(get_settings)) -> CurrentUser:
	if settings.auth_disabled:
		return CurrentUser(id=DEV_USER_ID, email="dev@localhost", tier="premium")
	header = request.headers.get("authorization", "")
	scheme, _, token = header.partition(" ")
	if scheme.lower() != "bearer" or not token:
		raise AuthError()
	return user_from_claims(decode_token(token, settings))
