"""Dependency wiring. Tests override these with FastAPI's dependency_overrides."""

import logging
from functools import lru_cache

from fastapi import Depends

from app.core.config import Settings, get_settings
from app.repositories.base import Repository
from app.repositories.memory import InMemoryRepository
from app.services.embeddings import Embedder, build_embedder
from app.services.events import EventPublisher, N8nWebhookPublisher, NullPublisher
from app.services.generation import GenerationService
from app.services.knowledge import KnowledgeService
from app.services.llm import LLMClient, build_llm
from app.services.reminders import ReminderService

logger = logging.getLogger("scriptai.deps")


@lru_cache
def _repository(database_url: str) -> Repository:
	if database_url:
		from app.repositories.postgres import PostgresRepository

		return PostgresRepository(database_url)
	logger.warning("DATABASE_URL not set: using the in-memory store (data is lost on restart)")
	return InMemoryRepository()


@lru_cache
def _llm() -> LLMClient:
	return build_llm(get_settings())


@lru_cache
def _embedder() -> Embedder:
	return build_embedder(get_settings())


@lru_cache
def _events() -> EventPublisher:
	settings = get_settings()
	if settings.n8n_events_url:
		return N8nWebhookPublisher(settings.n8n_events_url, settings.n8n_shared_secret)
	return NullPublisher()


def get_event_publisher() -> EventPublisher:
	return _events()


def get_repository(settings: Settings = Depends(get_settings)) -> Repository:
	return _repository(settings.database_url)


def get_llm() -> LLMClient:
	return _llm()


def get_embedder() -> Embedder:
	return _embedder()


def get_knowledge_service(
	repo: Repository = Depends(get_repository),
	embedder: Embedder = Depends(get_embedder),
	settings: Settings = Depends(get_settings),
) -> KnowledgeService:
	return KnowledgeService(repo, embedder, settings)


def get_generation_service(
	llm: LLMClient = Depends(get_llm),
	knowledge: KnowledgeService = Depends(get_knowledge_service),
	repo: Repository = Depends(get_repository),
	settings: Settings = Depends(get_settings),
) -> GenerationService:
	return GenerationService(llm, knowledge, repo, settings)


def get_reminder_service(
	repo: Repository = Depends(get_repository),
	settings: Settings = Depends(get_settings),
) -> ReminderService:
	return ReminderService(repo, settings)
