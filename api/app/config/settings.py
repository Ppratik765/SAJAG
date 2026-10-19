"""Minimal settings loader.

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


def allowed_origins() -> list[str]:
    """CORS origins from ALLOWED_ORIGINS (comma-separated)."""
    raw = os.environ.get("ALLOWED_ORIGINS", "http://localhost:3000")
    return [o.strip() for o in raw.split(",") if o.strip()]
