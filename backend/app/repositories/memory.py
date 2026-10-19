"""In-process repository for tests, the eval harness, and local development without a database.
Data is lost on restart."""

import threading
from datetime import datetime, timezone
from typing import Any

from app.schemas.knowledge import Chunk, Document, ScoredChunk
from app.schemas.reminders import Reminder
from app.services.embeddings import cosine, tokenize


class InMemoryRepository:
	def __init__(self) -> None:
		self._lock = threading.Lock()
		self.documents: dict[str, Document] = {}
		self.chunks: dict[str, list[tuple[Chunk, list[float]]]] = {}
		self.generations: list[dict[str, Any]] = []
		self.reminders: dict[str, Reminder] = {}

	def ping(self) -> None:
		return None

	def create_document(self, doc: Document) -> Document:
		with self._lock:
			self.documents[doc.id] = doc
		return doc

	def get_document(self, owner_id: str, document_id: str) -> Document | None:
		doc = self.documents.get(document_id)
		return doc if doc and doc.owner_id == owner_id else None

	def find_document_by_hash(self, owner_id: str, content_hash: str) -> Document | None:
		return next(
			(d for d in self.documents.values() if d.owner_id == owner_id and d.content_hash == content_hash),
			None,
		)

	def list_documents(self, owner_id: str) -> list[Document]:
		docs = [d for d in self.documents.values() if d.owner_id == owner_id]
		return sorted(docs, key=lambda d: d.created_at, reverse=True)

	def count_documents(self, owner_id: str) -> int:
		return sum(1 for d in self.documents.values() if d.owner_id == owner_id)

	def update_document(self, owner_id: str, document_id: str, **fields: Any) -> Document | None:
		with self._lock:
			doc = self.get_document(owner_id, document_id)
			if not doc:
				return None
			updated = doc.model_copy(update={**fields, "updated_at": datetime.now(timezone.utc)})
			self.documents[document_id] = updated
			return updated

	def delete_document(self, owner_id: str, document_id: str) -> bool:
		with self._lock:
			if not self.get_document(owner_id, document_id):
				return False
			del self.documents[document_id]
			self.chunks.pop(document_id, None)
			return True

	def replace_chunks(self, owner_id: str, document_id: str, chunks: list[Chunk], embeddings: list[list[float]]) -> None:
		with self._lock:
			self.chunks[document_id] = list(zip(chunks, embeddings, strict=True))

	def _candidates(self, owner_id: str, document_ids: list[str] | None):
		for doc_id, items in self.chunks.items():
			doc = self.documents.get(doc_id)
			if not doc or doc.owner_id != owner_id or doc.status != "ready":
				continue
			if document_ids is not None and doc_id not in document_ids:
				continue
			for chunk, vector in items:
				if chunk.owner_id == owner_id:
					yield doc, chunk, vector

	def vector_search(self, owner_id, embedding, k, document_ids=None) -> list[ScoredChunk]:
		scored = [
			ScoredChunk(chunk=chunk, filename=doc.filename, similarity=cosine(embedding, vector))
			for doc, chunk, vector in self._candidates(owner_id, document_ids)
		]
		scored.sort(key=lambda s: s.similarity or 0.0, reverse=True)
		return scored[:k]

	def keyword_search(self, owner_id, query, k, document_ids=None) -> list[ScoredChunk]:
		terms = set(tokenize(query))
		if not terms:
			return []
		scored = []
		for doc, chunk, _ in self._candidates(owner_id, document_ids):
			chunk_terms = tokenize(chunk.text)
			matched = terms.intersection(chunk_terms)
			if matched:
				# Coverage of query terms, lightly weighted by term frequency.
				rank = len(matched) / len(terms) + 0.01 * sum(chunk_terms.count(t) for t in matched)
				scored.append(ScoredChunk(chunk=chunk, filename=doc.filename, keyword_rank=rank))
		scored.sort(key=lambda s: s.keyword_rank or 0.0, reverse=True)
		return scored[:k]

	def record_generation(self, record: dict[str, Any]) -> None:
		with self._lock:
			self.generations.append(record)

	def count_generations_since(self, owner_id: str, since: datetime) -> int:
		return sum(
			1
			for g in self.generations
			if g["owner_id"] == owner_id and g["created_at"] >= since and g["status"] != "failed"
		)

	# --- reminders ---

	def create_reminder(self, reminder: Reminder) -> Reminder:
		with self._lock:
			self.reminders[reminder.id] = reminder
		return reminder

	def list_reminders(self, owner_id: str) -> list[Reminder]:
		items = [r for r in self.reminders.values() if r.owner_id == owner_id and r.status != "cancelled"]
		return sorted(items, key=lambda r: r.remind_at)[:100]

	def count_pending_reminders(self, owner_id: str) -> int:
		return sum(1 for r in self.reminders.values() if r.owner_id == owner_id and r.status in ("pending", "processing"))

	def cancel_reminder(self, owner_id: str, reminder_id: str) -> bool:
		with self._lock:
			r = self.reminders.get(reminder_id)
			if not r or r.owner_id != owner_id or r.status != "pending":
				return False
			self.reminders[reminder_id] = r.model_copy(update={"status": "cancelled", "updated_at": datetime.now(timezone.utc)})
			return True

	def claim_due_reminders(self, now, limit, stale_before, max_attempts) -> list[Reminder]:
		with self._lock:
			due = sorted(
				(
					r for r in self.reminders.values()
					if (r.status == "pending" and r.remind_at <= now)
					or (r.status == "processing" and r.claimed_at and r.claimed_at < stale_before and r.attempts < max_attempts)
				),
				key=lambda r: r.remind_at,
			)[:limit]
			claimed = []
			for r in due:
				updated = r.model_copy(update={"status": "processing", "claimed_at": now, "attempts": r.attempts + 1, "updated_at": now})
				self.reminders[r.id] = updated
				claimed.append(updated)
			return claimed

	def complete_reminder(self, reminder_id, success, error, max_attempts) -> Reminder | None:
		with self._lock:
			r = self.reminders.get(reminder_id)
			if not r or r.status != "processing":
				return None
			now = datetime.now(timezone.utc)
			if success:
				update = {"status": "sent", "sent_at": now, "last_error": None}
			else:
				update = {"status": "pending" if r.attempts < max_attempts else "failed", "last_error": error}
			self.reminders[reminder_id] = r.model_copy(update={**update, "updated_at": now})
			return self.reminders[reminder_id]
