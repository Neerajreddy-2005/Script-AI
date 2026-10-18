# Operations Guide

## Environments

| | Local dev | Staging | Production |
|---|---|---|---|
| `APP_ENV` | development | staging | production |
| `AUTH_DISABLED` | true (optional) | false | false (enforced) |
| `DATABASE_URL` | empty (in-memory) or docker compose | separate Supabase project | Supabase project |
| Providers | `fake` or free tier | separate keys | production keys |

`APP_ENV=production` **refuses to start** if auth is disabled, the database is missing, a provider is `fake`, or CORS allows `*`. `/api/ready` reports the same problems.

## First-time setup (Supabase)

Step-by-step local setup is in the [README](../README.md#getting-started); n8n setup is in [n8n/README.md](../n8n/README.md).

1. Supabase dashboard → SQL Editor → paste and run `backend/migrations/001_init.sql`. It's safe to re-run.
   - Before running it, check that `vector(768)` matches your embedding model's output size (`EMBEDDING_DIM`).
2. Project Settings → Database → copy the **connection string** into `DATABASE_URL`. Either the direct connection or the pooler works; prepared statements are disabled, so the transaction pooler is fine too.
3. Set `SUPABASE_URL`. If your project still uses the legacy JWT secret, also set `SUPABASE_JWT_SECRET`. Otherwise tokens are verified against the project's public JWKS.
4. Optional paid tiers: set `app_metadata.subscription` to `pro` or `premium` with the service role (Dashboard → Authentication → user → raw app metadata). Users can't change this themselves.

## Services and ports

| Service | Port | Health |
|---|---|---|
| FastAPI | 8000 | `/api/health`, `/api/ready` |
| n8n | 5678 | Workflows "Script-AI Generate (2.0)", "Script-AI Events & Email", and "Script-AI Reminders" must be **Active** |
| Frontend (Vite) | 8081 | |

In n8n, failed runs appear under **Executions**. The generate workflow returns FastAPI's error status and body unchanged, and returns 503 `backend_unreachable` if FastAPI is down.

## Health checks

| Endpoint | Meaning | Use for |
|---|---|---|
| `GET /api/health` | The process is up | liveness probe, Docker `HEALTHCHECK` |
| `GET /api/ready` | Config is complete and the database answers; returns 503 with `checks` and `problems` otherwise | readiness probe, post-deploy smoke test |

`/api/ready` never calls paid LLM or embedding APIs.

## Logs

Each log line is one JSON object on stdout:

```json
{"ts": "...", "level": "INFO", "logger": "scriptai.generation", "request_id": "...", "msg": "generation_succeeded",
 "mode": "assisted", "provider": "openai_compatible", "model": "...", "llm_calls": 2, "input_tokens": 1830,
 "output_tokens": 712, "kb_status": "used", "retrieved": 3, "validation_passed": true, "duration_ms": 4210}
```

To trace a failed request, take the `request_id` shown in the UI error box or the `X-Request-ID` response header, then search the logs for it. Secrets (API keys, bearer tokens, JWTs, `postgres://` URLs, and any field named like `*key*`, `*token*`, `*secret*`, `password`) are redacted before writing.

## Error codes (HTTP)

| Status | Code(s) | Typical cause |
|---|---|---|
| 400 | `document_limit_reached` | `MAX_DOCUMENTS_PER_USER` reached |
| 401 | `unauthorized`, `invalid_token`, `token_expired` | Missing or expired Supabase session |
| 404 | `not_found` | Unknown ID, or a document that belongs to another user |
| 413 | `file_too_large` | Larger than `MAX_UPLOAD_SIZE_MB` |
| 415 | `unsupported_file_type`, `content_type_mismatch` | Wrong extension, or the bytes don't match the extension |
| 422 | `validation_error`, `empty_file`, `no_extractable_text`, `unreadable_file`, `encrypted_pdf`, `invalid_encoding` | Bad input |
| 429 | `quota_exceeded` | Daily generation quota used up |
| 502 | `provider_error`, `provider_auth_failed`, `provider_rate_limited`, `malformed_output`, `embedding_dim_mismatch`, `embedding_failed` | Upstream AI problem |
| 503 | `service_unavailable`, `llm_not_configured`, `auth_not_configured` | Missing configuration |
| 504 | `provider_timeout` | The provider was slower than `LLM_TIMEOUT_SECONDS`, even after retries |

## Troubleshooting

| Symptom | Check |
|---|---|
| `embedding_dim_mismatch` on upload | `EMBEDDING_DIM` must equal the model's output size **and** `vector(N)` in the database |
| Every search returns nothing | Lower `RAG_MIN_SIMILARITY`. Use `POST /api/knowledge/search` to see similarity scores; different models have different baselines. |
| Unrelated documents show up as sources | Raise `RAG_MIN_SIMILARITY` |
| `malformed_output` often | Set `LLM_JSON_MODE=true` if the provider supports it, or try a stronger model |
| 400 from the provider mentioning `response_format` | Set `LLM_JSON_MODE=false` |
| `provider_rate_limited` on a free tier | Use standard mode (one call), or lower `MAX_AGENT_REVISIONS` |
| "Email delivery is not set up" (503) | `N8N_EVENTS_URL` is empty: set it and `N8N_SHARED_SECRET`, then restart uvicorn |
| Reminders stay "scheduled" | The n8n Reminders workflow is inactive, or its Config secret or URL is wrong. See [n8n/README.md](../n8n/README.md#troubleshooting) |
| "The Script-AI backend is not reachable from n8n" | uvicorn is stopped, or n8n runs in Docker and uses `localhost` (use `host.docker.internal:8000`) |
| `/api/ready` shows `database: ok (in-memory)` | `DATABASE_URL` is empty or uvicorn wasn't restarted after editing `.env` |
| Blank white page on the frontend | `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` missing in `frontend/.env.local`; restart `npm run dev` |
| No `[S1]` markers in the script | The Preview tab hides bracketed text; the Editor tab and the Sources panel show citations |
| `embedding_failed` on upload | Ollama isn't running (`ollama list`) |
| Changes in `.env` are ignored | Both servers read env files only at startup: restart them |
| Browser CORS error | Add the exact frontend origin to `FRONTEND_ORIGINS` (scheme + host + port) |
| 401 immediately after login | The backend's `SUPABASE_URL` or `SUPABASE_JWT_SECRET` doesn't match the frontend's project |

## Deploying

| Part | Host (free tier) | Builds from |
|---|---|---|
| Frontend | Netlify | `netlify.toml` (base `frontend/`, SPA redirect), on every push |
| Backend | Render web service, Docker runtime, root directory `backend` | `backend/Dockerfile` (honors `PORT`) |
| Database + Auth | Supabase | `backend/migrations/001_init.sql` |
| n8n | Your machine (expose with a Cloudflare Tunnel), or any n8n host | `n8n/*.workflow.json` |

1. **Backend (Render).** Set the variables from `backend/.env.example` as environment variables, plus:
   - `APP_ENV=production` (refuses to start with unsafe settings; the reason is in the Render logs);
   - `FRONTEND_ORIGINS=https://<site>.netlify.app`;
   - **Embeddings:** Ollama isn't reachable from Render. Use a hosted free API, e.g. Gemini: `EMBEDDING_BASE_URL=https://generativelanguage.googleapis.com/v1beta/openai`, `EMBEDDING_MODEL=gemini-embedding-001`, `EMBEDDING_API_KEY=<key>`, `EMBEDDING_DIM=768`, `EMBEDDING_SEND_DIMENSIONS=true`. Vectors from different models aren't comparable: **re-upload documents** after switching.
   - The free tier sleeps after 15 idle minutes; the first request then takes ~50 s.
2. **Frontend (Netlify).** Site configuration → Environment variables: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_BACKEND_URL=https://<app>.onrender.com`. Leave `VITE_N8N_WEBHOOK_URL` empty unless n8n has a public URL; generation then calls FastAPI directly.
3. **Supabase.** Authentication → URL Configuration: add the Netlify URL as Site URL and Redirect URL.
4. **n8n.** Point the Generate/Reminders nodes at the Render URL ([n8n/README.md](../n8n/README.md)). For emails from the deployed backend, `N8N_EVENTS_URL` must be a public URL of n8n (e.g. a Cloudflare Tunnel); production refuses to start if it's set without an `N8N_SHARED_SECRET` of 16+ characters.
5. **Smoke test:**
   - `curl https://<app>.onrender.com/api/ready` returns `{"status":"ready"}`;
   - sign in, upload `backend/eval/corpus/brewly_products.md`, and generate with the knowledge base enabled;
   - check that `[S1]` points to `brewly_products.md`, then delete the document.
6. **Check the bundle for leaked secrets.** Only `VITE_*` values are included: `grep -r "sk-\|LLM_API_KEY" frontend/dist` must find nothing.

## Rollback

- **Application:** redeploy the previous container image tag. The API is backward compatible with the 1.0 frontend, which reads `success` and `data`.
- **n8n down:** clear `VITE_N8N_WEBHOOK_URL` and rebuild the frontend so generation calls FastAPI directly. Email and reminder delivery pause, and pending reminders are sent once n8n is back.
- **Disable RAG quickly:** the frontend works with the knowledge base toggle off. Without a database, the backend still generates when `DATABASE_URL` is empty (in-memory store).
- **Disable assisted mode cost:** set `MAX_AGENT_REVISIONS=0`.
- **Database:** the migration only adds tables. Rolling back means `drop table reminders, generations, document_chunks, documents;`, which loses uploaded knowledge.
