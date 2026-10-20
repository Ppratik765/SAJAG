"""Usage tracking and daily budget guard for Gnani credits.

Persists day-bucketed counters to api/.cache/usage.json.
When daily cap is reached, raises BudgetExhausted which endpoints
map to HTTP 503 budget_exhausted.
"""

from __future__ import annotations

import json
import logging
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from app.config.settings import (
    REPO_ROOT,
    get_daily_stt_seconds_cap,
    get_daily_tts_chars_cap,
)

logger = logging.getLogger(__name__)

CACHE_DIR = REPO_ROOT / "api" / ".cache"
USAGE_FILE = CACHE_DIR / "usage.json"


class BudgetExhausted(Exception):
    """Raised when daily STT seconds or TTS characters cap would be exceeded."""

    def __init__(self, message: str, kind: str):
        super().__init__(message)
        self.kind = kind


def _get_today_str() -> str:
    """Return YYYY-MM-DD in UTC (or IST aligned)."""
    return datetime.now(timezone.utc).strftime("%Y-%m-%d")


def _read_usage_data() -> dict[str, Any]:
    if not USAGE_FILE.is_file():
        return {}
    try:
        return json.loads(USAGE_FILE.read_text(encoding="utf-8"))
    except Exception as err:
        logger.warning("Could not read usage cache: %s", err)
        return {}


def _write_usage_data(data: dict[str, Any]) -> None:
    try:
        CACHE_DIR.mkdir(parents=True, exist_ok=True)
        USAGE_FILE.write_text(json.dumps(data, indent=2), encoding="utf-8")
    except Exception as err:
        logger.warning("Could not write usage cache: %s", err)


def get_current_day_usage() -> dict[str, Any]:
    """Return usage counts and caps for today."""
    today = _get_today_str()
    data = _read_usage_data()
    day_stats = data.get(today, {"stt_seconds": 0.0, "tts_chars": 0})
    stt_cap = get_daily_stt_seconds_cap()
    tts_cap = get_daily_tts_chars_cap()

    return {
        "date": today,
        "stt_seconds": round(float(day_stats.get("stt_seconds", 0.0)), 2),
        "tts_chars": int(day_stats.get("tts_chars", 0)),
        "stt_seconds_cap": stt_cap,
        "tts_chars_cap": tts_cap,
        "stt_remaining_seconds": max(0.0, round(stt_cap - float(day_stats.get("stt_seconds", 0.0)), 2)),
        "tts_remaining_chars": max(0, tts_cap - int(day_stats.get("tts_chars", 0))),
    }


def check_stt_budget(projected_seconds: float) -> None:
    """Check if adding projected_seconds would exceed daily cap."""
    usage = get_current_day_usage()
    if usage["stt_seconds"] + projected_seconds > usage["stt_seconds_cap"]:
        raise BudgetExhausted(
            f"Daily STT budget exhausted: {usage['stt_seconds']:.1f}s used + {projected_seconds:.1f}s projected > {usage['stt_seconds_cap']}s cap",
            kind="stt",
        )


def check_tts_budget(projected_chars: int) -> None:
    """Check if adding projected_chars would exceed daily cap."""
    usage = get_current_day_usage()
    if usage["tts_chars"] + projected_chars > usage["tts_chars_cap"]:
        raise BudgetExhausted(
            f"Daily TTS budget exhausted: {usage['tts_chars']} chars used + {projected_chars} projected > {usage['tts_chars_cap']} cap",
            kind="tts",
        )


def record_stt_usage(seconds: float) -> None:
    """Record verified STT seconds consumed."""
    if seconds <= 0:
        return
    today = _get_today_str()
    data = _read_usage_data()
    day_stats = data.setdefault(today, {"stt_seconds": 0.0, "tts_chars": 0})
    day_stats["stt_seconds"] = round(float(day_stats.get("stt_seconds", 0.0)) + seconds, 2)
    _write_usage_data(data)
    logger.info("Recorded %0.2fs STT usage. Total today: %0.2fs", seconds, day_stats["stt_seconds"])


def record_tts_usage(chars: int) -> None:
    """Record verified TTS characters synthesized."""
    if chars <= 0:
        return
    today = _get_today_str()
    data = _read_usage_data()
    day_stats = data.setdefault(today, {"stt_seconds": 0.0, "tts_chars": 0})
    day_stats["tts_chars"] = int(day_stats.get("tts_chars", 0)) + chars
    _write_usage_data(data)
    logger.info("Recorded %d TTS chars usage. Total today: %d", chars, day_stats["tts_chars"])
