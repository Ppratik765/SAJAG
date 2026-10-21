"""Sajag backend entry point. M0: health endpoint only."""

from __future__ import annotations

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config.settings import allowed_origins, load_dotenv
from app.routes import analyze, live, meta

load_dotenv()

app = FastAPI(title="Sajag API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins(),
    allow_credentials=True,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
)

app.include_router(meta.router)
app.include_router(analyze.router)
app.include_router(live.router)



@app.get("/healthz")
def healthz() -> dict[str, bool]:
    """Liveness check."""
    return {"ok": True}
