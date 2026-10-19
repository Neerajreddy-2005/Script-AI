# n8n workflows

n8n is the email and automation hub. FastAPI holds the AI logic; n8n sends every email (scripts, background results, reminders).

In production, n8n runs in Docker on the developer's machine and is reachable by the Render backend through an **ngrok static domain** (see [Expose n8n to the deployed backend](#4-expose-n8n-to-the-deployed-backend-ngrok)). The website calls FastAPI directly; the Generate workflow is only used as an optional gateway in local development.

| File | Workflow | Trigger | Does |
|---|---|---|---|
| `script-ai-generate.workflow.json` | Script-AI Generate (2.0) | Webhook `POST /webhook/api/generate-script` | *Local development only.* Forwards the request (with the user's `Authorization` header) to FastAPI and returns its response |
| `script-ai-events.workflow.json` | Script-AI Events & Email | Webhook `POST /webhook/scriptai-events` | Receives FastAPI events; emails scripts ("Email me", background jobs) and background failures |
| `script-ai-reminders.workflow.json` | Script-AI Reminders | Every minute | Claims due reminders from FastAPI, emails them, marks them sent/failed (3 attempts) |

These files contain **placeholders only**. Never export your live workflows over them: the live ones hold your real secret. Export to `*.export.json` (gitignored) instead.

## Setup

### 1. SMTP credential (Gmail, free)

1. Google Account → Security → turn on 2-Step Verification → **App passwords** → create one named `n8n`.
2. n8n → Credentials → Add credential → **SMTP**:

   | Field | Value |
   |---|---|
   | User | your Gmail address |
   | Password | the 16-character app password, **without spaces** |
   | Host | `smtp.gmail.com` |
   | Port | `465`, SSL/TLS **on** |
   | Client Host Name | **leave empty** |

### 2. Import and configure

Import each file (Workflows → ⋯ → Import from File), then:

| Workflow | Node | Set |
|---|---|---|
| Generate | Generate via FastAPI | URL `http://<API>/api/generate-script` |
| Generate | Receive /api/generate-script | Options → Allowed Origins = the frontend origin (`http://localhost:8081`, or your Netlify URL) |
| Events & Email | Valid secret? | Replace `CHANGE-ME-same-as-N8N_SHARED_SECRET` with `N8N_SHARED_SECRET` from `backend/.env` |
| Events & Email | Email the script, Email the failure | SMTP credential + From Email `Script-AI <you@gmail.com>` |
| Reminders | Config | `apiBaseUrl` = `http://<API>`, `secret` = `N8N_SHARED_SECRET` |
| Reminders | Send reminder email | SMTP credential + From Email |

`<API>` is where FastAPI runs:

| n8n runs… | `<API>` |
|---|---|
| natively (`npx n8n`, desktop app) | `localhost:8000` |
| in Docker | `host.docker.internal:8000` (inside a container `localhost` is the container) |
| backend deployed | `script-ai-api.onrender.com` (https) |

Then **Save → Activate/Publish** all three. Deactivate any older workflow that uses the `api/generate-script` path.

In `backend/.env`, `N8N_EVENTS_URL` is the Events workflow's production webhook URL (`http://localhost:5678/webhook/scriptai-events` locally).

### 3. Check

- Executions → "Script-AI Reminders" shows a successful run every minute.
- Set a reminder 2 minutes ahead in the dashboard; the email arrives and the status becomes *sent*.

### 4. Expose n8n to the deployed backend (ngrok)

The Render backend posts events to n8n, so n8n needs a public HTTPS address. A free ngrok account includes one static domain.

1. Sign up at [ngrok.com](https://ngrok.com), install the **current** ngrok, and run `ngrok config add-authtoken <token>` with the token of the account that owns the domain.
2. Dashboard → **Domains**: note your free static domain, e.g. `your-name.ngrok-free.dev`.
3. With the n8n container publishing port 5678, run this from the repository root:
   ```bash
   ngrok http 5678 --url=https://your-name.ngrok-free.dev --traffic-policy-file=n8n/ngrok-policy.yml
   ```
   The [traffic policy](ngrok-policy.yml) makes only `POST /webhook/scriptai-events` public. Without it, the tunnel also publishes the n8n editor, login page and REST API (which holds your SMTP credential) to the whole internet. Check: opening `https://your-name.ngrok-free.dev/` should show **404**.
4. On Render set `N8N_EVENTS_URL=https://your-name.ngrok-free.dev/webhook/scriptai-events` and `N8N_SHARED_SECRET` (same value as in n8n).
5. Keep n8n and ngrok running while you want emails and reminders. `GET /api/ready` on the backend reports `n8n_automations: ok` when both values are set.

## Troubleshooting

| Symptom | Fix |
|---|---|
| SMTP "Connection closed unexpectedly" | Client Host Name must be empty; app password without spaces; port 465 + SSL on (or 587 + SSL off) |
| "Backend not reachable from n8n" / Claim "refused the connection" | Wrong `<API>` (see the table above); is uvicorn running? If n8n is in Docker and it still fails, start uvicorn with `--host 0.0.0.0` |
| Claim returns `401 invalid_automation_secret` | Config `secret` ≠ `N8N_SHARED_SECRET` |
| Events run ends at "Ignore forged event" | "Valid secret?" value ≠ `N8N_SHARED_SECRET` |
| Workflow won't activate: path in use | Another active workflow uses the same webhook path |
| Browser CORS error on `:5678` | Allowed Origins on the Receive node doesn't match the frontend origin exactly |
| ngrok `unknown flag: --url` or `unknown version '3'` in `ngrok.yml` | ngrok is outdated (e.g. winget's 3.3.1). Install the current release from ngrok.com, then `ngrok update` keeps it current |
| ngrok `ERR_NGROK_320` (domain reserved for another account) | The saved authtoken belongs to a different account: run `ngrok config add-authtoken` with the token of the account that owns the domain |
| Emails stop when the laptop sleeps | n8n and ngrok must both be running; pending reminders are sent once they're back |

Event payloads and the internal reminder endpoints: [docs/api.md](../docs/api.md).
