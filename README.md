# Script‑AI 2.0

A context-aware AI script studio. Describe a topic, platform, tone, and length. Optionally upload your brand guides or product docs. Script‑AI writes a platform-ready script **grounded in your documents, with source citations**, checks it against your constraints, and revises it when it falls short.

Live demo: [scripai.netlify.app](https://scripai.netlify.app/)

## What's new in 2.0

| Capability | How |
|---|---|
| **Any LLM, chosen by `.env`** | OpenAI-compatible APIs (Groq, OpenRouter, Gemini, DeepSeek, Ollama, OpenAI) or Anthropic Claude. Retries, timeouts, JSON repair, token and cost tracking. |
| **Knowledge base and RAG** | Upload TXT, MD or PDF → validation → chunking with section headers → embeddings → **hybrid search** (pgvector plus Postgres full-text, merged with reciprocal rank fusion) → cited sources `[S1]` |
| **Free embeddings** | Gemini free tier, Ollama (`nomic-embed-text`), or local sentence-transformers. No paid service required. |
| **Vector database** | Supabase Postgres + pgvector. Per-user isolation is enforced in every query **and** by row-level security. |
| **Bounded AI workflow** | *Assisted* mode: retrieve → draft → validate → revise (errors and off-target length). Step and revision budgets, keeps the best draft, falls back safely. |
| **Quality checks** | Rule-based validator: length band, required keywords, call to action, placeholders, citations that don't match any reference, tweet length |
| **Real auth** | Supabase Auth (email and password). The backend verifies the JWT. Daily quotas by tier. |
| **n8n automation** | Generation runs through an n8n gateway workflow (webhook → FastAPI → respond). FastAPI also sends events (`generation.succeeded`, `document.ingested`…) to n8n for reminders and notifications. |
| **Email features** | "Email me" for any script, **background generation** that emails the finished script, and **email reminders** (create, list, cancel; delivered by n8n with retries) |
| **Output cleaner** | Removes emojis, unwanted quotes and markdown from AI output (built into FastAPI) |
| **Observability** | Request IDs, structured JSON logs with secret redaction, per-step timings, token usage |
| **Evaluation** | 20-brief labeled dataset (including conflict, prompt-injection and no-context cases). Retrieval and generation metrics, run in CI. |
| **Production basics** | Health and readiness probes, Dockerfile, docker compose, GitHub Actions CI, refuses unsafe production config |

## Architecture

```
Browser ──Generate (JWT)──▶ n8n webhook ──▶ FastAPI ──▶ LLM (env-configured)
   │                           │               ├─ RAG: hybrid search over Supabase pgvector
   │                           │               ├─ validate → revise workflow, output cleaner
   │◀── script + sources ──────┘               └─ events ──▶ n8n ──▶ emails (script, failures)
   │
   ├──Knowledge base / reminders (JWT)──▶ FastAPI ──▶ Supabase (Auth + Postgres/pgvector)
   └── n8n Reminders workflow (every minute) ──claim/complete──▶ FastAPI ──▶ email
```

n8n stays the gateway and the email and automation hub (`n8n/` has 3 importable workflows). FastAPI holds the AI logic and cleans the output.

Details: [docs/architecture.md](docs/architecture.md) · design decisions: [docs/decisions.md](docs/decisions.md) · API: [docs/api.md](docs/api.md)

## Getting started

Prerequisites: Node.js 18+, Python 3.10+, n8n (desktop, `npx n8n`, or Docker), a free [Supabase](https://supabase.com) project, an LLM API key (e.g. OpenRouter), and [Ollama](https://ollama.com) for free local embeddings.

1. **Database.** Supabase → SQL Editor → run [`backend/migrations/001_init.sql`](backend/migrations/001_init.sql) (safe to re-run).
2. **Embeddings.** `ollama pull nomic-embed-text`
3. **Backend.**
   ```bash
   cd backend
   python -m venv .venv && source .venv/bin/activate   # Windows: .venv\Scriptsctivate
   pip install -r requirements-dev.txt
   cp .env.example .env     # fill LLM_API_KEY, DATABASE_URL (Session pooler), SUPABASE_URL, N8N_SHARED_SECRET
   uvicorn app.main:app --reload --port 8000
   ```
   `http://localhost:8000/api/ready` must report every check `ok`.
4. **n8n.** Import and configure the 3 workflows: [n8n/README.md](n8n/README.md).
5. **Frontend.**
   ```bash
   cd frontend
   cp .env.example .env.local   # VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY (publishable key)
   npm install
   npm run dev                  # http://localhost:8081
   ```

Where each Supabase value goes:

| Supabase value | Goes in |
|---|---|
| Project URL | `SUPABASE_URL` (backend) and `VITE_SUPABASE_URL` (frontend) |
| Publishable / anon key | `VITE_SUPABASE_ANON_KEY` (frontend only) |
| Session pooler connection string | `DATABASE_URL` (backend only) |
| Legacy JWT secret | `SUPABASE_JWT_SECRET`, **only** if the current signing key is legacy HS256 |
| Secret / service_role key | nowhere |

**Try it with no keys:** in `backend/.env`, set `LLM_PROVIDER=fake`, `EMBEDDING_PROVIDER=fake`, `DATABASE_URL=` (empty, which uses an in-memory store) and `AUTH_DISABLED=true`.

Variable reference: [`backend/.env.example`](backend/.env.example) · deployment, troubleshooting and rollback: [docs/operations.md](docs/operations.md)

## Tests and evaluation

```bash
cd backend
pytest                             # unit + integration tests, no API keys or network needed
ruff check .
python -m eval.run_eval            # offline evaluation report → eval/results/report.md
python -m eval.run_eval --live     # same dataset against your configured providers

cd ../frontend
npm run lint && npm run build
```

Postgres repository tests run when `TEST_DATABASE_URL` points to a disposable pgvector database. CI provides one.

Offline baseline: retrieval Hit@5 **94%**, MRR **0.94**, and **100%** of unrelated briefs correctly get no sources. See [docs/evaluation.md](docs/evaluation.md) for the method, the limits, and how to record live results.

## Project layout

```
.
├── backend/                 FastAPI service (Docker image, deployed to Render)
│   ├── app/
│   │   ├── api/             routes: generation (+email, background), knowledge, reminders, health
│   │   ├── core/            config, auth, errors, logging
│   │   ├── services/        llm, embeddings, prompts, agent_workflow, validation, text_cleaner,
│   │   │                    knowledge, document_ingestion, events, reminders
│   │   ├── repositories/    memory (dev/tests) and postgres (pgvector)
│   │   └── schemas/         pydantic request/response models
│   ├── migrations/          001_init.sql (tables, indexes, RLS)
│   ├── eval/                corpus, dataset.json, run_eval.py, results/
│   ├── tests/               unit/, integration/
│   ├── Dockerfile
│   └── pyproject.toml       ruff + pytest config
├── frontend/                React + Vite + Tailwind (deployed to Netlify)
│   └── src/                 pages/, components/, contexts/ (auth), lib/api.ts (typed client)
├── n8n/                     importable workflows + setup (README.md)
├── docs/                    architecture, decisions (ADRs), api, evaluation, operations
├── .github/workflows/ci.yml lint, tests, eval, frontend build, Docker smoke test
├── docker-compose.yml       local Postgres (pgvector) + API
└── netlify.toml             frontend build + SPA routing
```

## Security and privacy

- Provider keys live only in the backend environment, never in `VITE_*` variables.
- Each user can see only their own documents, chunks and quota. Cross-user access is covered by tests.
- Uploaded files are validated by content, processed in memory, and not stored. Deleting a document deletes its chunks.
- Retrieved text is passed to the model as delimited data, never as instructions. The model can't choose tools or actions.
- Logs redact keys, tokens and database URLs, and never contain prompts or document text.

## Limitations

- The evaluation dataset is small (20 briefs) and hand-labeled. Use it for regression tests, not as a benchmark.
- Length checks count words. Writing quality still needs human review.
- There is no server-side script history (by design, for privacy) and no OCR for scanned PDFs.

This is an educational and portfolio project.
