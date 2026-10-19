from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

DocumentStatus = Literal["uploaded", "processing", "ready", "failed", "deleting"]


class Document(BaseModel):
	id: str
	owner_id: str
	filename: str
	content_type: str
	file_size: int
	content_hash: str
	status: DocumentStatus
	chunk_count: int = 0
	ingestion_version: int = 1
	error_code: str | None = None
	created_at: datetime
	updated_at: datetime


class DocumentOut(BaseModel):
	"""Public view of a document (no owner ID or hash)."""

	id: str
	filename: str
	content_type: str
	file_size: int
	status: DocumentStatus
	chunk_count: int
	error_code: str | None = None
	created_at: datetime
	updated_at: datetime

	@classmethod
	def from_document(cls, doc: Document) -> "DocumentOut":
		return cls(**doc.model_dump(exclude={"owner_id", "content_hash", "ingestion_version"}))


class Chunk(BaseModel):
	id: str
	document_id: str
	owner_id: str
	chunk_index: int
	text: str
	section: str | None = None
	page_number: int | None = None
	embedding_model: str
	ingestion_version: int = 1


class ScoredChunk(BaseModel):
	chunk: Chunk
	filename: str
	# Cosine similarity for vector hits; None when the chunk only matched by keyword.
	similarity: float | None = None
	keyword_rank: float | None = None
	fused_score: float = 0.0


class UploadResponse(BaseModel):
	success: Literal[True] = True
	document: DocumentOut
	duplicate: bool = False


class DocumentListResponse(BaseModel):
	success: Literal[True] = True
	documents: list[DocumentOut]


class SearchRequest(BaseModel):
	model_config = ConfigDict(str_strip_whitespace=True)

	query: str = Field(min_length=2, max_length=500)
	top_k: int = Field(default=5, ge=1, le=20)
	document_ids: list[UUID] | None = Field(default=None, max_length=20)


class SearchHit(BaseModel):
	chunk_id: str
	document_id: str
	filename: str
	chunk_index: int
	section: str | None
	page_number: int | None
	similarity: float | None
	score: float
	text: str


class SearchResponse(BaseModel):
	success: Literal[True] = True
	hits: list[SearchHit]
	relevant: bool
