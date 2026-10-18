# Architecture Decision Records

Each record gives the decision, why it was made, and what it costs.

## ADR-001: n8n stays the gateway and automation hub; AI logic lives in FastAPI

- **Context:** In 1.0, an n8n workflow did everything: built the prompt, called OpenRouter, parsed JSON in JavaScript, and called the Python cleaner. The owner wants to keep n8n for automation (reminders and future features).
- **Decision:**
  - n8n keeps the public `/api/generate-script` webhook (`n8n/script-ai-generate.workflow.json`) and orchestrates **FastAPI → response**, with error branches and an "after response" automation hook.
  - FastAPI owns the AI logic: prompts, provider calls, RAG, validation, revision, auth, and quotas. That logic is code-reviewed and covered by tests in git.
  - FastAPI sends events back to n8n (`N8N_EVENTS_URL`) for automations.
  - Knowledge-base uploads go directly to FastAPI, because multipart uploads through webhooks are fragile.
  - **All email is sent by n8n**, which holds the SMTP or Gmail credentials, so FastAPI has no mail configuration.
- **Why not keep the LLM call in n8n?** RAG, citations, and the validate → revise loop need state and tests that are much easier to maintain in Python. n8n is strongest at integrations and scheduling.
- **Trade-off:** One more hop per generation (adds milliseconds). The user's JWT is forwarded through n8n. If n8n is down, the frontend can call FastAPI directly by leaving `VITE_N8N_WEBHOOK_URL` empty.

## ADR-001b: The cleaner runs inside FastAPI (the separate clean_service was removed)

- **Context:** `clean_service.py` was a separate service whose only job was cleaning AI output (emojis, stray quotes, markdown). FastAPI already ran the same code on every section.
- **Decision:**
  - Delete `clean_service.py` and the `/clean-script` endpoint.
  - The cleaner lives in `app/services/text_cleaner.py` and runs on every generation.
  - It removes emojis and unwanted quotes while keeping apostrophes, real quotes, and `[S1]` citations.
- **Why:** One less process, port, and network hop, with identical output. The cleaner is covered by unit tests.

## ADR-001c: Outbound events are fire-and-forget

- **Decision:**
  - FastAPI posts `generation.succeeded/failed` and `document.ingested/deleted` events to n8n on a background thread, with a short timeout and a shared secret header.
  - Events carry IDs, titles, statuses, and the user's email, never document text.
  - A slow or stopped n8n never affects user requests.
- **Trade-off:** No delivery guarantee or retries. If an automation later needs guaranteed delivery, add an outbox table.

## ADR-002: Supabase Postgres + pgvector instead of Qdrant

- **Context:** The plan proposed Qdrant plus a relational store. The frontend already uses Supabase.
- **Decision:** A single Postgres database with the `vector` extension holds documents, chunks (with embeddings and a generated `tsvector`), and generation records.
- **Why:** No extra paid service. Deletes are transactional and cascade. Row-level security gives per-user isolation. Full-text search makes hybrid retrieval possible, and SQL joins are available.
- **Trade-off:** HNSW indexes cap at 2000 dimensions, and specialized vector stores scale further. Neither matters at this project's size.

## ADR-003: Provider-agnostic LLM client chosen by environment variables

- **Decision:** `LLM_PROVIDER` can be `openai_compatible` (any `/chat/completions` API: Groq, OpenRouter, Gemini, DeepSeek, Ollama, OpenAI...), `anthropic`, or `fake`. The model, base URL, key, and cost per million tokens are all env vars.
- **Why:** The owner picks a model based on cost. A single raw `httpx` client avoids pulling in several SDKs.
- **Trade-off:** No provider-specific extras, such as Anthropic's native structured outputs. The JSON contract is enforced by the prompt, a parser, and one repair retry instead.

## ADR-004: Free embeddings; the dimension is pinned in both config and schema

- **Decision:** Embeddings use an `openai_compatible` endpoint (Gemini free tier or Ollama `nomic-embed-text`), `local` sentence-transformers, or `fake` hashing. `EMBEDDING_DIM` must equal `vector(N)` in the migration, and the client checks every vector's length.
- **Trade-off:** Changing models later means re-uploading documents. Each chunk records `embedding_model` and `ingestion_version`, so stale chunks can be detected.

## ADR-005: Hybrid retrieval with reciprocal rank fusion and a relevance gate

- **Decision:** Vector search and full-text search results are merged by RRF. A hit is kept only if similarity ≥ `RAG_MIN_SIMILARITY` or it covers at least 50% of the query terms.
- **Why:** Vector search misses exact names, SKUs, and prices, and keyword search misses paraphrases. The gate stops an unrelated brief from getting irrelevant "sources" (the eval's no-context cases cover this).
- **Evidence:** See [evaluation.md](evaluation.md). Adding the section title to each chunk raised offline Hit@5 from 71% to 94%.

## ADR-006: Deterministic validation before any LLM-as-judge

- **Decision:** Script checks are plain Python rules (length band, keywords, call to action, placeholders, citation integrity, tweet length), not a second model call.
- **Why:** It costs nothing, takes about a millisecond, is reproducible, and can be unit tested. The revision step is the only extra model call, and only assisted mode uses it.

## ADR-007: A bounded workflow instead of an autonomous agent (no LangGraph)

- **Decision:** A fixed state machine: `retrieve → draft → validate → (revise → validate)*`. The step budget (`MAX_AGENT_STEPS`), revision cap (`MAX_AGENT_REVISIONS`), and one JSON repair retry give a hard upper bound on calls per request.
- **Why:** The task has no branching, approvals, or resumable state that would justify a framework. The model never chooses tools, URLs, or actions, so there is nothing to exploit through prompt injection.
- **Revisit when:** human approval steps, publishing to external platforms, or long-running and resumable jobs are added.

## ADR-008: The quota tier comes from the verified token, not the request body

- **Decision:** The 1.0 `subscription` field is still accepted but ignored. The tier is read from the JWT's `app_metadata.subscription`, which only the service role can set, and limits are `QUOTA_BASIC/PRO/PREMIUM` per UTC day.
- **Why:** A client-supplied tier would let anyone give themselves premium.

## ADR-009: No raw file retention; generation records hold metadata only

- **Decision:** Uploaded files are processed in memory and discarded. `generations` stores no topic text and no script output.
- **Trade-off:** There is no server-side history or re-index-from-original. To re-index, the user uploads the file again; identical bytes are deduplicated by sha256.

## ADR-010: Email reminders are stored in Postgres and delivered by an n8n schedule (claim / complete)

- **Context:** Users want email reminders, such as "post this script tomorrow at 9", and scripts emailed to them.
- **Options considered:**
  - An n8n *Wait* node per reminder. **Rejected:** it can't be listed or cancelled, it hides state inside n8n executions, and long waits are fragile across restarts.
  - A Python scheduler. **Rejected:** it duplicates what n8n is for, and SMTP credentials would have to live in the backend.
- **Decision:**
  - Reminders are rows in `reminders`, which users create, list, and cancel through the API.
  - The n8n "Script-AI Reminders" workflow runs every minute. It claims due rows through `POST /api/internal/reminders/claim`, an atomic `UPDATE … FOR UPDATE SKIP LOCKED` that moves them to `processing`.
  - It then emails each one and reports `complete`. Failures go back to `pending`, up to 3 attempts. Claims stuck in `processing` for 15 minutes are retried.
- **Guarantees:** At-least-once delivery, never two overlapping sends for the same claim, timing within about a minute, and the recipient is always the owner's verified login email.

## ADR-011: Background generation uses FastAPI BackgroundTasks

- **Decision:** `POST /api/generate-script/background` checks the quota, returns 202 immediately, runs generation after the response is sent, and emails the result (or the failure) through n8n.
- **Trade-off:** The task runs in the API process, so a restart during generation loses that job; the user isn't emailed and can retry. A durable job queue (database or Redis) is the upgrade path if that becomes a problem.

