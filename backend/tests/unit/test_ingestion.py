import pytest

from app.core.errors import PayloadTooLargeError, UnprocessableError, UnsupportedMediaError
from app.services.document_ingestion import (
	Page,
	chunk_pages,
	extract_pages,
	normalize_text,
	safe_filename,
	validate_upload,
)
from tests.conftest import make_pdf

MB = 1024 * 1024


class TestValidateUpload:
	def test_accepts_text(self):
		up = validate_upload("notes.txt", b"hello world", MB)
		assert up.content_type == "text/plain"
		assert len(up.content_hash) == 64

	def test_rejects_unknown_extension(self):
		with pytest.raises(UnsupportedMediaError):
			validate_upload("run.exe", b"MZ...", MB)

	def test_rejects_empty(self):
		with pytest.raises(UnprocessableError) as exc:
			validate_upload("a.txt", b"", MB)
		assert exc.value.code == "empty_file"

	def test_rejects_oversized(self):
		with pytest.raises(PayloadTooLargeError):
			validate_upload("a.txt", b"x" * (MB + 1), MB)

	def test_rejects_pdf_extension_with_wrong_bytes(self):
		with pytest.raises(UnsupportedMediaError) as exc:
			validate_upload("fake.pdf", b"just text", MB)
		assert exc.value.code == "content_type_mismatch"

	def test_rejects_binary_disguised_as_text(self):
		with pytest.raises(UnsupportedMediaError):
			validate_upload("a.md", b"abc\x00\x01def", MB)

	def test_rejects_non_utf8_text(self):
		with pytest.raises(UnprocessableError) as exc:
			validate_upload("a.txt", "café".encode("latin-1"), MB)
		assert exc.value.code == "invalid_encoding"

	def test_filename_is_sanitized(self):
		assert safe_filename("../../etc/passwd.txt") == "passwd.txt"
		assert safe_filename("C:\\Users\\x\\brief.md") == "brief.md"
		assert safe_filename("bad\x00name.txt") == "badname.txt"
		assert safe_filename("") == "document"


class TestExtraction:
	def test_pdf_pages_are_numbered(self):
		up = validate_upload("guide.pdf", make_pdf(["First page text", "Second page text"]), MB)
		pages = extract_pages(up)
		assert [p.page_number for p in pages] == [1, 2]
		assert "Second page" in pages[1].text

	def test_corrupt_pdf_fails_safely(self):
		up = validate_upload("broken.pdf", b"%PDF-1.4\nnot really a pdf", MB)
		with pytest.raises(UnprocessableError):
			extract_pages(up)

	def test_whitespace_only_text_has_no_extractable_text(self):
		up = validate_upload("blank.txt", b"   \n\n  \t ", MB)
		with pytest.raises(UnprocessableError) as exc:
			extract_pages(up)
		assert exc.value.code == "no_extractable_text"

	def test_normalize_text(self):
		assert normalize_text("multi-\nline  text\r\n\r\n\r\n\r\nnext") == "multiline text\n\nnext"


class TestChunking:
	def test_small_text_is_one_chunk(self):
		chunks = chunk_pages([Page(None, "Short paragraph.")], size=200, overlap=20)
		assert len(chunks) == 1
		assert chunks[0].chunk_index == 0

	def test_respects_size_and_overlap(self):
		paragraphs = "\n\n".join(f"Paragraph {i} " + "word " * 30 for i in range(10))
		chunks = chunk_pages([Page(None, paragraphs)], size=400, overlap=60)
		assert len(chunks) > 2
		assert all(len(c.text) <= 400 + 60 + 2 for c in chunks)
		# Consecutive chunks in the same section share overlapping text.
		assert chunks[0].text[-30:].split()[-1] in chunks[1].text

	def test_headings_set_section_and_split_chunks(self):
		text = "# Pricing\nOur plan costs 5 dollars.\n\n# Support\nEmail us any time."
		chunks = chunk_pages([Page(None, text)], size=500, overlap=50)
		# The section title is prepended so it is searchable (contextual chunk header).
		assert [(c.section, c.text) for c in chunks] == [
			("Pricing", "Pricing\nOur plan costs 5 dollars."),
			("Support", "Support\nEmail us any time."),
		]

	def test_chunks_do_not_cross_pages(self):
		chunks = chunk_pages([Page(1, "alpha text"), Page(2, "beta text")], size=500, overlap=50)
		assert [(c.page_number, c.text) for c in chunks] == [(1, "alpha text"), (2, "beta text")]

	def test_long_paragraph_without_breaks_is_split(self):
		chunks = chunk_pages([Page(None, "x" * 1000)], size=300, overlap=0)
		assert len(chunks) >= 3
		assert all(len(c.text) <= 300 for c in chunks)

	def test_indexes_are_sequential(self):
		text = "\n\n".join("p " * 100 for _ in range(5))
		chunks = chunk_pages([Page(None, text)], size=250, overlap=30)
		assert [c.chunk_index for c in chunks] == list(range(len(chunks)))
