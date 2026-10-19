import pytest

from app.core.errors import RateLimitedError
from app.services.email_limit import EmailRateLimiter


def test_window_slides_and_users_are_independent():
	now = [0.0]
	limiter = EmailRateLimiter(2, window_seconds=60, clock=lambda: now[0])
	limiter.consume("a")
	limiter.consume("a")
	with pytest.raises(RateLimitedError):
		limiter.consume("a")
	limiter.consume("b")  # another user has their own budget
	now[0] = 60.0  # the oldest sends leave the window
	limiter.consume("a")
