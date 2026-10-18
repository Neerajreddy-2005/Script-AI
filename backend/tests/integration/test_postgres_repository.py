"""Runs only when TEST_DATABASE_URL points at a disposable Postgres with pgvector, e.g.:

    docker compose up -d db
    TEST_DATABASE_URL=postgresql://postgres:postgres@localhost:54322/scriptai pytest tests/integration/test_postgres_repository.py
"""

import os
import uuid
from datetime import datetime, timedelta, timezone
from pathlib import Path

import pytest

from app.schemas.knowledge import Chunk, Document
from app.schemas.reminders import Reminder
from app.services.embeddings import HashEmbedder

DATABASE_URL = os.environ.get("TEST_DATABASE_URL")
pytestmark = pytest.mark.skipif(not DATABASE_URL, reason="TEST_DATABASE_URL not set")

DIM = 768  # must match migrations/001_init.sql
MIGRATION = Path(__file__).resolve().parents[2] / "migrations" / "001_init.sql"


@pytest.fixture(scope="module")
def pg():
	import psycopg

	from app.repositories.postgres import PostgresRepository

	with psycopg.connect(DATABASE_URL, autocommit=True) as conn:
		conn.execute("drop table if exists document_chunks, documents, generations, reminders cascade")
		conn.execute(MIGRATION.read_text(encoding="utf-8"))
		conn.execute(MIGRATION.read_text(encoding="utf-8"))  # must be re-runnable
	repo = PostgresRepository(DATABASE_URL)
	yield repo
	repo.close()


def new_doc(owner: str, name: str = "a.md", content_hash: str | None = None) -> Document:
	now = datetime.now(timezone.utc)
	return Document(
		id=str(uuid.uuid4()), owner_id=owner, filename=name, content_type="text/markdown", file_size=10,
		content_hash=content_hash or uuid.uuid4().hex, status="processing", created_at=now, updated_at=now,
	)


def add_chunks(repo, doc: Document, texts: list[str]):
	emb = HashEmbedder(DIM)
	chunks = [
		Chunk(id=str(uuid.uuid4()), document_id=doc.id, owner_id=doc.owner_id, chunk_index=i, text=t, embedding_model="hash")
		for i, t in enumerate(texts)
	]
	repo.replace_chunks(doc.owner_id, doc.id, chunks, emb.embed(texts))
	repo.update_document(doc.owner_id, doc.id, status="ready", chunk_count=len(chunks))


def test_document_crud_and_search(pg):
	owner, other = str(uuid.uuid4()), str(uuid.uuid4())
	doc = pg.create_document(new_doc(owner))
	add_chunks(pg, doc, ["Brewly cold brew steeps for 18 hours", "Quarterly tax deadlines for freelancers"])
	assert pg.get_document(owner, doc.id).status == "ready"
	assert pg.get_document(other, doc.id) is None
	assert pg.count_documents(owner) == 1

	query = HashEmbedder(DIM).embed(["cold brew steeping"])[0]
	hits = pg.vector_search(owner, query, 5)
	assert hits[0].chunk.text.startswith("Brewly")
	assert hits[0].similarity > hits[1].similarity
	assert pg.vector_search(other, query, 5) == []

	kw = pg.keyword_search(owner, "brewly steeping", 5)
	assert kw and kw[0].chunk.text.startswith("Brewly")
	assert pg.keyword_search(owner, "brewly", 5, document_ids=[str(uuid.uuid4())]) == []
	assert pg.keyword_search(owner, "!!!", 5) == []

	assert pg.find_document_by_hash(owner, doc.content_hash).id == doc.id
	assert pg.delete_document(other, doc.id) is False
	assert pg.delete_document(owner, doc.id) is True
	assert pg.vector_search(owner, query, 5) == []  # chunks cascaded


def test_replace_chunks_is_idempotent(pg):
	owner = str(uuid.uuid4())
	doc = pg.create_document(new_doc(owner))
	add_chunks(pg, doc, ["one", "two"])
	add_chunks(pg, doc, ["three"])
	query = HashEmbedder(DIM).embed(["three"])[0]
	assert [h.chunk.text for h in pg.vector_search(owner, query, 10)] == ["three"]


def test_unique_hash_per_owner(pg):
	import psycopg

	owner = str(uuid.uuid4())
	pg.create_document(new_doc(owner, content_hash="same"))
	pg.create_document(new_doc(str(uuid.uuid4()), content_hash="same"))  # other owner is fine
	with pytest.raises(psycopg.errors.UniqueViolation):
		pg.create_document(new_doc(owner, content_hash="same"))


def test_generation_records_and_quota_count(pg):
	owner = str(uuid.uuid4())
	now = datetime.now(timezone.utc)
	base = {
		"owner_id": owner, "request": {"platform": "YouTube"}, "mode": "standard", "validation": {"passed": True},
		"sources": [], "provider": "fake", "model": "m", "llm_calls": 1, "input_tokens": 1, "output_tokens": 1,
		"estimated_cost_usd": None, "duration_ms": 5, "error_code": None,
	}
	pg.record_generation({**base, "id": str(uuid.uuid4()), "status": "succeeded", "created_at": now})
	pg.record_generation({**base, "id": str(uuid.uuid4()), "status": "failed", "created_at": now})
	pg.record_generation({**base, "id": str(uuid.uuid4()), "status": "succeeded", "created_at": now - timedelta(days=2)})
	assert pg.count_generations_since(owner, now - timedelta(hours=1)) == 1


def new_reminder(owner: str, minutes_from_now: int) -> Reminder:
	now = datetime.now(timezone.utc)
	return Reminder(
		id=str(uuid.uuid4()), owner_id=owner, email="u@example.com", title="Post it", note=None,
		remind_at=now + timedelta(minutes=minutes_from_now), status="pending", created_at=now, updated_at=now,
	)


def test_reminder_claim_complete_cancel(pg):
	owner = str(uuid.uuid4())
	due = pg.create_reminder(new_reminder(owner, -1))
	later = pg.create_reminder(new_reminder(owner, 60))
	cancelled = pg.create_reminder(new_reminder(owner, -1))
	assert pg.cancel_reminder(owner, cancelled.id) is True
	assert pg.cancel_reminder(str(uuid.uuid4()), later.id) is False  # other owner
	assert pg.count_pending_reminders(owner) == 2

	now = datetime.now(timezone.utc)
	claimed = pg.claim_due_reminders(now, 10, now - timedelta(minutes=15), 3)
	assert [r.id for r in claimed if r.owner_id == owner] == [due.id]
	assert claimed[0].status == "processing" and claimed[0].attempts == 1
	assert [r for r in pg.claim_due_reminders(now, 10, now - timedelta(minutes=15), 3) if r.owner_id == owner] == []

	# Failure goes back to pending; a stale "processing" claim is retried.
	assert pg.complete_reminder(due.id, False, "smtp", 3).status == "pending"
	again = [r for r in pg.claim_due_reminders(now, 10, now - timedelta(minutes=15), 3) if r.owner_id == owner]
	assert again[0].attempts == 2
	assert pg.complete_reminder(due.id, True, None, 3).status == "sent"
	assert pg.complete_reminder(due.id, True, None, 3) is None
	assert {r.id for r in pg.list_reminders(owner)} == {due.id, later.id}

