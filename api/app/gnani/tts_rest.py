"""Gnani Timbre v2.5 Text-to-Speech REST client.

Synthesizes speech via POST https://api.vachana.ai/api/v1/tts/inference with
content-addressed disk caching (sha256), typed error handling, retry policy
with exponential backoff, budget enforcement, and WAV header repair.
"""

from __future__ import annotations

import asyncio
import hashlib
import json
import logging
import random
import struct
import time
from pathlib import Path
from typing import Any

import httpx

from app.config.settings import REPO_ROOT, get_gnani_api_key
from app.gnani.stt_rest import (
    GnaniAuthError,
    GnaniBadRequest,
    GnaniError,
    GnaniQuotaError,
    GnaniRateLimit,
    GnaniServerError,
)
from app.gnani.usage import check_tts_budget, record_tts_usage

logger = logging.getLogger(__name__)

GNANI_BASE_URL = "https://api.vachana.ai"
TTS_ENDPOINT = f"{GNANI_BASE_URL}/api/v1/tts/inference"
CACHE_DIR = REPO_ROOT / "api" / ".cache" / "tts"


def _cache_key(
    text: str,
    language: str,
    voice: str,
    model: str,
    speed: float,
    container: str,
    sample_rate: int,
    bitrate: str,
) -> str:
    """Compute sha256 cache key from synthesis parameters."""
    token = f"{model}:{voice}:{language}:{speed}:{container}:{sample_rate}:{bitrate}:{text}"
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def repair_wav_header(content: bytes) -> bytes:
    """Repair streaming WAV header with placeholder 0xFFFFFFFF sizes for standard decoders."""
    if len(content) < 44 or not content.startswith(b"RIFF"):
        return content

    raw = bytearray(content)
    struct.pack_into("<I", raw, 4, len(raw) - 8)
    data_idx = raw.find(b"data")
    if data_idx != -1:
        struct.pack_into("<I", raw, data_idx + 4, len(raw) - (data_idx + 8))
    return bytes(raw)


async def synthesize(
    text: str,
    language: str,
    voice: str,
    *,
    model: str = "timbre-v2.5",
    speed: float = 1.0,
    container: str = "mp3",
    sample_rate: int = 24000,
    bitrate: str = "64k",
    api_key: str | None = None,
    client: httpx.AsyncClient | None = None,
    use_cache: bool = True,
    max_retries: int = 3,
) -> bytes:
    """Synthesize text to speech using Gnani Timbre REST API.
    
    Uses content-addressed disk cache under api/.cache/tts/.
    Cache hit = 0 credits, 0 latency.
    """
    cleaned_text = text.strip()
    if not cleaned_text:
        raise GnaniBadRequest("TTS text cannot be empty.", status_code=400)

    # Check cache first
    key_hash = _cache_key(cleaned_text, language, voice, model, speed, container, sample_rate, bitrate)
    ext = "wav" if container.lower() == "wav" else "mp3"
    cache_path = CACHE_DIR / f"{key_hash}.{ext}"

    if use_cache and cache_path.is_file():
        cached_data = cache_path.read_bytes()
        if len(cached_data) > 0:
            logger.info("TTS cache hit for voice=%s lang=%s (0 credits)", voice, language)
            return cached_data

    # Check budget before sending
    check_tts_budget(len(cleaned_text))

    resolved_key = (api_key or get_gnani_api_key()).strip()
    if not resolved_key:
        raise GnaniAuthError("Gnani API key is missing. Set GNANI_API_KEY in .env.", status_code=401)

    headers = {
        "X-API-Key-ID": resolved_key,
        "Content-Type": "application/json",
    }

    body = {
        "text": cleaned_text,
        "model": model,
        "voice": voice,
        "language": language,
        "speed": speed,
        "audio_config": {
            "sample_rate": sample_rate,
            "num_channels": 1,
            "sample_width": 2,
            "encoding": "linear_pcm" if container.lower() == "wav" else "mp3",
            "container": container.lower(),
        },
    }

    should_close_client = False
    if client is None:
        client = httpx.AsyncClient(timeout=httpx.Timeout(connect=10.0, read=45.0, write=15.0, pool=10.0))
        should_close_client = True

    try:
        last_error: Exception | None = None
        for attempt in range(max_retries + 1):
            t0 = time.perf_counter()
            try:
                resp = await client.post(TTS_ENDPOINT, headers=headers, json=body)
                elapsed = time.perf_counter() - t0

                if resp.status_code == 200:
                    raw_audio = resp.content
                    if container.lower() == "wav":
                        raw_audio = repair_wav_header(raw_audio)

                    # Record verified usage
                    record_tts_usage(len(cleaned_text))

                    # Save to cache
                    try:
                        CACHE_DIR.mkdir(parents=True, exist_ok=True)
                        cache_path.write_bytes(raw_audio)
                    except Exception as err:
                        logger.warning("Failed writing TTS cache: %s", err)

                    logger.info("TTS success in %.2fs: %d bytes synthesized", elapsed, len(raw_audio))
                    return raw_audio

                if resp.status_code == 401:
                    raise GnaniAuthError("Gnani API authentication failed (401). Check GNANI_API_KEY.", status_code=401)
                elif resp.status_code == 403:
                    raise GnaniQuotaError("Gnani API credit quota exhausted or forbidden (403).", status_code=403)
                elif resp.status_code == 400:
                    raise GnaniBadRequest(f"Gnani TTS bad request (400): {resp.text[:300]}", status_code=400)
                elif resp.status_code in (429, 500, 502, 503, 504):
                    err_msg = f"Gnani TTS HTTP {resp.status_code}: {resp.text[:200]}"
                    if attempt < max_retries:
                        backoff = (2 ** attempt) + random.uniform(0.1, 0.5)
                        logger.warning("%s. Retrying in %.2fs (attempt %d/%d)...", err_msg, backoff, attempt + 1, max_retries)
                        await asyncio.sleep(backoff)
                        continue
                    if resp.status_code == 429:
                        raise GnaniRateLimit(err_msg, status_code=429)
                    raise GnaniServerError(err_msg, status_code=resp.status_code)
                else:
                    raise GnaniError(f"Gnani TTS unexpected HTTP {resp.status_code}: {resp.text[:200]}", status_code=resp.status_code)

            except (httpx.TimeoutException, httpx.NetworkError) as net_err:
                last_error = net_err
                if attempt < max_retries:
                    backoff = (2 ** attempt) + random.uniform(0.1, 0.5)
                    logger.warning("Gnani TTS network/timeout error: %s. Retrying in %.2fs...", net_err, backoff)
                    await asyncio.sleep(backoff)
                    continue
                raise GnaniServerError(f"Gnani TTS failed after {max_retries} retries: {net_err}") from net_err

        if last_error:
            raise GnaniServerError(f"Gnani TTS request failed: {last_error}") from last_error
        raise GnaniServerError("Gnani TTS request failed after max retries.")

    finally:
        if should_close_client:
            await client.aclose()
