"""Sajag backend entry point. M0: health endpoint only."""

from __future__ import annotations

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config.settings import allowed_origins, load_dotenv

load_dotenv()

app = FastAPI(title="Sajag API", version="0.0.1")

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins(),
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type"],
)


@app.get("/healthz")
def healthz() -> dict[str, bool]:
    """Liveness check."""
    return {"ok": True}
