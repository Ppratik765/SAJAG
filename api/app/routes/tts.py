"""TTS warning audio route (M5).

Provides POST /api/tts/warning to serve synthesized voice warning alerts and
explanations using reviewed templates only. Never accepts arbitrary free text.
"""

from __future__ import annotations

import logging
import time
from pathlib import Path
from typing import Any

import yaml
from fastapi import APIRouter, HTTPException, Request, Response

from app.config.settings import REPO_ROOT
from app.config.voices import get_default_warning_voice
from app.gnani.tts_rest import _cache_key, CACHE_DIR, synthesize
from app.gnani.usage import BudgetExhausted, check_tts_budget

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/tts", tags=["tts"])

WARNINGS_PATH = REPO_ROOT / "api" / "app" / "config" / "warnings.yaml"
ALLOWED_KINDS = {"alert_scam", "alert_suspicious", "explain"}
ALLOWED_REQUEST_FIELDS = {"kind", "scam_type", "language_code"}

# In-memory per-IP sliding window rate limiter: 5 requests / 60s
_ip_rate_limits: dict[str, list[float]] = {}
RATE_LIMIT_MAX_REQUESTS = 5
RATE_LIMIT_WINDOW_SECONDS = 60.0


def _load_warnings() -> dict[str, Any]:
    """Load warning templates from warnings.yaml."""
    if not WARNINGS_PATH.is_file():
        raise RuntimeError(f"Warnings config not found at {WARNINGS_PATH}")
    with open(WARNINGS_PATH, "r", encoding="utf-8") as f:
        return yaml.safe_load(f) or {}


def _reset_rate_limits() -> None:
    """Helper for testing to reset rate limit counters."""
    _ip_rate_limits.clear()


def _check_rate_limit(client_ip: str) -> None:
    """Enforce 5 requests per minute per IP."""
    now = time.time()
    cutoff = now - RATE_LIMIT_WINDOW_SECONDS
    history = [t for t in _ip_rate_limits.get(client_ip, []) if t > cutoff]
    if len(history) >= RATE_LIMIT_MAX_REQUESTS:
        raise HTTPException(
            status_code=429,
            detail={"code": "rate_limit_exceeded", "message": "TTS warning limit of 5 requests per minute exceeded."},
        )
    history.append(now)
    _ip_rate_limits[client_ip] = history


@router.post("/warning")
async def warning_tts_route(request: Request) -> Response:
    """Synthesize voice warning or scam explanation from reviewed templates only.
    
    Rejects any free text or unknown types/kinds/languages with 400.
    Enforces 5 requests/min per IP and daily TTS budget cap.
    """
    client_ip = request.client.host if request.client else "127.0.0.1"
    _check_rate_limit(client_ip)

    try:
        body = await request.json()
    except Exception:
        raise HTTPException(status_code=400, detail={"code": "invalid_json", "message": "Invalid JSON body."})

    if not isinstance(body, dict):
        raise HTTPException(status_code=400, detail={"code": "invalid_body", "message": "Expected JSON object."})

    # Hard rejection of arbitrary free text or unrecognized parameters
    extra_fields = set(body.keys()) - ALLOWED_REQUEST_FIELDS
    if extra_fields:
        raise HTTPException(
            status_code=400,
            detail={
                "code": "extra_fields_forbidden",
                "message": f"Arbitrary fields {sorted(extra_fields)} are forbidden. Free text is never accepted.",
            },
        )

    kind = body.get("kind")
    language_code = body.get("language_code")
    scam_type = body.get("scam_type")

    if not kind or not isinstance(kind, str) or kind not in ALLOWED_KINDS:
        raise HTTPException(
            status_code=400,
            detail={"code": "invalid_kind", "message": f"kind must be one of {sorted(ALLOWED_KINDS)}"},
        )

    if not language_code or not isinstance(language_code, str):
        raise HTTPException(
            status_code=400,
            detail={"code": "missing_language", "message": "language_code is required."},
        )

    warnings_cfg = _load_warnings()
    languages = warnings_cfg.get("languages", {})
    if language_code not in languages:
        raise HTTPException(
            status_code=400,
            detail={"code": "unsupported_language", "message": f"Language {language_code} has no warning templates."},
        )

    lang_data = languages[language_code]
    if kind == "explain":
        if not scam_type or not isinstance(scam_type, str):
            raise HTTPException(
                status_code=400,
                detail={"code": "missing_scam_type", "message": "scam_type is required for explain kind."},
            )
        explains = lang_data.get("explain", {})
        if scam_type not in explains:
            raise HTTPException(
                status_code=400,
                detail={"code": "unknown_scam_type", "message": f"Scam type {scam_type} is not in playbook templates."},
            )
        text_to_speak = explains[scam_type]
    elif kind == "alert_scam":
        text_to_speak = lang_data.get("alert_scam", "")
    elif kind == "alert_suspicious":
        text_to_speak = lang_data.get("alert_suspicious", "")
    else:
        raise HTTPException(status_code=400, detail={"code": "invalid_kind", "message": "Unknown kind."})

    if not text_to_speak:
        raise HTTPException(status_code=400, detail={"code": "empty_template", "message": "Template text is empty."})

    # Voice selection
    voice = get_default_warning_voice(language_code)
    model = "timbre-v2.5"
    speed = 1.0
    container = "mp3"
    sample_rate = 24000
    bitrate = "64k"

    # Content-addressed cache check (0 credits)
    key_hash = _cache_key(text_to_speak, language_code, voice, model, speed, container, sample_rate, bitrate)
    cache_path = CACHE_DIR / f"{key_hash}.mp3"
    if cache_path.is_file() and cache_path.stat().st_size > 0:
        return Response(content=cache_path.read_bytes(), media_type="audio/mpeg", headers={"X-Cache": "HIT"})

    # Check daily budget cap before synthesis
    try:
        check_tts_budget(len(text_to_speak))
    except BudgetExhausted as err:
        raise HTTPException(
            status_code=503,
            detail={"code": "budget_exhausted", "message": str(err)},
        )

    # Synthesize audio
    try:
        audio_bytes = await synthesize(
            text=text_to_speak,
            language=language_code,
            voice=voice,
            model=model,
            speed=speed,
            container=container,
            sample_rate=sample_rate,
            bitrate=bitrate,
            use_cache=True,
        )
    except Exception as err:
        logger.error("TTS warning synthesis failed: %s", err)
        raise HTTPException(status_code=500, detail={"code": "tts_error", "message": "Failed to synthesize warning audio."})

    return Response(content=audio_bytes, media_type="audio/mpeg", headers={"X-Cache": "MISS"})
