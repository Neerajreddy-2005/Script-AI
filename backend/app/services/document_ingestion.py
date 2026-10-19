"""Upload validation, text extraction, and chunking. Uploaded files are untrusted input."""

import hashlib
import io
import logging
import os
import re
import unicodedata
from dataclasses import dataclass

from app.core.errors import PayloadTooLargeError, UnprocessableError, UnsupportedMediaError

logger = logging.getLogger("scriptai.ingestion")

ALLOWED_TYPES = {".txt": "text/plain", ".md": "text/markdown", ".pdf": "application/pdf"}
MAX_PDF_PAGES = 300


@dataclass
class Page:
	page_number: int | None  # None for formats without pages
	text: str


@dataclass
class ChunkDraft:
	chunk_index: int
	text: str
	section: str | None
	page_number: int | None


@dataclass
class ValidatedUpload:
	filename: str
	extension: str
	content_type: str
	data: bytes
	content_hash: str


def safe_filename(name: str | None) -> str:
	base = os.path.basename((name or "").replace("\\", "/"))
	base = "".join(ch for ch in base if unicodedata.category(ch)[0] != "C").strip()
	return base[:200] or "document"


def validate_upload(filename: str | None, data: bytes, max_bytes: int) -> ValidatedUpload:
	name = safe_filename(filename)
	ext = os.path.splitext(name)[1].lower()
	if ext not in ALLOWED_TYPES:
		raise UnsupportedMediaError(f"Only {', '.join(sorted(ALLOWED_TYPES))} files are supported.")
	if not data:
		raise UnprocessableError("The uploaded file is empty.", "empty_file")
	if len(data) > max_bytes:
		raise PayloadTooLargeError(f"Files must be at most {max_bytes // (1024 * 1024)} MB.")
	# Check the actual bytes, not just the extension or declared MIME type.
	if ext == ".pdf":
		if not data.startswith(b"%PDF-"):
			raise UnsupportedMediaError("The file content is not a valid PDF.", "content_type_mismatch")
	else:
		if b"\x00" in data:
			raise UnsupportedMediaError("The file looks binary, not text.", "content_type_mismatch")
		try:
			data.decode("utf-8-sig")
		except UnicodeDecodeError as exc:
			raise UnprocessableError("Text files must be UTF-8 encoded.", "invalid_encoding") from exc
	return ValidatedUpload(
		filename=name,
		extension=ext,
		content_type=ALLOWED_TYPES[ext],
		data=data,
		content_hash=hashlib.sha256(data).hexdigest(),
	)


def normalize_text(text: str) -> str:
	text = text.replace("\r\n", "\n").replace("\r", "\n")
	text = "".join(ch for ch in text if ch in "\n\t" or unicodedata.category(ch)[0] != "C")
	text = re.sub(r"(\w)-\n(\w)", r"\1\2", text)  # re-join words hyphenated across lines
	text = re.sub(r"[ \t]+", " ", text)
	text = re.sub(r" *\n *", "\n", text)
	text = re.sub(r"\n{3,}", "\n\n", text)
	return text.strip()


def extract_pages(upload: ValidatedUpload) -> list[Page]:
	if upload.extension == ".pdf":
		pages = _extract_pdf(upload.data)
	else:
		pages = [Page(None, normalize_text(upload.data.decode("utf-8-sig")))]
	pages = [p for p in pages if p.text]
	if not pages:
		raise UnprocessableError(
			"No readable text was found. Scanned PDFs need OCR before upload.", "no_extractable_text"
		)
	return pages


def _extract_pdf(data: bytes) -> list[Page]:
	from pypdf import PdfReader
	from pypdf.errors import PdfReadError

	try:
		reader = PdfReader(io.BytesIO(data))
		if reader.is_encrypted and not reader.decrypt(""):
			raise UnprocessableError("Password-protected PDFs are not supported.", "encrypted_pdf")
		if len(reader.pages) > MAX_PDF_PAGES:
			raise UnprocessableError(f"PDFs may have at most {MAX_PDF_PAGES} pages.", "too_many_pages")
		return [Page(i + 1, normalize_text(page.extract_text() or "")) for i, page in enumerate(reader.pages)]
	except UnprocessableError:
		raise
	except (PdfReadError, ValueError, KeyError, TypeError, OSError) as exc:
		raise UnprocessableError("The PDF could not be read.", "unreadable_file") from exc


_HEADING = re.compile(r"^#{1,6}\s+(.+)$")
_SENTENCE_END = re.compile(r"(?<=[.!?])\s+")


def _split_long(paragraph: str, size: int) -> list[str]:
	"""Split an oversized paragraph on sentence boundaries, then on words as a last resort."""
	pieces: list[str] = []
	current = ""
	for sentence in _SENTENCE_END.split(paragraph):
		while len(sentence) > size:
			cut = sentence.rfind(" ", 0, size)
			cut = cut if cut > size // 2 else size
			pieces.append((current + " " + sentence[:cut]).strip() if current else sentence[:cut].strip())
			current = ""
			sentence = sentence[cut:].strip()
		if current and len(current) + 1 + len(sentence) > size:
			pieces.append(current)
			current = sentence
		else:
			current = f"{current} {sentence}".strip()
	if current:
		pieces.append(current)
	return pieces


def _tail(text: str, overlap: int) -> str:
	if overlap <= 0 or len(text) <= overlap:
		return ""
	tail = text[-overlap:]
	space = tail.find(" ")
	return tail[space + 1 :] if 0 <= space < len(tail) - 1 else tail


def chunk_pages(pages: list[Page], size: int = 1200, overlap: int = 200) -> list[ChunkDraft]:
	"""Greedy paragraph packing. Chunks never cross a page or heading boundary, so the
	page/section reported in a source reference is always accurate. Overlap is only
	added between chunks of the same section."""
	chunks: list[ChunkDraft] = []
	section: str | None = None

	def emit(buffer: str, page_number: int | None) -> None:
		text = buffer.strip()
		if text:
			# Contextual header: the section title is part of the indexed text, so a chunk under
			# "# Shipping" is findable by "shipping" even if its body never repeats the word.
			if section and not text.startswith(section):
				text = f"{section}\n{text}"
			chunks.append(ChunkDraft(len(chunks), text, section, page_number))

	for page in pages:
		buffer = ""
		for paragraph in page.text.split("\n\n"):
			paragraph = paragraph.strip()
			if not paragraph:
				continue
			first_line = paragraph.split("\n", 1)[0]
			heading = _HEADING.match(first_line)
			if heading:
				emit(buffer, page.page_number)
				buffer = ""
				section = heading.group(1).strip()[:200]
				paragraph = paragraph.split("\n", 1)[1].strip() if "\n" in paragraph else ""
				if not paragraph:
					continue
			for piece in _split_long(paragraph, size) if len(paragraph) > size else [paragraph]:
				if buffer and len(buffer) + 2 + len(piece) > size:
					emit(buffer, page.page_number)
					carry = _tail(buffer.strip(), overlap)
					buffer = f"{carry}\n\n{piece}" if carry else piece
				else:
					buffer = f"{buffer}\n\n{piece}" if buffer else piece
		emit(buffer, page.page_number)
	return chunks
