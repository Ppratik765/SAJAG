"""Metadata and usage routes."""

from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Header, HTTPException

from app.config.settings import (
    SUPPORTED_STT_LANGUAGES,
    get_admin_token,
)
from app.gnani.usage import get_current_day_usage

router = APIRouter(prefix="/api", tags=["meta"])


@router.get("/meta")
def get_meta() -> dict[str, Any]:
    """Supported STT languages and system readiness flags."""
    return {
        "supported_stt_languages": SUPPORTED_STT_LANGUAGES,
        "reviewed_warning_languages": ["en-IN", "hi-IN"],
        "engine_attached": True,  # M2: detection engine active
    }


@router.get("/usage")
def get_usage(x_admin_token: str | None = Header(None)) -> dict[str, Any]:
    """Today's STT seconds and TTS characters usage and caps. Protected by X-Admin-Token."""
    configured_token = get_admin_token()
    if configured_token and x_admin_token != configured_token:
        raise HTTPException(status_code=403, detail="Forbidden: invalid X-Admin-Token")

    return get_current_day_usage()
