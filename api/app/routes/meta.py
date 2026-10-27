"""Metadata and usage routes."""

from __future__ import annotations

import os
from pathlib import Path
from typing import Any

import yaml
from fastapi import APIRouter, Header, HTTPException

from app.config.settings import (
    SUPPORTED_STT_LANGUAGES,
    get_admin_token,
    is_maintenance_mode,
)
from app.gnani.usage import get_current_day_usage

router = APIRouter(prefix="/api", tags=["meta"])

_WARNINGS_YAML = Path(__file__).resolve().parent.parent / "config" / "warnings.yaml"


def get_reviewed_warning_languages() -> list[str]:
    """Return language codes whose warning clips are reviewed in warnings.yaml."""
    if not _WARNINGS_YAML.is_file():
        return []
    try:
        with open(_WARNINGS_YAML, "r", encoding="utf-8") as f:
            cfg = yaml.safe_load(f) or {}
        languages = cfg.get("languages", {})
        return [l for l, d in languages.items() if isinstance(d, dict) and d.get("reviewed") is True]
    except Exception:
        return []


@router.get("/meta")
def get_meta() -> dict[str, Any]:
    """Supported STT languages and system readiness flags."""
    return {
        "supported_stt_languages": SUPPORTED_STT_LANGUAGES,
        "reviewed_warning_languages": get_reviewed_warning_languages(),
        "engine_attached": True,  # M2: detection engine active
        "maintenance": is_maintenance_mode(),
        "build_commit": os.environ.get("BUILD_COMMIT", "dev"),
        "live_sessions_available": True,
    }


@router.get("/usage")
def get_usage(x_admin_token: str | None = Header(None)) -> dict[str, Any]:
    """Today's STT seconds and TTS characters usage and caps. Protected by X-Admin-Token."""
    configured_token = get_admin_token()
    if not configured_token or x_admin_token != configured_token:
        raise HTTPException(status_code=403, detail="Forbidden: invalid X-Admin-Token")

    return get_current_day_usage()

