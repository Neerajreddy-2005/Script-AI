# Script‑AI

If you want to see the project live: [Live Demo](https://scripai.netlify.app/)

A lightweight tool to generate clean, platform‑ready content scripts and display them in a simple dashboard.

## Tech Stack
- Frontend: React + TypeScript (Vite), TailwindCSS
- Backend Orchestration: n8n workflow (HTTP webhook + external API call)
- Text Cleaning Service: Python (FastAPI, Uvicorn)

## What it does
- Accepts a topic and preferences from the dashboard
- Generates a draft script using an LLM provider (through the backend workflow)
- Presents the cleaned script in the dashboard for copy/paste

## High‑level workflow
1. User submits a request from the dashboard (topic, platform, tone, length).
2. Frontend sends a POST request to the backend endpoint `/api/generate-script`.
3. Backend workflow calls the model provider and returns a script payload.
4. The payload is sent to the Python cleaning service, which sanitizes/normalizes text.
5. Backend returns the cleaned JSON back to the frontend.
6. Frontend renders the result with preserved line breaks for easy reading and copying.

## Getting started

### Prerequisites
- Node.js 18+
- Python 3.10+

### Frontend
```bash
# from project root
cd frontend
npm install
npm run dev
```

### Text cleaning service (Python)
```bash
# from project root
cd backend
pip install -r requirements.txt
uvicorn clean_service:app --host 127.0.0.1 --port 8000
```

### Backend workflow
- The backend exposes a single webhook endpoint that the frontend calls.
- The workflow then calls the model provider and forwards the result to the Python cleaner before responding.
- The workflow configuration file is not tracked in git to avoid leaking environment‑specific details.

## Configuration
- Frontend reads the backend base URL from `VITE_BACKEND_URL` (e.g., `http://localhost:5678` pointing to your workflow’s webhook base).
- The Python cleaner service listens on `http://127.0.0.1:8000`.

## Output format
The backend returns JSON shaped like:
```json
{
  "success": true,
  "data": {
    "title": "...",
    "introduction": { "script": "..." },
    "mainContent": { "script": "..." },
    "conclusion": { "script": "..." }
  }
}
```
The cleaner ensures numbered points appear on separate lines with consistent spacing.

## Security & privacy
- Secrets and environment variables are excluded from version control via `.gitignore`.
- No provider credentials or internal workflow logic are committed to this repository.

## Notes
- This project is for educational/demo purposes. You can swap the model provider or extend the cleaner without changing the high‑level flow.

### Required Frontend Inputs
From `frontend/src/pages/DashboardPage.tsx`, the UI collects:
- **topic**: string (required)
- **platform**: one of `YouTube | TikTok | Instagram | Podcast | LinkedIn | Twitter`
- **tone**: one of `Casual | Professional | Humorous | Educational | Persuasive | Inspirational`
- **length**: one of `Short (2-3 min) | Medium (5-7 min) | Long (10-15 min) | Extra Long (20+ min)`
- **subscription**: one of `basic | pro | premium`

These are sent to n8n in the POST body.

