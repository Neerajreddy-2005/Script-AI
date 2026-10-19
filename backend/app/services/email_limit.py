"""Per-user budget for outgoing email.

Every email (scripts, background results, reminders) leaves through one shared SMTP account in n8n,
which has a daily sending cap. Without a per-user limit, one account could use that cap up and block
email for every other user. The budget is a sliding window kept in process memory: enough for the
single API instance this project runs, and reset on restart.
"""

import threading
import time
from collections import defaultdict, deque
from collections.abc import Callable

from app.core.errors import RateLimitedError


class EmailRateLimiter:
	def __init__(self, max_per_window: int, window_seconds: float = 3600.0, clock: Callable[[], float] = time.monotonic):
		self.max_per_window = max_per_window
		self.window_seconds = window_seconds
		self._clock = clock
		self._sent: dict[str, deque[float]] = defaultdict(deque)
		self._lock = threading.Lock()

	def consume(self, user_id: str) -> None:
		"""Record one email for this user, or raise if the budget for the window is used up."""
		now = self._clock()
		with self._lock:
			sent = self._sent[user_id]
			while sent and now - sent[0] >= self.window_seconds:
				sent.popleft()
			if len(sent) >= self.max_per_window:
				raise RateLimitedError(
					f"You can send at most {self.max_per_window} emails and reminders per hour. Please try again later."
				)
			sent.append(now)
