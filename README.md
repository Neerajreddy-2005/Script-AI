# ScriptAI: AI scriptwriter for creators

[![CI](https://github.com/Neerajreddy-2005/Script-AI/actions/workflows/ci.yml/badge.svg)](https://github.com/Neerajreddy-2005/Script-AI/actions/workflows/ci.yml)

**Live website: [https://scripai.netlify.app](https://scripai.netlify.app)**
· API health: [script-ai-api.onrender.com/api/ready](https://script-ai-api.onrender.com/api/ready)

ScriptAI turns a one-line idea into a platform-ready script for YouTube, TikTok, Instagram, LinkedIn, X or a podcast. It can ground the script in your own brand documents with **source citations**, check and revise its own draft, **read the script aloud**, email it to you, and remind you when it's time to record.

> The backend runs on Render's free plan. After 15 idle minutes the first request takes about 50 seconds while the server wakes up; requests after that are fast.

---

## Highlights

- **Full-stack AI product, live in production.** React + TypeScript frontend (Netlify), FastAPI backend in Docker (Render), Supabase Postgres + pgvector + Auth, n8n automations.
- **Retrieval-augmented generation (RAG).** Hybrid search (pgvector similarity + Postgres full-text, merged with reciprocal rank fusion). On a labeled 20-brief evaluation set: **Hit@5 94%, MRR 0.94, 100% correct "no sources" on unrelated topics**.
- **Self-checking AI workflow.** Assisted mode drafts, validates (length, keywords, CTA, citations) and revises within a fixed budget.
- **151 automated tests** (unit + integration, plus Postgres tests in CI), an offline evaluation harness, and a 3-job CI pipeline that gates every pull request.
- **Measured frontend performance work:** main JS bundle **−13%** (gzip), largest paint **−10%**, Lighthouse accessibility **94 → 100**, desktop performance **97**.
- **Security by default.** JWT verification, per-user isolation in every query **and** Postgres row-level security, secrets never in the browser, log redaction.

## Features

| Feature | What it does |
|---|---|
| **Script generation** | Topic, platform, tone (6), length (2 to 20+ min), audience, keywords and CTA → a structured script with intro, main content and conclusion |
| **Brand knowledge base** | Upload PDF, Markdown or text. Scripts use your facts and cite them as `[S1]`, `[S2]`; you choose which documents to use |
| **Assisted mode** | Quality checks plus automatic revision before you see the draft; insights panel shows checks, sources, steps and timings |
| **Voice generation** | Listen to the full script or one section with your browser's voices; choose the voice, speed and pitch. Free, runs in the browser |
| **Email and background runs** | "Email me" sends any script; "Generate in background" emails the result so you can close the tab |
| **Reminders** | Schedule an email reminder to record or post |
| **Accounts** | Sign up, log in, password reset (Supabase Auth); daily quotas by tier |
| **Modern UI** | Responsive design with clear "liquid glass" surfaces, WCAG AA colour contrast, reduced-motion and reduced-transparency support |

## Tech stack

| Layer | Technology |
|---|---|
| Frontend | React 18, TypeScript, Vite, Tailwind CSS, TanStack Query, React Router, Web Speech API |
| Backend | Python, FastAPI, Pydantic, httpx, Docker |
| AI | Any OpenAI-compatible LLM or Anthropic, chosen in `.env` (production: `openai/gpt-4o-mini` via OpenRouter); Gemini `gemini-embedding-001` embeddings (768 dims) |
| Data and auth | Supabase Postgres + pgvector, full-text search, row-level security, Supabase Auth (JWT) |
| Automation | n8n (Docker) for emails and reminders, exposed with an ngrok static domain |
| Hosting | Netlify (frontend), Render (backend, Blueprint), Supabase (database) |
| Quality | pytest, ruff, ESLint, `tsc`, GitHub Actions, Lighthouse, WCAG contrast checker |

## Architecture (production)

```
                         https://scripai.netlify.app
Browser (React) ───────────────────────────────────────────────┐
  │  login / sign-up ──────────▶ Supabase Auth ── JWT ─────────┤
  │                                                            ▼
  │  generate / knowledge / reminders (JWT) ──▶ FastAPI on Render (Docker)
  │                                               ├─ LLM (OpenRouter, env-configured)
  │◀── script + sources ──────────────────────────├─ RAG: hybrid search on Supabase pgvector
  │                                               ├─ validate → revise workflow, output cleaner
  │  voice: Web Speech API (in the browser)       └─ events (shared secret) ──▶ n8n
  │                                                                              │ via ngrok static domain
  └────────────────────────── emails (script, reminders) ◀── n8n in Docker ──────┘
                                                             (claims due reminders every minute)
```

FastAPI owns all AI logic and data access; the browser never sees provider keys. n8n is the email and automation hub. Details: [docs/architecture.md](docs/architecture.md) · decisions (ADRs): [docs/decisions.md](docs/decisions.md) · API: [docs/api.md](docs/api.md)

---

## How it was built (development lifecycle)

### 1. Requirements

Gathered and fixed before building 2.0:

- **Functional:** platform-aware script generation; grounding in user documents with citations; quality checks; email delivery, background generation and reminders; real accounts with per-user data; later, voice playback and a 2026 redesign.
- **Constraints:** **zero paid infrastructure** (student project), so free tiers only and free embeddings; the LLM provider and model must be swappable from `.env`; keep n8n for automations; fewer services and environment variables.
- **Non-functional:** per-user isolation, no secrets in the browser, observable failures (request IDs, structured logs), safe production config, accessible UI.

### 2. Design

- Architecture and trade-offs recorded as ADRs ([docs/decisions.md](docs/decisions.md)): e.g. moving output cleaning into FastAPI (one less service), hybrid retrieval over pure vector search, bounded agent loop instead of open-ended tools.
- Database schema with indexes and row-level security ([backend/migrations/001_init.sql](backend/migrations/001_init.sql)).
- UI design system as tokens (colour roles, type, radius, shadows), every text/background pair checked for WCAG AA.

### 3. Development

| Phase | Work |
|---|---|
| 1.0 | React frontend, n8n webhook calling a separate cleaning service, mock fallbacks |
| 2.0 backend | FastAPI rewrite: env-configurable LLM layer (retries, timeouts, JSON repair, token tracking), document ingestion and chunking, hybrid RAG, validator and revise loop, Supabase Auth, quotas, n8n events, email and reminders; removed the extra cleaning service and mock fallbacks |
| Deployment | Docker image, Render Blueprint, Netlify config, CI pipeline |
| 2026 redesign | Every page redesigned; clear liquid-glass UI; voice generation; honest feature copy (removed features that didn't exist, such as thumbnails) |
| Performance and cleanup | Lighthouse-driven fixes (below); removed unused components, config and packages |

### 4. Testing

| Type | What | Where |
|---|---|---|
| Unit | JWT auth and tiers, log redaction, LLM client (retries, timeouts, usage, cost), embeddings, production-config safety, agent workflow, validator and prompts, ingestion and chunking, output cleaner | `backend/tests/unit` |
| Integration | Generation, knowledge base (incl. cross-user isolation), email and reminders, n8n events, quotas, evaluation regression, all through the real API with fake providers | `backend/tests/integration` |
| Database | Postgres + pgvector repository tests against a real database | CI service container |
| AI evaluation | 20 labeled briefs (supported, conflicting, prompt-injection, no-context): retrieval Hit@5 / MRR, validation pass rate, citation correctness | `backend/eval`, run in CI |
| Static checks | ruff, ESLint, TypeScript `--noEmit` | CI |
| Build and container | Frontend production build; Docker image must start and pass `/api/health` and `/api/ready` | CI |
| Performance and accessibility | Lighthouse (3 runs, median), WCAG contrast checker | Manual, before release |
| Production smoke test | `/api/ready` all `ok`; log in, generate, upload a document and generate with sources, email, 2-minute reminder | Live site |

Result: **151 passed** locally (5 Postgres tests skip without a database and run in CI); CI green on every merged PR.

### 5. Deployment

| Part | Where | How |
|---|---|---|
| Frontend | Netlify | Builds from `main` with `netlify.toml`; every PR gets a deploy preview |
| Backend | Render (free, Docker) | Blueprint in `render.yaml`; secrets entered in the dashboard; health check `/api/health` |
| Database + Auth | Supabase | `001_init.sql`; Site URL and redirect URLs set to the Netlify domain |
| Automations | n8n in Docker on my machine | Public HTTPS via ngrok static domain; requests authenticated with a shared secret |
| Gate | GitHub Actions | Backend, frontend and Docker jobs must pass before merge |

Release flow: feature branch → PR → CI + Netlify deploy preview → merge → automatic production deploy.

## Production issues and how I resolved them

| Issue | Root cause | Resolution |
|---|---|---|
| **Blank white page** after the first Netlify deploy | Placeholder text (`https://<project-id>.supabase.co`) was entered as the Supabase environment variables; the client threw at startup, so React never rendered | Found it by downloading the live JS bundle and searching it for the baked-in values; set the real values and redeployed with a cleared cache |
| **Embeddings unavailable in the cloud** | Local development used Ollama, which can't run on Render's free plan | Switched to Gemini's free embedding API (768-dim) everywhere and re-embedded documents, since vectors from different models can't be compared |
| **Cloud backend couldn't reach n8n** | n8n runs in Docker on a laptop, with no public address | Exposed it with an ngrok static domain; events carry a shared secret header that n8n checks |
| **ngrok failed: "unknown version '3'"** | The package manager installed an old ngrok (3.3.1) that couldn't read the current config format | Replaced it with the current release (3.39) and fixed a duplicate config entry |
| **ngrok failed: ERR_NGROK_320** | The authtoken belonged to a different ngrok account than the one owning the domain | Switched to the correct account's token |
| **50-second first response** | Render's free plan sleeps after 15 idle minutes | Documented in the UI help center and README; health checks confirm readiness |
| **Database writable through Supabase's REST API** (security review, medium) | Supabase grants `anon`/`authenticated` full table privileges by default, and two RLS policies allowed own-row writes, so any signed-in user could insert unlimited rows directly, bypassing upload limits and filling the shared database | Revoked those privileges (`001_init.sql`); verified 0 remaining grants and that the backend (table owner) is unaffected |
| **n8n editor exposed to the internet** (security review, medium) | The ngrok tunnel forwarded every path, publishing the n8n login page and REST API | ngrok traffic policy ([n8n/ngrok-policy.yml](n8n/ngrok-policy.yml)) allows only `POST /webhook/scriptai-events`; everything else returns 404 |
| **Shared email quota could be exhausted** (security review, medium) | "Email me" had no per-user limit; all mail goes through one Gmail account with a daily cap | Per-user budget of 20 emails/reminders per hour, HTTP 429 beyond it, with regression tests |
| **No clickjacking protection** (security review, low) | The site sent no framing or content-security headers | CSP with `frame-ancestors 'none'`, `X-Frame-Options`, `nosniff`, `Referrer-Policy`, `Permissions-Policy` in `netlify.toml` |
| **Accessibility and speed findings** | Lighthouse: icon-only buttons without names, a render-blocking font import, the full Supabase SDK in the main bundle | Added accessible names, loaded the font with `preconnect`, used the auth-only Supabase client (see metrics) |

## Metrics

| Metric | Value | How measured |
|---|---|---|
| Retrieval Hit@5 / MRR | **94% / 0.94** | Offline evaluation, 20 labeled briefs (`python -m eval.run_eval`), runs in CI |
| No-context accuracy | **100%** | Unrelated briefs correctly return no sources |
| Validation pass rate | **100%** across 4 configurations | Same evaluation, offline mode |
| Automated tests | **151 passing** (+5 Postgres tests in CI) | `pytest` |
| Security review | **4 confirmed issues fixed** (3 medium, 1 low), 0 open | Source-first review with Cloudflare's security-audit method (below) |
| Main JS bundle (gzip) | **120.7 KB → 105.2 KB (−13%)** | Vite build output |
| Largest Contentful Paint (mobile) | **2.91 s → 2.61 s (−10%)** | Lighthouse 12, mobile preset, median of 3, local production build |
| Lighthouse (mobile / desktop) | Performance **92 / 97**, Accessibility **100**, Best Practices **100**, SEO **100** | Same method |
| Cumulative Layout Shift | **0** | Lighthouse |
| Colour contrast | **17/17** token pairs pass WCAG AA | `contrast.py` |
| Warm API latency | **~300 ms** for `/api/health` (India → Render) | 6 requests from my machine |

The offline evaluation uses a deterministic fake LLM and hashed embeddings, so it measures the pipeline (retrieval, citations, validation), not writing quality. See [docs/evaluation.md](docs/evaluation.md).

---

## Getting started (local)

Prerequisites: Node.js 18+, Python 3.10+, Docker (for n8n), a free [Supabase](https://supabase.com) project, an LLM key (e.g. [OpenRouter](https://openrouter.ai)), and a free [Gemini API key](https://aistudio.google.com/apikey) for embeddings.

1. **Database.** Supabase → SQL Editor → run [`backend/migrations/001_init.sql`](backend/migrations/001_init.sql) (safe to re-run).
2. **Backend.**
   ```bash
   cd backend
   python -m venv .venv && source .venv/bin/activate   # Windows: .venv\Scripts\activate
   pip install -r requirements-dev.txt
   cp .env.example .env     # fill every line marked <-- REQUIRED
   uvicorn app.main:app --reload --port 8000
   ```
   `http://localhost:8000/api/ready` must report every check as `ok`.
3. **n8n** (emails and reminders). Run it in Docker, import the workflows and add a Gmail SMTP credential: [n8n/README.md](n8n/README.md).
4. **Frontend.**
   ```bash
   cd frontend
   cp .env.example .env.local   # VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, VITE_BACKEND_URL
   npm install
   npm run dev                  # http://localhost:8081
   ```

| Supabase value | Goes in |
|---|---|
| Project URL | `SUPABASE_URL` (backend) and `VITE_SUPABASE_URL` (frontend) |
| Publishable / anon key | `VITE_SUPABASE_ANON_KEY` (frontend only) |
| Session pooler connection string | `DATABASE_URL` (backend only) |
| Legacy JWT secret | `SUPABASE_JWT_SECRET`, only if your project still signs with legacy HS256 |
| Secret / service_role key | nowhere |

**Run with no keys at all:** in `backend/.env` set `LLM_PROVIDER=fake`, `EMBEDDING_PROVIDER=fake`, `DATABASE_URL=` (in-memory store) and `AUTH_DISABLED=true`.

Deployment, troubleshooting and rollback: [docs/operations.md](docs/operations.md) · all variables: [`backend/.env.example`](backend/.env.example)

## Tests and evaluation

```bash
cd backend
pytest                             # unit + integration; no API keys or network needed
ruff check .
python -m eval.run_eval            # offline evaluation → eval/results/report.md
python -m eval.run_eval --live     # same dataset against your real providers

cd ../frontend
npm run lint && npx tsc -p tsconfig.app.json --noEmit && npm run build
```

## Project layout

```
.
├── backend/                 FastAPI service (Docker, deployed to Render)
│   ├── app/
│   │   ├── api/             routes: generation (+email, background), knowledge, reminders, health
│   │   ├── core/            config, auth, errors, logging
│   │   ├── services/        llm, embeddings, prompts, agent_workflow, validation, text_cleaner,
│   │   │                    knowledge, document_ingestion, events, reminders
│   │   ├── repositories/    in-memory (dev/tests) and Postgres (pgvector)
│   │   └── schemas/         request/response models
│   ├── migrations/          001_init.sql (tables, indexes, RLS)
│   ├── eval/                corpus, labeled dataset, run_eval.py, results/
│   └── tests/               unit/, integration/
├── frontend/                React + Vite + Tailwind (deployed to Netlify)
│   └── src/
│       ├── pages/           home, features, how it works, dashboard, auth, blog, help, legal
│       ├── components/      navbar, footer, marketing blocks, glass pointer, dashboard panels (voice, knowledge, reminders, insights)
│       ├── lib/             typed API client, feature list, utils
│       └── index.css        design tokens and liquid-glass styles
├── n8n/                     importable workflows + setup guide
├── docs/                    architecture, decisions (ADRs), API, evaluation, operations
├── .github/workflows/ci.yml backend, frontend and Docker jobs
├── docker-compose.yml       optional local Postgres (pgvector) + API
├── netlify.toml             frontend build + SPA routing
└── render.yaml              backend Blueprint
```

## Security and privacy

- Provider keys live only in the backend environment, never in `VITE_*` variables.
- Each user sees only their own documents, chunks, reminders and quota, enforced in queries and by row-level security; cross-user access is covered by tests.
- Uploaded files are validated by content and processed in memory; deleting a document deletes its chunks.
- Retrieved text goes to the model as delimited data, never as instructions; the prompt-injection case is part of the evaluation set.
- `APP_ENV=production` refuses to start with unsafe settings (auth off, wildcard CORS, fake providers, weak n8n secret).
- Logs redact keys, tokens and database URLs and never contain prompts or document text.
- The browser can't touch database tables directly: Supabase's default table privileges for `anon`/`authenticated` are revoked; all data access goes through FastAPI.
- Per-user email budget (20 per hour) protects the shared SMTP account; only the events webhook of n8n is public (ngrok traffic policy).
- Security headers on the website (CSP, `frame-ancestors 'none'`, `nosniff`); API docs are disabled in production.

**Security review (2026-10-19).** A source-first review following [Cloudflare's security-audit method](https://github.com/cloudflare/security-audit-skill) covered authentication, per-user isolation in every query, row-level security and grants, internal n8n endpoints, email recipients, uploads, prompt and output handling, CORS and deployment configuration. Verified as sound: JWT verification (algorithm allow-list, audience, expiry), owner-scoped SQL everywhere, recipients taken only from the verified token, email confirmation required, HTML-escaped emails, no raw-HTML rendering in the UI, CORS limited to the site. Four issues were confirmed and fixed (see [Production issues](#production-issues-and-how-i-resolved-them)).

## Limitations

- The evaluation set is small (20 hand-labeled briefs): good for regression testing, not a benchmark.
- Voice generation uses the browser's built-in voices, so available voices vary by device and audio can't be downloaded.
- Emails and reminders depend on the n8n container and ngrok tunnel running on my machine.
- No server-side script history (by design, for privacy) and no OCR for scanned PDFs.

This is an educational and portfolio project.
