"""Postgres + pgvector repository (Supabase or any Postgres with the `vector` extension).

The backend connects with DATABASE_URL, which bypasses RLS, so every query filters by
owner_id explicitly. RLS policies in the migration protect direct client access as well.
Schema: migrations/001_init.sql.
"""

import json
import re
from datetime import datetime
from typing import Any

from psycopg.rows import dict_row
from psycopg.types.json import Jsonb
from psycopg_pool import ConnectionPool

from app.schemas.knowledge import Chunk, Document, ScoredChunk
from app.schemas.reminders import Reminder

_DOC_COLUMNS = (
	"id::text, owner_id::text, filename, content_type, file_size, content_hash, status, "
	"chunk_count, ingestion_version, error_code, created_at, updated_at"
)
_CHUNK_COLUMNS = (
	"c.id::text, c.document_id::text, c.owner_id::text, c.chunk_index, c.text, c.section, "
	"c.page_number, c.embedding_model, c.ingestion_version, d.filename"
)
_UPDATABLE = {"status", "chunk_count", "ingestion_version", "error_code"}
_REMINDER_COLUMNS = (
	"id::text, owner_id::text, email, title, note, remind_at, status, attempts, claimed_at, sent_at, "
	"last_error, created_at, updated_at"
)
_WORD = re.compile(r"[a-z0-9]{2,}")


def _vector_literal(vector: list[float]) -> str:
	return "[" + ",".join(f"{x:.7g}" for x in vector) + "]"


def _or_tsquery(query: str) -> str:
	"""OR together the query's words so long briefs still match partially.
	Words are restricted to [a-z0-9] so the string is safe for to_tsquery."""
	words = list(dict.fromkeys(_WORD.findall(query.lower())))[:30]
	return " | ".join(words)


def _row_to_chunk(row: dict) -> Chunk:
	return Chunk(**{k: row[k] for k in Chunk.model_fields})


class PostgresRepository:
	def __init__(self, database_url: str, min_size: int = 1, max_size: int = 5):
		# prepare_threshold=None: Supabase's transaction pooler does not support prepared statements.
		self.pool = ConnectionPool(
			database_url,
			min_size=min_size,
			max_size=max_size,
			kwargs={"autocommit": True, "prepare_threshold": None, "row_factory": dict_row},
			open=True,
		)

	def close(self) -> None:
		self.pool.close()

	def _fetchall(self, sql: str, params: tuple | dict = ()) -> list[dict]:
		with self.pool.connection() as conn:
			return conn.execute(sql, params).fetchall()

	def _fetchone(self, sql: str, params: tuple | dict = ()) -> dict | None:
		with self.pool.connection() as conn:
			return conn.execute(sql, params).fetchone()

	def ping(self) -> None:
		self._fetchone("select 1 as ok")

	def create_document(self, doc: Document) -> Document:
		row = self._fetchone(
			f"""insert into documents (id, owner_id, filename, content_type, file_size, content_hash,
			    status, chunk_count, ingestion_version, error_code, created_at, updated_at)
			values (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
			returning {_DOC_COLUMNS}""",
			(
				doc.id, doc.owner_id, doc.filename, doc.content_type, doc.file_size, doc.content_hash,
				doc.status, doc.chunk_count, doc.ingestion_version, doc.error_code, doc.created_at, doc.updated_at,
			),
		)
		return Document(**row)

	def get_document(self, owner_id: str, document_id: str) -> Document | None:
		row = self._fetchone(
			f"select {_DOC_COLUMNS} from documents where id = %s and owner_id = %s", (document_id, owner_id)
		)
		return Document(**row) if row else None

	def find_document_by_hash(self, owner_id: str, content_hash: str) -> Document | None:
		row = self._fetchone(
			f"select {_DOC_COLUMNS} from documents where owner_id = %s and content_hash = %s",
			(owner_id, content_hash),
		)
		return Document(**row) if row else None

	def list_documents(self, owner_id: str) -> list[Document]:
		rows = self._fetchall(
			f"select {_DOC_COLUMNS} from documents where owner_id = %s order by created_at desc", (owner_id,)
		)
		return [Document(**r) for r in rows]

	def count_documents(self, owner_id: str) -> int:
		row = self._fetchone("select count(*) as n from documents where owner_id = %s", (owner_id,))
		return int(row["n"]) if row else 0

	def update_document(self, owner_id: str, document_id: str, **fields: Any) -> Document | None:
		unknown = set(fields) - _UPDATABLE
		if unknown:
			raise ValueError(f"cannot update fields: {sorted(unknown)}")
		assignments = ", ".join(f"{name} = %({name})s" for name in fields)
		row = self._fetchone(
			f"""update documents set {assignments}, updated_at = now()
			where id = %(id)s and owner_id = %(owner_id)s returning {_DOC_COLUMNS}""",
			{**fields, "id": document_id, "owner_id": owner_id},
		)
		return Document(**row) if row else None

	def delete_document(self, owner_id: str, document_id: str) -> bool:
		# document_chunks rows are removed by ON DELETE CASCADE.
		row = self._fetchone(
			"delete from documents where id = %s and owner_id = %s returning id", (document_id, owner_id)
		)
		return row is not None

	def replace_chunks(self, owner_id: str, document_id: str, chunks: list[Chunk], embeddings: list[list[float]]) -> None:
		with self.pool.connection() as conn, conn.transaction():
			conn.execute(
				"delete from document_chunks where document_id = %s and owner_id = %s", (document_id, owner_id)
			)
			with conn.cursor() as cur:
				cur.executemany(
					"""insert into document_chunks (id, document_id, owner_id, chunk_index, section,
					    page_number, text, embedding, embedding_model, ingestion_version)
					values (%s, %s, %s, %s, %s, %s, %s, %s::vector, %s, %s)""",
					[
						(
							c.id, document_id, owner_id, c.chunk_index, c.section, c.page_number, c.text,
							_vector_literal(e), c.embedding_model, c.ingestion_version,
						)
						for c, e in zip(chunks, embeddings, strict=True)
					],
				)

	def _doc_filter(self, document_ids: list[str] | None) -> tuple[str, tuple]:
		if document_ids is None:
			return "", ()
		return " and c.document_id = any(%s::uuid[])", (document_ids,)

	def vector_search(self, owner_id, embedding, k, document_ids=None) -> list[ScoredChunk]:
		vec = _vector_literal(embedding)
		doc_sql, doc_params = self._doc_filter(document_ids)
		rows = self._fetchall(
			f"""select {_CHUNK_COLUMNS}, 1 - (c.embedding <=> %s::vector) as similarity
			from document_chunks c join documents d on d.id = c.document_id
			where c.owner_id = %s and d.owner_id = %s and d.status = 'ready'{doc_sql}
			order by c.embedding <=> %s::vector
			limit %s""",
			(vec, owner_id, owner_id, *doc_params, vec, k),
		)
		return [
			ScoredChunk(chunk=_row_to_chunk(r), filename=r["filename"], similarity=float(r["similarity"]))
			for r in rows
		]

	def keyword_search(self, owner_id, query, k, document_ids=None) -> list[ScoredChunk]:
		tsquery = _or_tsquery(query)
		if not tsquery:
			return []
		doc_sql, doc_params = self._doc_filter(document_ids)
		rows = self._fetchall(
			f"""select {_CHUNK_COLUMNS}, ts_rank_cd(c.tsv, q) as rank
			from document_chunks c join documents d on d.id = c.document_id,
			     to_tsquery('english', %s) q
			where c.owner_id = %s and d.owner_id = %s and d.status = 'ready'{doc_sql} and c.tsv @@ q
			order by rank desc
			limit %s""",
			(tsquery, owner_id, owner_id, *doc_params, k),
		)
		return [
			ScoredChunk(chunk=_row_to_chunk(r), filename=r["filename"], keyword_rank=float(r["rank"]))
			for r in rows
		]

	def record_generation(self, record: dict[str, Any]) -> None:
		with self.pool.connection() as conn:
			conn.execute(
				"""insert into generations (id, owner_id, request, mode, status, validation, sources,
				    provider, model, llm_calls, input_tokens, output_tokens, estimated_cost_usd,
				    duration_ms, error_code, created_at)
				values (%(id)s, %(owner_id)s, %(request)s, %(mode)s, %(status)s, %(validation)s,
				    %(sources)s, %(provider)s, %(model)s, %(llm_calls)s, %(input_tokens)s,
				    %(output_tokens)s, %(estimated_cost_usd)s, %(duration_ms)s, %(error_code)s, %(created_at)s)""",
				{
					**record,
					"request": Jsonb(record.get("request")),
					"validation": Jsonb(record.get("validation")),
					"sources": Jsonb(json.loads(json.dumps(record.get("sources"), default=str))),
				},
			)

	def count_generations_since(self, owner_id: str, since: datetime) -> int:
		row = self._fetchone(
			"select count(*) as n from generations where owner_id = %s and created_at >= %s and status <> 'failed'",
			(owner_id, since),
		)
		return int(row["n"]) if row else 0

	# --- reminders ---

	def create_reminder(self, reminder: Reminder) -> Reminder:
		row = self._fetchone(
			f"""insert into reminders (id, owner_id, email, title, note, remind_at, status, created_at, updated_at)
			values (%s, %s, %s, %s, %s, %s, %s, %s, %s) returning {_REMINDER_COLUMNS}""",
			(
				reminder.id, reminder.owner_id, reminder.email, reminder.title, reminder.note,
				reminder.remind_at, reminder.status, reminder.created_at, reminder.updated_at,
			),
		)
		return Reminder(**row)

	def list_reminders(self, owner_id: str) -> list[Reminder]:
		rows = self._fetchall(
			f"""select {_REMINDER_COLUMNS} from reminders
			where owner_id = %s and status <> 'cancelled' order by remind_at limit 100""",
			(owner_id,),
		)
		return [Reminder(**r) for r in rows]

	def count_pending_reminders(self, owner_id: str) -> int:
		row = self._fetchone(
			"select count(*) as n from reminders where owner_id = %s and status in ('pending', 'processing')", (owner_id,)
		)
		return int(row["n"]) if row else 0

	def cancel_reminder(self, owner_id: str, reminder_id: str) -> bool:
		row = self._fetchone(
			"""update reminders set status = 'cancelled', updated_at = now()
			where id = %s and owner_id = %s and status = 'pending' returning id""",
			(reminder_id, owner_id),
		)
		return row is not None

	def claim_due_reminders(self, now, limit, stale_before, max_attempts) -> list[Reminder]:
		# FOR UPDATE SKIP LOCKED: concurrent n8n runs never claim the same reminder.
		rows = self._fetchall(
			f"""update reminders set status = 'processing', claimed_at = %(now)s, attempts = attempts + 1, updated_at = %(now)s
			where id in (
				select id from reminders
				where (status = 'pending' and remind_at <= %(now)s)
				   or (status = 'processing' and claimed_at < %(stale)s and attempts < %(max)s)
				order by remind_at
				limit %(limit)s
				for update skip locked
			)
			returning {_REMINDER_COLUMNS}""",
			{"now": now, "stale": stale_before, "max": max_attempts, "limit": limit},
		)
		return sorted((Reminder(**r) for r in rows), key=lambda r: r.remind_at)

	def complete_reminder(self, reminder_id, success, error, max_attempts) -> Reminder | None:
		if success:
			sql = "status = 'sent', sent_at = now(), last_error = null"
			params: dict = {"id": reminder_id}
		else:
			sql = "status = case when attempts < %(max)s then 'pending' else 'failed' end, last_error = %(error)s"
			params = {"id": reminder_id, "max": max_attempts, "error": error}
		row = self._fetchone(
			f"""update reminders set {sql}, updated_at = now()
			where id = %(id)s and status = 'processing' returning {_REMINDER_COLUMNS}""",
			params,
		)
		return Reminder(**row) if row else None
