## Script-AI 


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

