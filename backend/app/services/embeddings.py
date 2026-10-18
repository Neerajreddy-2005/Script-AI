"""Embedding providers. All options are usable at zero cost:

- openai_compatible: any `/embeddings` endpoint (Gemini free tier, Ollama `nomic-embed-text`,
  Mistral, Jina, OpenAI...).
- local: sentence-transformers on CPU (`pip install -r requirements-local.txt`).
- fake: deterministic hashed bag-of-words; for tests, CI, and the offline eval baseline.
"""

import hashlib
import math
import re
from typing import Protocol

import httpx

from app.core.config import Settings
from app.core.errors import ProviderError, ServiceUnavailableError
from app.services.http import post_json


class Embedder(Protocol):
	model: str
	dim: int

	def embed(self, texts: list[str]) -> list[list[float]]: ...


def _check_dims(vectors: list[list[float]], dim: int) -> list[list[float]]:
	for v in vectors:
		if len(v) != dim:
			raise ProviderError(
				f"Embedding size {len(v)} does not match EMBEDDING_DIM={dim}. "
				"Update EMBEDDING_DIM and the vector(N) column together.",
				"embedding_dim_mismatch",
			)
	return vectors


class OpenAICompatibleEmbedder:
	def __init__(self, settings: Settings, client: httpx.Client | None = None):
		if not settings.embedding_model or not settings.embedding_base_url:
			raise ServiceUnavailableError("EMBEDDING_MODEL and EMBEDDING_BASE_URL must be configured.", "embeddings_not_configured")
		self.settings = settings
		self.model = settings.embedding_model
		self.dim = settings.embedding_dim
		self.client = client or httpx.Client()

	def embed(self, texts: list[str]) -> list[list[float]]:
		s = self.settings
		headers = {"Content-Type": "application/json"}
		if s.embedding_api_key:
			headers["Authorization"] = f"Bearer {s.embedding_api_key}"
		vectors: list[list[float]] = []
		for start in range(0, len(texts), s.embedding_batch_size):
			batch = texts[start : start + s.embedding_batch_size]
			payload: dict = {"model": self.model, "input": batch}
			if s.embedding_send_dimensions:
				payload["dimensions"] = self.dim
			body = post_json(
				self.client,
				f"{s.embedding_base_url.rstrip('/')}/embeddings",
				headers=headers,
				payload=payload,
				timeout=s.embedding_timeout_seconds,
				max_retries=2,
				provider="embeddings",
			)
			try:
				items = sorted(body["data"], key=lambda d: d.get("index", 0))
				vectors.extend([list(map(float, d["embedding"])) for d in items])
			except (KeyError, TypeError, ValueError) as exc:
				raise ProviderError("The embedding provider returned an unexpected response.", "provider_bad_response") from exc
		if len(vectors) != len(texts):
			raise ProviderError("The embedding provider returned the wrong number of vectors.", "provider_bad_response")
		return _check_dims(vectors, self.dim)


class LocalEmbedder:
	def __init__(self, settings: Settings):
		try:
			from sentence_transformers import SentenceTransformer
		except ImportError as exc:  # optional heavy dependency
			raise ServiceUnavailableError(
				"EMBEDDING_PROVIDER=local requires `pip install -r requirements-local.txt`.",
				"embeddings_not_configured",
			) from exc
		self.model = settings.embedding_model or "sentence-transformers/all-MiniLM-L6-v2"
		self.dim = settings.embedding_dim
		self._model = SentenceTransformer(self.model)

	def embed(self, texts: list[str]) -> list[list[float]]:
		vectors = self._model.encode(texts, normalize_embeddings=True, convert_to_numpy=True)
		return _check_dims([v.tolist() for v in vectors], self.dim)


_STOPWORDS = set(
	"a an and are as at be by for from has have how i in is it its of on or our that the this to was "
	"we what when where which who why will with you your".split()
)


def stem(word: str) -> str:
	"""Tiny suffix stripper so "shipping"/"ships"/"ship" and "times"/"time" match.
	Not a real stemmer; it only needs to be consistent between queries and documents."""
	if len(word) <= 4:
		return word
	if word.endswith("ies"):
		return word[:-3] + "y"
	if word.endswith(("sses", "xes", "ches", "shes", "zes")):
		return word[:-2]
	for suffix in ("ing", "ed"):
		if word.endswith(suffix) and len(word) - len(suffix) >= 3:
			word = word[: -len(suffix)]
			if len(word) > 2 and word[-1] == word[-2] and word[-1] not in "lsz":
				word = word[:-1]  # shipp -> ship, stopp -> stop
			return word.rstrip("e")
	if word.endswith("s") and not word.endswith(("ss", "us", "is")):
		word = word[:-1]
	return word.rstrip("e") if len(word) > 4 else word


def tokenize(text: str) -> list[str]:
	return [stem(raw) for raw in re.findall(r"[a-z0-9]+", text.lower()) if raw not in _STOPWORDS and len(raw) >= 2]


class HashEmbedder:
	"""Feature-hashed bag of words. Captures lexical overlap only, never semantics."""

	model = "fake-hash-embedding"

	def __init__(self, dim: int = 768):
		self.dim = dim

	def embed(self, texts: list[str]) -> list[list[float]]:
		return [self._embed_one(t) for t in texts]

	def _embed_one(self, text: str) -> list[float]:
		vec = [0.0] * self.dim
		for token in tokenize(text):
			digest = hashlib.md5(token.encode()).digest()
			idx = int.from_bytes(digest[:4], "little") % self.dim
			vec[idx] += 1.0 if digest[4] & 1 else -1.0
		norm = math.sqrt(sum(x * x for x in vec)) or 1.0
		return [x / norm for x in vec]


def build_embedder(settings: Settings) -> Embedder:
	if settings.embedding_provider == "openai_compatible":
		return OpenAICompatibleEmbedder(settings)
	if settings.embedding_provider == "local":
		return LocalEmbedder(settings)
	return HashEmbedder(settings.embedding_dim)


def cosine(a: list[float], b: list[float]) -> float:
	dot = sum(x * y for x, y in zip(a, b, strict=False))
	na = math.sqrt(sum(x * x for x in a))
	nb = math.sqrt(sum(y * y for y in b))
	return dot / (na * nb) if na and nb else 0.0
