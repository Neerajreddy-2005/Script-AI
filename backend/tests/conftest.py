import time
from collections.abc import Callable

import jwt
import pytest
from fastapi.testclient import TestClient

from app.core.config import Settings, get_settings
from app.deps import get_embedder, get_event_publisher, get_llm, get_repository
from app.main import create_app
from app.repositories.memory import InMemoryRepository
from app.services.embeddings import HashEmbedder
from app.services.llm import FakeLLM

JWT_SECRET = "test-jwt-secret-at-least-32-characters-long"
USER_A = "11111111-1111-1111-1111-111111111111"
USER_B = "22222222-2222-2222-2222-222222222222"
N8N_SECRET = "test-n8n-shared-secret-123"


def make_settings(**overrides) -> Settings:
	base = dict(
		_env_file=None,
		app_env="test",
		auth_disabled=False,
		supabase_jwt_secret=JWT_SECRET,
		llm_provider="fake",
		embedding_provider="fake",
		embedding_dim=256,
		database_url="",
		chunk_size=400,
		chunk_overlap=60,
		quota_basic=3,
		n8n_shared_secret=N8N_SECRET,
	)
	base.update(overrides)
	return Settings(**base)


def make_token(sub: str, tier: str = "basic", secret: str = JWT_SECRET, exp_in: int = 3600, **claims) -> str:
	payload = {
		"sub": sub,
		"aud": "authenticated",
		"exp": int(time.time()) + exp_in,
		"email": f"{sub[:4]}@example.com",
		"app_metadata": {"subscription": tier},
		**claims,
	}
	return jwt.encode(payload, secret, algorithm="HS256")


def auth(sub: str = USER_A, tier: str = "basic") -> dict[str, str]:
	return {"Authorization": f"Bearer {make_token(sub, tier)}"}


def make_pdf(pages: list[str]) -> bytes:
	"""Build a tiny valid PDF with one line of text per page (no PDF library needed)."""
	objects: list[bytes] = []
	page_ids = [4 + 2 * i for i in range(len(pages))]
	objects.append(b"<< /Type /Catalog /Pages 2 0 R >>")
	kids = " ".join(f"{pid} 0 R" for pid in page_ids)
	objects.append(f"<< /Type /Pages /Kids [{kids}] /Count {len(pages)} >>".encode())
	objects.append(b"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>")
	for i, text in enumerate(pages):
		content_id = page_ids[i] + 1
		objects.append(
			f"<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 3 0 R >> >> "
			f"/Contents {content_id} 0 R >>".encode()
		)
		safe = text.replace("\\", "\\\\").replace("(", "\\(").replace(")", "\\)")
		stream = f"BT /F1 12 Tf 72 720 Td ({safe}) Tj ET".encode()
		objects.append(b"<< /Length %d >>\nstream\n" % len(stream) + stream + b"\nendstream")
	out = bytearray(b"%PDF-1.4\n")
	offsets = []
	for n, obj in enumerate(objects, start=1):
		offsets.append(len(out))
		out += f"{n} 0 obj\n".encode() + obj + b"\nendobj\n"
	xref = len(out)
	out += f"xref\n0 {len(objects) + 1}\n0000000000 65535 f \n".encode()
	for off in offsets:
		out += f"{off:010d} 00000 n \n".encode()
	out += f"trailer\n<< /Size {len(objects) + 1} /Root 1 0 R >>\nstartxref\n{xref}\n%%EOF\n".encode()
	return bytes(out)


@pytest.fixture
def settings() -> Settings:
	return make_settings()


@pytest.fixture
def repo() -> InMemoryRepository:
	return InMemoryRepository()


@pytest.fixture
def fake_llm() -> FakeLLM:
	return FakeLLM()


@pytest.fixture
def embedder(settings) -> HashEmbedder:
	return HashEmbedder(settings.embedding_dim)


class RecordingPublisher:
	enabled = True

	def __init__(self):
		self.events: list[tuple[str, str, dict]] = []

	def publish(self, event, user, data):
		self.events.append((event, user.id, data))

	def names(self) -> list[str]:
		return [e[0] for e in self.events]


@pytest.fixture
def events() -> RecordingPublisher:
	return RecordingPublisher()


@pytest.fixture
def make_client(repo, embedder, events) -> Callable[..., TestClient]:
	clients = []

	def factory(llm=None, settings: Settings | None = None) -> TestClient:
		app = create_app()
		cfg = settings or make_settings()
		app.dependency_overrides[get_settings] = lambda: cfg
		app.dependency_overrides[get_repository] = lambda: repo
		app.dependency_overrides[get_embedder] = lambda: embedder
		app.dependency_overrides[get_llm] = lambda: llm or FakeLLM()
		app.dependency_overrides[get_event_publisher] = lambda: events
		client = TestClient(app, raise_server_exceptions=False)
		clients.append(client)
		return client

	yield factory
	for c in clients:
		c.close()


@pytest.fixture
def client(make_client) -> TestClient:
	return make_client()


BRIEF = {
	"topic": "Cold brew coffee at home",
	"platform": "YouTube",
	"tone": "Casual",
	"length": "Short (2-3 min)",
}
