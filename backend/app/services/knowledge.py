"""Knowledge base: ingestion pipeline and hybrid retrieval."""

import logging
import time
import uuid
from dataclasses import dataclass, field
from datetime import datetime, timezone

from app.core.config import Settings
from app.core.errors import AppError, BadRequestError, NotFoundError, ProviderError
from app.core.logging import log_event
from app.repositories.base import Repository
from app.schemas.knowledge import Chunk, Document, ScoredChunk
from app.services.document_ingestion import chunk_pages, extract_pages, validate_upload
from app.services.embeddings import Embedder, tokenize

logger = logging.getLogger("scriptai.knowledge")

INGESTION_VERSION = 1
RRF_K = 60  # standard reciprocal-rank-fusion constant
MIN_KEYWORD_COVERAGE = 0.5  # share of query terms a keyword-only hit must contain


@dataclass
class RetrievalResult:
	chunks: list[ScoredChunk] = field(default_factory=list)
	candidates: int = 0
	duration_ms: int = 0

	@property
	def relevant(self) -> bool:
		return bool(self.chunks)


def keyword_coverage(query: str, text: str) -> float:
	q = set(tokenize(query))
	return len(q.intersection(tokenize(text))) / len(q) if q else 0.0


def fuse(vector_hits: list[ScoredChunk], keyword_hits: list[ScoredChunk]) -> list[ScoredChunk]:
	"""Reciprocal rank fusion: robust to the two retrievers using incomparable score scales."""
	merged: dict[str, ScoredChunk] = {}
	for rank, hit in enumerate(vector_hits):
		merged[hit.chunk.id] = hit.model_copy(update={"fused_score": 1 / (RRF_K + rank + 1)})
	for rank, hit in enumerate(keyword_hits):
		bonus = 1 / (RRF_K + rank + 1)
		if hit.chunk.id in merged:
			existing = merged[hit.chunk.id]
			merged[hit.chunk.id] = existing.model_copy(
				update={"fused_score": existing.fused_score + bonus, "keyword_rank": hit.keyword_rank}
			)
		else:
			merged[hit.chunk.id] = hit.model_copy(update={"fused_score": bonus})
	return sorted(merged.values(), key=lambda h: h.fused_score, reverse=True)


class KnowledgeService:
	def __init__(self, repo: Repository, embedder: Embedder, settings: Settings):
		self.repo = repo
		self.embedder = embedder
		self.settings = settings

	# --- ingestion ---------------------------------------------------------

	def upload(self, owner_id: str, filename: str | None, data: bytes) -> tuple[Document, bool]:
		"""Validate, extract, chunk, embed, and store. Returns (document, is_duplicate)."""
		started = time.perf_counter()
		upload = validate_upload(filename, data, self.settings.max_upload_bytes)

		existing = self.repo.find_document_by_hash(owner_id, upload.content_hash)
		if existing and existing.status == "ready":
			return existing, True
		if existing:  # a previous attempt failed; retry cleanly instead of duplicating
			self.repo.delete_document(owner_id, existing.id)

		if self.repo.count_documents(owner_id) >= self.settings.max_documents_per_user:
			raise BadRequestError(
				f"You can store at most {self.settings.max_documents_per_user} documents. Delete some first.",
				"document_limit_reached",
			)

		now = datetime.now(timezone.utc)
		doc = self.repo.create_document(
			Document(
				id=str(uuid.uuid4()),
				owner_id=owner_id,
				filename=upload.filename,
				content_type=upload.content_type,
				file_size=len(data),
				content_hash=upload.content_hash,
				status="processing",
				ingestion_version=INGESTION_VERSION,
				created_at=now,
				updated_at=now,
			)
		)
		try:
			pages = extract_pages(upload)
			drafts = chunk_pages(pages, self.settings.chunk_size, self.settings.chunk_overlap)
			embeddings = self.embedder.embed([d.text for d in drafts])
			chunks = [
				Chunk(
					id=str(uuid.uuid4()),
					document_id=doc.id,
					owner_id=owner_id,
					chunk_index=d.chunk_index,
					text=d.text,
					section=d.section,
					page_number=d.page_number,
					embedding_model=self.embedder.model,
					ingestion_version=INGESTION_VERSION,
				)
				for d in drafts
			]
			self.repo.replace_chunks(owner_id, doc.id, chunks, embeddings)
		except AppError as exc:
			code = "embedding_failed" if isinstance(exc, ProviderError) else exc.code
			self.repo.update_document(owner_id, doc.id, status="failed", error_code=code)
			log_event(logger, "ingestion_failed", logging.WARNING, document_id=doc.id, error_code=code)
			raise
		except Exception:
			self.repo.update_document(owner_id, doc.id, status="failed", error_code="internal_error")
			raise

		doc = self.repo.update_document(owner_id, doc.id, status="ready", chunk_count=len(chunks))
		log_event(
			logger,
			"ingestion_succeeded",
			document_id=doc.id,
			pages=len(pages),
			chunks=len(chunks),
			bytes=len(data),
			duration_ms=int((time.perf_counter() - started) * 1000),
		)
		return doc, False

	def list_documents(self, owner_id: str) -> list[Document]:
		return self.repo.list_documents(owner_id)

	def get_document(self, owner_id: str, document_id: str) -> Document:
		doc = self.repo.get_document(owner_id, document_id)
		if not doc:
			raise NotFoundError("Document not found.")
		return doc

	def delete_document(self, owner_id: str, document_id: str) -> None:
		if not self.repo.delete_document(owner_id, document_id):
			raise NotFoundError("Document not found.")
		log_event(logger, "document_deleted", document_id=document_id)

	# --- retrieval ---------------------------------------------------------

	def retrieve(
		self, owner_id: str, query: str, top_k: int | None = None, document_ids: list[str] | None = None
	) -> RetrievalResult:
		"""Hybrid search (vector + full-text, fused with RRF), then drop low-relevance hits so an
		unrelated brief is not padded with irrelevant "sources"."""
		started = time.perf_counter()
		k = top_k or self.settings.rag_top_k
		if document_ids is not None:
			# Only the caller's own documents are searchable; unknown IDs are silently ignored.
			document_ids = [d for d in document_ids if self.repo.get_document(owner_id, d)]
			if not document_ids:
				return RetrievalResult()

		query_vector = self.embedder.embed([query])[0]
		vector_hits = self.repo.vector_search(owner_id, query_vector, k * 3, document_ids)
		keyword_hits = self.repo.keyword_search(owner_id, query, k * 3, document_ids)
		fused = fuse(vector_hits, keyword_hits)

		relevant = [
			h
			for h in fused
			if (h.similarity is not None and h.similarity >= self.settings.rag_min_similarity)
			or keyword_coverage(query, h.chunk.text) >= MIN_KEYWORD_COVERAGE
		][:k]
		duration_ms = int((time.perf_counter() - started) * 1000)
		log_event(
			logger,
			"retrieval",
			vector_hits=len(vector_hits),
			keyword_hits=len(keyword_hits),
			returned=len(relevant),
			duration_ms=duration_ms,
		)
		return RetrievalResult(chunks=relevant, candidates=len(fused), duration_ms=duration_ms)
