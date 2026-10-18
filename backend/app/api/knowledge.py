from uuid import UUID

from fastapi import APIRouter, Depends, File, Request, UploadFile, status
from starlette.concurrency import run_in_threadpool

from app.core.auth import CurrentUser, get_current_user
from app.core.config import Settings, get_settings
from app.core.errors import PayloadTooLargeError
from app.deps import get_event_publisher, get_knowledge_service
from app.schemas.knowledge import (
	DocumentListResponse,
	DocumentOut,
	SearchHit,
	SearchRequest,
	SearchResponse,
	UploadResponse,
)
from app.services.events import EventPublisher
from app.services.knowledge import KnowledgeService

router = APIRouter(prefix="/api/knowledge", tags=["knowledge"])


@router.post("/documents", response_model=UploadResponse, status_code=status.HTTP_201_CREATED)
async def upload_document(
	request: Request,
	file: UploadFile = File(...),
	user: CurrentUser = Depends(get_current_user),
	service: KnowledgeService = Depends(get_knowledge_service),
	settings: Settings = Depends(get_settings),
	events: EventPublisher = Depends(get_event_publisher),
) -> UploadResponse:
	declared = request.headers.get("content-length")
	if declared and declared.isdigit() and int(declared) > settings.max_upload_bytes + 64 * 1024:
		raise PayloadTooLargeError()
	# Read at most limit+1 bytes so an oversized upload is rejected without buffering it all.
	data = await file.read(settings.max_upload_bytes + 1)
	doc, duplicate = await run_in_threadpool(service.upload, user.id, file.filename, data)
	if not duplicate:
		events.publish("document.ingested", user, {"document_id": doc.id, "filename": doc.filename, "chunk_count": doc.chunk_count})
	return UploadResponse(document=DocumentOut.from_document(doc), duplicate=duplicate)


@router.get("/documents", response_model=DocumentListResponse)
def list_documents(
	user: CurrentUser = Depends(get_current_user),
	service: KnowledgeService = Depends(get_knowledge_service),
) -> DocumentListResponse:
	return DocumentListResponse(documents=[DocumentOut.from_document(d) for d in service.list_documents(user.id)])


@router.get("/documents/{document_id}", response_model=DocumentOut)
def get_document(
	document_id: UUID,
	user: CurrentUser = Depends(get_current_user),
	service: KnowledgeService = Depends(get_knowledge_service),
) -> DocumentOut:
	return DocumentOut.from_document(service.get_document(user.id, str(document_id)))


@router.delete("/documents/{document_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_document(
	document_id: UUID,
	user: CurrentUser = Depends(get_current_user),
	service: KnowledgeService = Depends(get_knowledge_service),
	events: EventPublisher = Depends(get_event_publisher),
) -> None:
	service.delete_document(user.id, str(document_id))
	events.publish("document.deleted", user, {"document_id": str(document_id)})


@router.post("/search", response_model=SearchResponse)
def search(
	req: SearchRequest,
	user: CurrentUser = Depends(get_current_user),
	service: KnowledgeService = Depends(get_knowledge_service),
) -> SearchResponse:
	"""Inspect retrieval on its own: useful for tuning RAG_MIN_SIMILARITY and chunking."""
	doc_ids = [str(d) for d in req.document_ids] if req.document_ids else None
	result = service.retrieve(user.id, req.query, req.top_k, doc_ids)
	return SearchResponse(
		hits=[
			SearchHit(
				chunk_id=h.chunk.id,
				document_id=h.chunk.document_id,
				filename=h.filename,
				chunk_index=h.chunk.chunk_index,
				section=h.chunk.section,
				page_number=h.chunk.page_number,
				similarity=round(h.similarity, 4) if h.similarity is not None else None,
				score=round(h.fused_score, 5),
				text=h.chunk.text,
			)
			for h in result.chunks
		],
		relevant=result.relevant,
	)
