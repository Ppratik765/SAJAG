"""Settings loader and configuration values for Sajag API.

Reads the repo-root `.env` (if present) into the process environment without
overriding variables that are already set. Standard library only.
The API key is read here but must never be logged, printed, or returned.
"""

from __future__ import annotations

import os
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[3]
ENV_PATH = REPO_ROOT / ".env"


def load_dotenv(path: Path = ENV_PATH) -> bool:
    """Load KEY=VALUE lines from `path` into os.environ. Returns True if the file existed."""
    if not path.is_file():
        return False
    for raw in path.read_text(encoding="utf-8").splitlines():
        line = raw.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, _, value = line.partition("=")
        key = key.strip()
        # Strip inline comments only when preceded by whitespace (values may contain '#').
        if " #" in value:
            value = value.split(" #", 1)[0]
        value = value.strip().strip('"').strip("'")
        os.environ.setdefault(key, value)
    return True


load_dotenv()


def get_gnani_api_key() -> str:
    """Return the Gnani API key from environment."""
    key = os.environ.get("GNANI_API_KEY", "").strip()
    return key


def allowed_origins() -> list[str]:
    """CORS origins from ALLOWED_ORIGINS (comma-separated)."""
    raw = os.environ.get("ALLOWED_ORIGINS", "http://localhost:3000")
    return [o.strip() for o in raw.split(",") if o.strip()]


def get_daily_stt_seconds_cap() -> float:
    return float(os.environ.get("DAILY_STT_SECONDS_CAP", "1800"))


def get_daily_tts_chars_cap() -> int:
    return int(os.environ.get("DAILY_TTS_CHARS_CAP", "20000"))


def get_max_upload_seconds() -> float:
    return float(os.environ.get("MAX_UPLOAD_SECONDS", "180"))


def get_max_live_session_seconds() -> float:
    return float(os.environ.get("MAX_LIVE_SESSION_SECONDS", "180"))


def get_max_live_sessions() -> int:
    return int(os.environ.get("MAX_LIVE_SESSIONS", "3"))


def get_max_live_sessions_per_ip() -> int:
    return int(os.environ.get("MAX_LIVE_SESSIONS_PER_IP", "2"))


def get_live_idle_timeout_seconds() -> float:
    return float(os.environ.get("LIVE_IDLE_TIMEOUT_SECONDS", "20"))


def get_live_max_speech_seconds() -> float:
    return float(os.environ.get("LIVE_MAX_SPEECH_SECONDS", "6.0"))


def get_admin_token() -> str:
    return os.environ.get("ADMIN_TOKEN", "")


def is_maintenance_mode() -> bool:
    return os.environ.get("MAINTENANCE_MODE", "false").lower() in ("true", "1", "yes")


SUPPORTED_STT_LANGUAGES = [
    "bn-IN",
    "en-IN",
    "gu-IN",
    "hi-IN",
    "kn-IN",
    "ml-IN",
    "mr-IN",
    "pa-IN",
    "ta-IN",
    "te-IN",
]
