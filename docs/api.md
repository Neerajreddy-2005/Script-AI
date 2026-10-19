# API Reference

The base URL is the FastAPI backend (for example `http://localhost:8000`). Interactive documentation is at `/docs`.

In production the browser calls every route on FastAPI directly (`VITE_BACKEND_URL`). Locally you can optionally route `/api/generate-script` through the **n8n webhook** (`http://localhost:5678/webhook/api/generate-script`, enabled by `VITE_N8N_WEBHOOK_URL`); n8n forwards the request and the `Authorization` header to FastAPI and returns the same JSON shape and status codes documented below.

Every `/api/...` request needs `Authorization: Bearer <supabase access token>`, except:

- `/api/health` and `/api/ready`;
- `/api/internal/...`, which only n8n calls, with the `X-ScriptAI-Secret` header.

Every response carries an `X-Request-ID` header. Errors use this shape:

```json
{ "success": false, "error": { "code": "provider_timeout", "message": "..." }, "request_id": "..." }
```

## POST /api/generate-script

```json
{
  "topic": "Cold brew at home",
  "platform": "YouTube",
  "tone": "Casual",
  "length": "Short (2-3 min)",
  "mode": "standard",
  "use_knowledge_base": true,
  "document_ids": ["optional-uuid", "..."],
  "keywords": ["ratio", "18 hours"],
  "audience": "coffee beginners",
  "call_to_action": "Subscribe for weekly brewing tips"
}
```

Field reference:

| Field | Required | Allowed values |
|---|---|---|
| `topic` | yes | 3–300 characters |
| `platform` | yes | YouTube, TikTok, Instagram, Podcast, LinkedIn, Twitter |
| `tone` | yes | Casual, Professional, Humorous, Educational, Persuasive, Inspirational |
| `length` | yes | `Short (2-3 min)`, `Medium (5-7 min)`, `Long (10-15 min)`, `Extra Long (20+ min)` |
| `mode` | no | `standard` (default) or `assisted` |
| everything else | no | `use_knowledge_base`, `document_ids`, `keywords`, `audience`, `call_to_action` |

Unknown fields, including the 1.0 `subscription` field, are ignored.

**200 response.** `data` has the same shape as in 1.0:

```json
{
  "success": true,
  "data": {
    "title": "...",
    "introduction": { "script": "..." },
    "mainContent": { "script": "... [S1] ..." },
    "conclusion": { "script": "..." }
  },
  "metadata": {
    "request_id": "uuid",
    "mode": "assisted",
    "duration_ms": 4210,
    "knowledge_base": { "status": "used", "retrieved": 3 },
    "sources": [
      { "id": "S1", "document_id": "uuid", "filename": "brewly_products.md", "chunk_index": 0,
        "section": "Cold Brew Starter Kit", "page_number": null, "score": 0.42, "snippet": "..." }
    ],
    "validation": { "passed": true, "word_count": 372, "target_words": [280, 450], "issues": [] },
    "workflow": [
      { "name": "retrieve", "status": "ok", "duration_ms": 40, "detail": "3 chunk(s)" },
      { "name": "draft", "status": "ok", "duration_ms": 3900, "detail": null },
      { "name": "validate", "status": "ok", "duration_ms": 1, "detail": "passed" }
    ],
    "usage": { "provider": "openai_compatible", "model": "...", "llm_calls": 1,
               "input_tokens": 1830, "output_tokens": 712, "estimated_cost_usd": null },
    "quota": { "limit": 10, "used": 3, "remaining": 7 }
  }
}
```

`knowledge_base.status` can be:

| Value | Meaning |
|---|---|
| `disabled` | The knowledge base wasn't requested |
| `used` | Relevant chunks were retrieved and given to the model |
| `no_relevant_context` | Nothing passed the relevance gate; the script makes no document claims |
| `unavailable` | Retrieval failed; the script was generated without context |

`estimated_cost_usd` is `null` when the per-token cost isn't configured.

## Knowledge base

| Method | Path | Notes |
|---|---|---|
| POST | `/api/knowledge/documents` | multipart `file` (.txt, .md, .pdf, up to `MAX_UPLOAD_SIZE_MB`). Returns 201 `{document, duplicate}`. Identical bytes return the existing document with `duplicate: true`. |
| GET | `/api/knowledge/documents` | `{documents: [...]}`, newest first, caller's documents only |
| GET | `/api/knowledge/documents/{id}` | Status and metadata; 404 for another user's document |
| DELETE | `/api/knowledge/documents/{id}` | 204; the document's chunks are deleted with it |
| POST | `/api/knowledge/search` | `{query, top_k?, document_ids?}` → `{hits: [{filename, section, page_number, similarity, score, text}], relevant}`. Useful for tuning. |

## Health

| Path | Response |
|---|---|
| `GET /api/health` | `{"status": "ok"}` |
| `GET /api/ready` | 200 `{"status": "ready", "checks": {...}}` or 503 `{"status": "not_ready", "checks": {...}, "problems": [...]}` |

## Email (delivered by n8n)

Both endpoints return `202 {"success": true, "status": "queued", "request_id": "...", "email": "you@..."}`. They return 503 `automations_not_configured` when `N8N_EVENTS_URL` is empty. Emails always go to the **signed-in user's own address**; the recipient can't be chosen.

| Method | Path | What happens |
|---|---|---|
| POST | `/api/scripts/email` | Body `{script: {title, introduction:{script}, mainContent:{script}, conclusion:{script}}, platform?, sources?: [{id, filename}]}`. Emails the script on screen. |
| POST | `/api/generate-script/background` | Same body as `/api/generate-script`. The quota is checked, then the call returns immediately. The script is generated in the background and emailed when ready; a failure is emailed too. |

## Reminders

| Method | Path | Notes |
|---|---|---|
| POST | `/api/reminders` | `{title (1–200), note? (≤2000), remind_at}` → 201. `remind_at` is ISO 8601 **with timezone** and must be between 1 minute and 1 year ahead. Unknown fields (e.g. `email`) are rejected. |
| GET | `/api/reminders` | The caller's reminders, soonest first (`status`: pending, processing, sent, failed) |
| DELETE | `/api/reminders/{id}` | Cancels a pending reminder → 204 |

## Internal (n8n only)

Header: `X-ScriptAI-Secret: <N8N_SHARED_SECRET>`.

| Method | Path | Used by |
|---|---|---|
| POST | `/api/internal/reminders/claim?limit=20` | "Script-AI Reminders" workflow, every minute. Returns due reminders `[{id, email, title, note, remind_at, attempts}]` and marks them `processing`, so they are never sent twice. |
| POST | `/api/internal/reminders/{id}/complete` | `{success: true}` marks the reminder sent. `{success: false, error}` retries it, up to 3 attempts, then marks it failed. |

## Events sent to n8n

FastAPI POSTs to `N8N_EVENTS_URL` with the `X-ScriptAI-Secret` header:

```json
{"event": "script.email_requested", "occurred_at": "...", "request_id": "...",
 "user": {"id": "...", "email": "..."}, "data": {...}}
```

| Event | `data` |
|---|---|
| `script.email_requested` | `title, introduction, mainContent, conclusion, platform, sources, background` |
| `generation.succeeded` | `title, platform, tone, length, mode, background, validation_passed, knowledge_base, sources (count), llm_calls, duration_ms` |
| `generation.failed` | `platform, tone, length, mode, background, error_code, message` |
| `document.ingested` | `document_id, filename, chunk_count` |
| `document.deleted` | `document_id` |
