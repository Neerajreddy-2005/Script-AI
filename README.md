## Script-AI — Frontend → n8n Backend Integration

This README explains how to stand up an n8n workflow as the backend for the Script-AI frontend, including the exact webhook contract the UI expects, environment variables, and deployment tips.

### Overview
- **Frontend stack**: React + Vite + TypeScript + Tailwind (see `frontend/`)
- **Backend**: n8n workflow exposed via a Webhook Trigger
- **Core flow**: User sets parameters on the Dashboard and clicks "Generate Script" → frontend POSTs to n8n webhook URL → n8n returns structured JSON used to render the script

### Required Frontend Inputs
From `frontend/src/pages/DashboardPage.tsx`, the UI collects:
- **topic**: string (required)
- **platform**: one of `YouTube | TikTok | Instagram | Podcast | LinkedIn | Twitter`
- **tone**: one of `Casual | Professional | Humorous | Educational | Persuasive | Inspirational`
- **length**: one of `Short (2-3 min) | Medium (5-7 min) | Long (10-15 min) | Extra Long (20+ min)`
- **subscription**: one of `basic | pro | premium`

These are sent to n8n in the POST body.

### Webhook Request (from Frontend → n8n)
Endpoint: the URL configured in `VITE_N8N_WEBHOOK_URL` or pasted into the Dashboard banner field.

Method: `POST`

Headers:
- `Content-Type: application/json`

Body JSON shape:
```json
{
  "topic": "string",
  "platform": "YouTube|TikTok|Instagram|Podcast|LinkedIn|Twitter",
  "tone": "Casual|Professional|Humorous|Educational|Persuasive|Inspirational",
  "length": "Short (2-3 min)|Medium (5-7 min)|Long (10-15 min)|Extra Long (20+ min)",
  "subscription": "basic|pro|premium"
}
```

### Webhook Response (from n8n → Frontend)
The frontend expects a JSON object with a success flag. On success, `data` must include the script sections used to render the UI:

```json
{
  "success": true,
  "data": {
    "title": "string",
    "introduction": "string",
    "mainContent": "string",
    "conclusion": "string"
  }
}
```

Error response example:
```json
{
  "success": false,
  "error": "Human-readable error message"
}
```

Notes:
- The UI checks `response.ok` and then `result.success`. If either fails, it shows an error toast and may use fallback content in dev.

### Configure the Frontend to Point at n8n
You have two ways to set the webhook URL used by the frontend:
1) Preferred: create `frontend/.env` with:
```
VITE_N8N_WEBHOOK_URL=https://<your-n8n-host>/webhook/generate-content
```
2) Alternatively: paste the URL in the Dashboard banner field at runtime (disabled if `.env` defines it).

Rebuild/restart the frontend after changing `.env`.

### Building the n8n Workflow
Create a workflow with these nodes:

1) Webhook Trigger
- Method: POST
- Path: `generate-content` (or any path you prefer; match the URL you configure)
- Respond: at the end of the workflow with JSON

2) Function (Validate and map input)
- Parse and validate `topic`, `platform`, `tone`, `length`, `subscription` from `{{$json}}`.
- Guard against missing `topic`.

3) AI Content Generation
- Use any LLM node you prefer (OpenAI, OpenAI-compatible, or other). Prompt with the five inputs to produce title, introduction, mainContent, conclusion. Consider using different prompt templates conditioned by `platform`, `tone`, `length`, and `subscription`.

4) Function (Shape response)
- Build the exact response JSON required by the UI:
```js
return [{
  json: {
    success: true,
    data: {
      title: $json.title,
      introduction: $json.introduction,
      mainContent: $json.mainContent,
      conclusion: $json.conclusion,
    }
  }
}];
```

5) Respond to Webhook
- Return the Function output as the final response with status 200 and `application/json`.

Error handling: If validation fails or AI generation errors, return:
```js
return [{ json: { success: false, error: "<message>" }, pairedItem: { item: 0 } }];
```
Set an appropriate non-2xx status if you want the UI to surface HTTP error codes.

### Example n8n Function Node (Generate static sample)
Useful while wiring things up before adding an LLM node:
```js
const { topic = "", platform = "YouTube", tone = "Casual", length = "Short (2-3 min)", subscription = "pro" } = $json;

if (!topic) {
  return [{ json: { success: false, error: "Missing required field: topic" } }];
}

return [{
  json: {
    success: true,
    data: {
      title: `${topic} - Script for ${platform}`,
      introduction: `[${tone.toUpperCase()}] Hook your audience with a strong intro about ${topic}.`,
      mainContent: `[${tone.toUpperCase()}] Cover key points tailored for ${platform} with ${length} length. Subscription: ${subscription}.`,
      conclusion: `[${tone.toUpperCase()}] End with a clear CTA relevant to ${platform}.`
    }
  }
}];
```

### Optional: Supabase Projects List
The frontend shows and saves projects to a `projects` table. If you want this working end-to-end:
- Create table `projects` with columns: `id uuid primary key default gen_random_uuid()`, `user_id uuid`, `name text`, `description text`, and timestamps.
- Configure `frontend/src/integrations/supabase/client.ts` with your Supabase URL and anon key.
- The n8n integration is independent; Supabase is only for persisting items the user saves from the UI.

### Local Development
Frontend:
- Node 18+ recommended
- From `frontend/`: `npm install` then `npm run dev`
- Ensure `VITE_N8N_WEBHOOK_URL` is set or paste the URL in the UI banner

n8n:
- Start n8n locally or use n8n Cloud
- For local dev, expose your webhook via a tunnel (e.g., Cloudflare Tunnel, ngrok) and use that public URL in `VITE_N8N_WEBHOOK_URL`

### Deployment Notes
- n8n Cloud: Copy the webhook URL from the Webhook Trigger node and set it in your frontend `.env`
- Self-hosted n8n: Ensure HTTPS and a public DNS; update the webhook URL accordingly
- CORS: Webhook Trigger node in n8n allows configuring response headers; if hosting the frontend on a different origin, set `Access-Control-Allow-Origin` appropriately (e.g., `*` or your domain)

### Troubleshooting
- 4xx/5xx from webhook: The UI will show an error toast. Check n8n execution logs.
- Empty `topic`: The frontend stops and prompts the user; backend should also validate.
- Wrong response shape: Ensure `success` boolean and `data` with `title`, `introduction`, `mainContent`, `conclusion`.
- Env var not applied: Restart dev server after editing `.env`.

### Security
- Do not hardcode secrets in the frontend. Keep keys inside n8n credentials.
- Use n8n credentials and environment variables for LLM provider keys.

### Summary of Contract
- POST to `VITE_N8N_WEBHOOK_URL`
- Request: `{ topic, platform, tone, length, subscription }`
- Response on success: `{ success: true, data: { title, introduction, mainContent, conclusion } }`
- Response on error: `{ success: false, error }`