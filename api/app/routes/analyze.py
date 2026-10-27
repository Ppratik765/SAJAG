"""Audio and Text Analysis routes (M1 & M2).

- /api/analyze/audio: Splits audio into <= 28s chunks, transcribes via Gnani Prisma REST,
  reassembles transcript segments, runs deterministic detection engine, and returns AnalysisResult.
- /api/analyze/text: Runs deterministic detection engine on pasted/text transcript.
"""

from __future__ import annotations

import asyncio
import logging
import shutil
import tempfile
import uuid
from pathlib import Path
from typing import Any

from fastapi import APIRouter, File, Form, HTTPException, Request, UploadFile
from fastapi.responses import JSONResponse

from app.config.settings import SUPPORTED_STT_LANGUAGES, is_maintenance_mode
from app.gnani.stt_rest import (
    GnaniAuthError,
    GnaniBadRequest,
    GnaniQuotaError,
    GnaniRateLimit,
    GnaniServerError,
    transcribe_file,
)
from app.gnani.usage import (
    BudgetExhausted,
    check_stt_budget,
    record_stt_usage,
)
from app.util.audio import (
    AudioError,
    AudioTooLarge,
    AudioTooLong,
    split_on_silence,
    to_wav_16k_mono,
    validate_upload,
)
from app.util.rate_limit import check_rate_limit, get_client_ip
from app.models.analysis import (
    AnalysisResult,
    Segment,
    TextAnalysisRequest,
)
from app.engine.analyzer import analyze_text, analyze_segments

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/analyze", tags=["analyze"])


@router.post("/text")
async def analyze_text_route(req: TextAnalysisRequest, request: Request) -> JSONResponse:
    """Analyze a pasted message or text transcript with the deterministic detection engine.

    Works offline of any speech API, uses 0 speech credits, and continues to work
    during maintenance mode. Enforces 30 requests/min rate limit per IP.
    """
    client_ip = get_client_ip(request)
    check_rate_limit(client_ip, "analyze_text", 30, 60.0)

    clean_text = req.text.strip()
    result = analyze_text(clean_text, language_code=req.language_code)
    return JSONResponse(status_code=200, content=result.model_dump())


@router.post("/audio")
async def analyze_audio(
    request: Request,
    file: UploadFile = File(...),
    language_code: str = Form("hi-IN"),
) -> JSONResponse:
    """Analyze/transcribe uploaded audio (<= 3 min, <= 25MB) with attached detection engine."""
    client_ip = get_client_ip(request)
    check_rate_limit(client_ip, "analyze_audio", 10, 60.0)

    if is_maintenance_mode():
        return JSONResponse(
            status_code=503,
            content={"error": {"code": "maintenance", "message": "Service is currently in maintenance mode."}},
        )

    if language_code not in SUPPORTED_STT_LANGUAGES:
        return JSONResponse(
            status_code=400,
            content={
                "error": {
                    "code": "invalid_language",
                    "message": f"Language '{language_code}' not supported. Allowed: {SUPPORTED_STT_LANGUAGES}",
                }
            },
        )

    temp_dir = Path(tempfile.mkdtemp(prefix="sajag_upload_"))
    try:
        raw_upload_path = temp_dir / (file.filename or "uploaded_audio")
        content = await file.read()
        raw_upload_path.write_bytes(content)

        # 1. Validate file size and audio duration
        try:
            total_duration = validate_upload(len(content), raw_upload_path)
        except AudioTooLarge as err:
            return JSONResponse(status_code=400, content={"error": {"code": "audio_too_large", "message": str(err)}})
        except AudioTooLong as err:
            return JSONResponse(status_code=400, content={"error": {"code": "audio_too_long", "message": str(err)}})
        except (AudioError, Exception) as err:
            return JSONResponse(status_code=400, content={"error": {"code": "invalid_audio", "message": f"Could not read audio file: {err}"}})

        # 2. Check budget guard before spending STT credits
        try:
            check_stt_budget(total_duration)
        except BudgetExhausted as err:
            return JSONResponse(status_code=503, content={"error": {"code": "budget_exhausted", "message": str(err)}})

        # 3. Convert to 16 kHz mono WAV
        normalized_wav = temp_dir / "normalized_16k.wav"
        to_wav_16k_mono(raw_upload_path, normalized_wav)

        # 4. Split into chunks <= 28s
        chunks = split_on_silence(normalized_wav, target_s=25.0, max_s=28.0, out_dir=temp_dir / "chunks")

        # 5. Transcribe chunks in order with concurrency <= 3
        semaphore = asyncio.Semaphore(3)

        async def _transcribe_chunk(chunk_path: Path, dur: float, offset: float, index: int) -> dict[str, Any]:
            async with semaphore:
                res = await transcribe_file(chunk_path, language_code)
                return {
                    "index": index,
                    "text": res.transcript.strip(),
                    "duration_s": dur,
                    "offset_s": offset,
                    "request_id": res.request_id,
                }

        tasks = [
            _transcribe_chunk(path, dur, off, idx)
            for idx, (path, dur, off) in enumerate(chunks)
        ]
        chunk_results = await asyncio.gather(*tasks)

        # Sort in original sequence order
        chunk_results.sort(key=lambda x: x["index"])

        # 6. Record real STT usage
        record_stt_usage(total_duration)

        # 7. Convert to Segment objects
        segments = [
            Segment(
                index=c["index"],
                text=c["text"],
                duration_s=round(c["duration_s"], 2),
                offset_s=round(c["offset_s"], 2),
            )
            for c in chunk_results
        ]

        # 8. Run deterministic detection engine (M2 attached)
        analysis = analyze_segments(
            segments=segments,
            language_code=language_code,
            total_duration=round(total_duration, 2),
        )

        return JSONResponse(status_code=200, content=analysis.model_dump())

    except GnaniAuthError as err:
        return JSONResponse(status_code=500, content={"error": {"code": "auth_error", "message": str(err)}})
    except GnaniQuotaError as err:
        return JSONResponse(status_code=503, content={"error": {"code": "quota_exhausted", "message": str(err)}})
    except GnaniRateLimit as err:
        return JSONResponse(status_code=429, content={"error": {"code": "rate_limit", "message": str(err)}})
    except GnaniBadRequest as err:
        return JSONResponse(status_code=400, content={"error": {"code": "bad_request", "message": str(err)}})
    except GnaniServerError as err:
        return JSONResponse(status_code=503, content={"error": {"code": "upstream_error", "message": str(err)}})
    except AudioError as err:
        return JSONResponse(status_code=400, content={"error": {"code": "invalid_audio", "message": f"Audio processing error: {err}"}})
    except Exception as err:
        logger.exception("Unexpected error in /api/analyze/audio: %s", err)
        return JSONResponse(status_code=500, content={"error": {"code": "server_error", "message": str(err)}})
    finally:
        # Guarantee temp files are wiped in finally
        shutil.rmtree(temp_dir, ignore_errors=True)
