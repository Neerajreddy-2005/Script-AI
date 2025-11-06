import os
from fastapi import FastAPI, Body
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from typing import Any, Dict
from fastapi.middleware.cors import CORSMiddleware

from text_cleaner import clean_script_payload


class CleanRequest(BaseModel):
	payload: Dict[str, Any]


app = FastAPI(title="Script-AI Cleaner", version="1.0.0")

# Configure CORS so the frontend (e.g., Render or local) can call the API
frontend_origin = os.environ.get("FRONTEND_ORIGIN", "*")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[frontend_origin] if frontend_origin != "*" else ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.post("/clean-script")
def clean_script(req: CleanRequest = Body(...)) -> JSONResponse:
	cleaned = clean_script_payload(req.payload)
	return JSONResponse(cleaned)


# Optional root ping
@app.get("/")
def root() -> Dict[str, str]:
	return {"status": "ok"}


