"""Gnani Prisma v2.5 Speech-to-Text REST client.

Handles chunk transcription via POST https://api.vachana.ai/stt/v3 with
strict typed errors, exponential backoff retries on 429/500/503, and
proper multipart handling. Never logs audio, transcripts, or API keys.
"""

from __future__ import annotations

import asyncio
import json
import logging
import random
import time
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Sequence

import httpx

from app.config.settings import get_gnani_api_key

logger = logging.getLogger(__name__)

GNANI_BASE_URL = "https://api.vachana.ai"
STT_ENDPOINT = f"{GNANI_BASE_URL}/stt/v3"


class GnaniError(Exception):
    """Base error for Gnani API responses."""

    def __init__(self, message: str, status_code: int | None = None, response_data: Any = None):
        super().__init__(message)
        self.status_code = status_code
        self.response_data = response_data


class GnaniAuthError(GnaniError):
    """401 Unauthorized — invalid or missing API key."""


class GnaniQuotaError(GnaniError):
    """403 Forbidden — permission denied or exhausted credits."""


class GnaniRateLimit(GnaniError):
    """429 Too Many Requests."""


class GnaniBadRequest(GnaniError):
    """400 Bad Request — invalid parameters or audio format/duration."""


class GnaniServerError(GnaniError):
    """500 / 503 Server Error."""


@dataclass(frozen=True)
class SttResult:
    transcript: str
    request_id: str | None = None
    model: str | None = None
    processing_time: float | None = None
    end_to_end_latency: float | None = None


async def transcribe_file(
    audio_path_or_bytes: Path | bytes,
    language_code: str,
    *,
    fmt: str = "verbatim",
    bias_list: Sequence[str] | None = None,
    bias_score: float = 0.0,
    api_key: str | None = None,
    client: httpx.AsyncClient | None = None,
    max_retries: int = 3,
) -> SttResult:
    """Transcribe an audio chunk (<= 28s) using Gnani Prisma v2.5 REST API."""
    resolved_key = (api_key or get_gnani_api_key()).strip()
    if not resolved_key:
        raise GnaniAuthError("Gnani API key is missing. Set GNANI_API_KEY in .env.", status_code=401)

    # Read audio bytes
    if isinstance(audio_path_or_bytes, Path):
        audio_bytes = audio_path_or_bytes.read_bytes()
        filename = audio_path_or_bytes.name
    else:
        audio_bytes = audio_path_or_bytes
        filename = "chunk.wav"

    headers = {
        "X-API-Key-ID": resolved_key,
    }

    form_data: dict[str, str] = {
        "language_code": language_code,
        "format": fmt,
    }

    if bias_list and bias_score > 0.0:
        form_data["bias_list"] = json.dumps(list(bias_list))
        form_data["bias_score"] = str(bias_score)

    files = {
        "audio_file": (filename, audio_bytes, "audio/wav"),
    }

    backoff_delays = [0.5, 1.5, 4.0]

    close_client = False
    if client is None:
        client = httpx.AsyncClient(timeout=35.0)
        close_client = True

    try:
        for attempt in range(max_retries):
            start_time = time.perf_counter()
            try:
                response = await client.post(
                    STT_ENDPOINT,
                    headers=headers,
                    data=form_data,
                    files=files,
                )
            except (httpx.TimeoutException, httpx.NetworkError) as net_err:
                if attempt == max_retries - 1:
                    raise GnaniServerError(
                        f"Gnani connection error after {max_retries} attempts: {net_err}"
                    ) from net_err
                jitter = random.uniform(0.05, 0.2)
                delay = backoff_delays[min(attempt, len(backoff_delays) - 1)] + jitter
                logger.warning(
                    "Network error calling Gnani STT (attempt %d/%d), retrying in %.2fs: %s",
                    attempt + 1,
                    max_retries,
                    delay,
                    net_err,
                )
                await asyncio.sleep(delay)
                continue

            duration = time.perf_counter() - start_time
            status = response.status_code

            # Handle 200 OK
            if status == 200:
                try:
                    payload = response.json()
                except Exception as json_err:
                    raise GnaniServerError("Gnani returned invalid JSON on 200 OK", status_code=200) from json_err

                req_id = payload.get("request_id")
                logger.info("Gnani STT success: req_id=%s duration=%.3fs", req_id, duration)

                return SttResult(
                    transcript=payload.get("transcript", ""),
                    request_id=req_id,
                    model=payload.get("model"),
                    processing_time=payload.get("processing_time"),
                    end_to_end_latency=payload.get("end_to_end_latency"),
                )

            # Non-200 responses
            error_data = None
            try:
                error_data = response.json()
            except Exception:
                error_data = {"raw": response.text}

            # 401 Unauthorized — never retry
            if status == 401:
                raise GnaniAuthError("Invalid Gnani API key (401)", status_code=401, response_data=error_data)

            # 403 Forbidden — credits or permission — never retry
            if status == 403:
                raise GnaniQuotaError("Gnani credits exhausted or forbidden (403)", status_code=403, response_data=error_data)

            # 400 Bad Request — never retry
            if status == 400:
                msg = error_data.get("error", {}).get("message") if isinstance(error_data, dict) else str(error_data)
                raise GnaniBadRequest(f"Bad request to Gnani STT (400): {msg}", status_code=400, response_data=error_data)

            # 429 Rate limit, 500/503 server error — retry with backoff
            if status in (429, 500, 502, 503, 504):
                if attempt == max_retries - 1:
                    if status == 429:
                        raise GnaniRateLimit("Gnani rate limit exceeded (429)", status_code=429, response_data=error_data)
                    raise GnaniServerError(f"Gnani server error ({status})", status_code=status, response_data=error_data)

                jitter = random.uniform(0.05, 0.25)
                delay = backoff_delays[min(attempt, len(backoff_delays) - 1)] + jitter
                logger.warning(
                    "Gnani STT returned HTTP %d (attempt %d/%d), retrying in %.2fs",
                    status,
                    attempt + 1,
                    max_retries,
                    delay,
                )
                await asyncio.sleep(delay)
                continue

            # Any other unexpected status code
            raise GnaniError(f"Unexpected Gnani HTTP {status}", status_code=status, response_data=error_data)

        raise GnaniServerError(f"Gnani STT failed after {max_retries} retries", status_code=500)
    finally:
        if close_client:
            await client.aclose()
