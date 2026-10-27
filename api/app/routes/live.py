"""Live audio streaming WebSocket route (/ws/live).

Relays 16 kHz mono PCM16 audio frames (1,024 bytes) upstream to Gnani STT.
Performs real-time deterministic scam analysis on cumulative transcripts.
Enforces session limits, idle timeouts, budget caps, and level escalation.
"""

from __future__ import annotations

import asyncio
from collections import defaultdict
import logging
import time
from typing import Any, Dict, List, Optional, Set

from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from starlette.websockets import WebSocketState

from app.config.settings import (
    SUPPORTED_STT_LANGUAGES,
    allowed_origins,
    get_daily_stt_seconds_cap,
    get_gnani_api_key,
    get_live_idle_timeout_seconds,
    get_live_max_speech_seconds,
    get_max_live_session_seconds,
    get_max_live_sessions,
    get_max_live_sessions_per_ip,
    is_maintenance_mode,
)
from app.engine.analyzer import analyze_segments
from app.gnani.stt_stream import (
    DEFAULT_GNANI_STT_WS_URL,
    FRAME_BYTES,
    GnaniAuthError,
    GnaniBadFrameError,
    GnaniQuotaError,
    GnaniSTTStreamClient,
    GnaniStreamError,
    SpeechStartEvent,
    ProcessingEvent,
    GenericUpstreamEvent,
    TranscriptEvent,
    ErrorEvent,
    EndEvent,
)
from app.gnani.usage import get_current_day_usage, record_stt_usage
from app.models.analysis import RiskLevel, Segment, Signal

logger = logging.getLogger(__name__)

router = APIRouter(tags=["live"])

# Active session tracking
_active_sessions_lock = asyncio.Lock()
_global_active_sessions = 0
_ip_active_sessions: Dict[str, int] = defaultdict(int)

LEVEL_RANKS: Dict[RiskLevel, int] = {
    "safe": 0,
    "suspicious": 1,
    "likely_scam": 2,
    "scam": 3,
}


def _get_client_ip(websocket: WebSocket) -> str:
    headers = dict(websocket.headers)
    forwarded = headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",")[0].strip()
    if websocket.client and websocket.client.host:
        return websocket.client.host
    return "127.0.0.1"


def _is_origin_allowed(websocket: WebSocket) -> bool:
    origin = websocket.headers.get("origin")
    if not origin:
        return True
    allowed = allowed_origins()
    if "*" in allowed:
        return True
    norm_origin = origin.rstrip("/")
    return norm_origin in [a.rstrip("/") for a in allowed]


def _filter_recent_segments(segments: List[Segment], max_window_s: float = 300.0) -> List[Segment]:
    """Return only segments from the last max_window_s (5 minutes) of audio."""
    if not segments:
        return []
    total_dur = sum(s.duration_s for s in segments)
    if total_dur <= max_window_s:
        return segments

    # Walk backwards from the tail
    accum = 0.0
    start_idx = len(segments) - 1
    while start_idx >= 0 and accum + segments[start_idx].duration_s <= max_window_s:
        accum += segments[start_idx].duration_s
        start_idx -= 1

    return segments[max(0, start_idx):]


@router.websocket("/ws/live")
async def live_ws(websocket: WebSocket, lang: str = "hi-IN") -> None:
    """Realtime WebSocket endpoint for speech-to-text and live scam detection."""
    global _global_active_sessions

    # 1. Maintenance check
    if is_maintenance_mode():
        await websocket.accept()
        await websocket.send_json({
            "type": "error",
            "code": "maintenance",
            "message": "Service is currently in maintenance mode.",
        })
        await websocket.close(code=1008)
        return

    # 2. Origin validation
    if not _is_origin_allowed(websocket):
        await websocket.accept()
        await websocket.send_json({
            "type": "error",
            "code": "origin_not_allowed",
            "message": "Origin not allowed.",
        })
        await websocket.close(code=1008)
        return

    # 3. Language validation
    if lang not in SUPPORTED_STT_LANGUAGES:
        await websocket.accept()
        await websocket.send_json({
            "type": "error",
            "code": "invalid_language",
            "message": f"Language '{lang}' not supported. Allowed: {SUPPORTED_STT_LANGUAGES}",
        })
        await websocket.close(code=1008)
        return

    # 4. Budget guard pre-check
    usage = get_current_day_usage()
    if usage["stt_remaining_seconds"] <= 0:
        await websocket.accept()
        await websocket.send_json({
            "type": "end",
            "reason": "budget_exhausted",
        })
        await websocket.close(code=1008)
        return

    # 5. Session limits (global & per-IP)
    client_ip = _get_client_ip(websocket)
    max_global = get_max_live_sessions()
    max_per_ip = get_max_live_sessions_per_ip()

    async with _active_sessions_lock:
        if _global_active_sessions >= max_global:
            await websocket.accept()
            await websocket.send_json({
                "type": "error",
                "code": "session_limit",
                "message": f"Max global live sessions ({max_global}) reached.",
            })
            await websocket.close(code=1008)
            return

        if _ip_active_sessions[client_ip] >= max_per_ip:
            await websocket.accept()
            await websocket.send_json({
                "type": "error",
                "code": "ip_limit",
                "message": f"Max live sessions for IP ({max_per_ip}) reached.",
            })
            await websocket.close(code=1008)
            return

        _global_active_sessions += 1
        _ip_active_sessions[client_ip] += 1

    # Accept client WebSocket
    await websocket.accept()

    # Session tracking state
    session_start_time = time.time()
    cumulative_audio_duration_ms = 0.0
    segments: List[Segment] = []
    current_level: RiskLevel = "safe"
    current_score: int = 0
    current_primary_type: str = "none"
    first_crossed: Dict[str, Optional[float]] = {
        "suspicious": None,
        "likely_scam": None,
    }
    seen_signal_keys: Set[tuple] = set()

    max_session_seconds = get_max_live_session_seconds()
    idle_timeout_seconds = get_live_idle_timeout_seconds()
    stt_remaining_s = usage["stt_remaining_seconds"]

    # Connect upstream
    api_key = get_gnani_api_key()
    upstream: Optional[GnaniSTTStreamClient] = None

    max_speech_s: Optional[float] = None
    if "max_speech_s" in websocket.query_params:
        try:
            max_speech_s = float(websocket.query_params["max_speech_s"])
        except ValueError:
            max_speech_s = get_live_max_speech_seconds()
    else:
        max_speech_s = get_live_max_speech_seconds()

    try:
        upstream = GnaniSTTStreamClient(
            api_key=api_key or "DUMMY_KEY_FOR_TESTS",
            language_code=lang,
            sample_rate=16000,
            vad_threshold=0.5,
            min_silence_ms=700,
            max_speech_s=max_speech_s,
        )
        await upstream.connect()
        await websocket.send_json({"type": "ready"})
    except (GnaniAuthError, GnaniQuotaError) as exc:
        err_code = "upstream_quota" if isinstance(exc, GnaniQuotaError) else "upstream_auth"
        await websocket.send_json({"type": "error", "code": err_code, "message": str(exc)})
        await websocket.close(code=1008)
        return
    except Exception as exc:
        logger.error("Failed to connect upstream STT: %s", exc)
        await websocket.send_json({"type": "error", "code": "upstream_error", "message": str(exc)})
        await websocket.close(code=1011)
        return

    # Relay loops
    client_done_event = asyncio.Event()

    async def client_to_upstream() -> None:
        nonlocal cumulative_audio_duration_ms
        bad_frame_count = 0
        last_audio_time = time.time()

        while not client_done_event.is_set():
            now = time.time()
            # 1. Enforce max session time limit
            elapsed = now - session_start_time
            if elapsed >= max_session_seconds:
                await websocket.send_json({"type": "end", "reason": "time_limit"})
                client_done_event.set()
                break

            # 2. Enforce daily budget during session
            total_stt_consumed = max(elapsed, cumulative_audio_duration_ms / 1000.0)
            if total_stt_consumed >= stt_remaining_s:
                await websocket.send_json({"type": "end", "reason": "budget_exhausted"})
                client_done_event.set()
                break

            # 3. Receive next frame with idle timeout
            timeout = min(idle_timeout_seconds, max(0.1, max_session_seconds - elapsed))
            try:
                msg = await asyncio.wait_for(websocket.receive(), timeout=timeout)
            except asyncio.TimeoutError:
                # If idle timeout exceeded
                if time.time() - last_audio_time >= idle_timeout_seconds:
                    await websocket.send_json({"type": "end", "reason": "idle_timeout"})
                    client_done_event.set()
                    break
                continue
            except Exception as e:
                logger.info("live client receive ended: %s", type(e).__name__)
                client_done_event.set()
                break

            msg_type = msg.get("type")
            if msg_type == "websocket.disconnect":
                client_done_event.set()
                break

            raw_bytes = msg.get("bytes")
            if raw_bytes is None or len(raw_bytes) != FRAME_BYTES:
                bad_frame_count += 1
                if bad_frame_count > 20:
                    await websocket.send_json({
                        "type": "error",
                        "code": "bad_frames",
                        "message": "Too many invalid audio frames (>20). Socket closed.",
                    })
                    client_done_event.set()
                    break
                continue

            # Valid 1,024-byte PCM16 audio frame: forward upstream immediately
            last_audio_time = time.time()
            try:
                await upstream.send_audio_frame(raw_bytes)
            except Exception as exc:
                logger.warning("Upstream send failed: %s", exc)
                await websocket.send_json({"type": "end", "reason": "upstream_closed"})
                break

        # Flush ~1.5s silence frames (47 frames @ 32ms cadence = 1.504s) so upstream VAD finalises the last segment
        if upstream and upstream.is_connected:
            silent_frame = b"\x00" * FRAME_BYTES
            for _ in range(47):
                if not upstream.is_connected:
                    break
                try:
                    await upstream.send_audio_frame(silent_frame)
                    await asyncio.sleep(0.032)
                except Exception:
                    break
            # Short grace window for upstream to deliver final transcript packet
            await asyncio.sleep(0.8)

        client_done_event.set()

    async def upstream_to_client() -> None:
        nonlocal cumulative_audio_duration_ms, current_level, current_score, current_primary_type

        async def _safe_send_json(payload: Dict[str, Any]) -> None:
            try:
                if websocket.client_state == WebSocketState.CONNECTED:
                    await websocket.send_json(payload)
            except Exception:
                pass

        try:
            async for ev in upstream.recv_events():
                if client_done_event.is_set():
                    break

                if isinstance(ev, SpeechStartEvent):
                    await _safe_send_json({"type": "speech", "utterance_id": ev.utterance_id, "timestamp": ev.timestamp})
                elif isinstance(ev, ProcessingEvent):
                    await _safe_send_json({"type": "processing", "timestamp": ev.timestamp})
                elif isinstance(ev, GenericUpstreamEvent):
                    await _safe_send_json({"type": "upstream_raw", "raw_type": ev.raw_type, "data": ev.data, "timestamp": ev.timestamp})
                elif isinstance(ev, TranscriptEvent):
                    seg_dur_s = round(ev.audio_duration_ms / 1000.0, 3)
                    offset_s = round(cumulative_audio_duration_ms / 1000.0, 3)
                    cumulative_audio_duration_ms += ev.audio_duration_ms

                    seg = Segment(
                        index=ev.segment_index,
                        text=ev.text,
                        offset_s=offset_s,
                        duration_s=seg_dur_s,
                    )
                    segments.append(seg)

                    # Send transcript segment
                    await _safe_send_json({
                        "type": "transcript",
                        "index": ev.segment_index,
                        "text": ev.text,
                        "audio_duration_ms": ev.audio_duration_ms,
                        "latency": ev.latency,
                    })

                    # Re-run engine on windowed cumulative transcript (last 5 min max)
                    window_segs = _filter_recent_segments(segments, max_window_s=300.0)
                    total_audio_s = round(cumulative_audio_duration_ms / 1000.0, 2)
                    analysis = analyze_segments(
                        window_segs,
                        language_code=lang,
                        total_duration=total_audio_s,
                    )

                    # Level escalation rule: never downgrade level within a session
                    new_level = analysis.level
                    if LEVEL_RANKS[new_level] > LEVEL_RANKS[current_level]:
                        current_level = new_level
                    current_score = max(current_score, analysis.score)
                    if analysis.primary_type != "none":
                        current_primary_type = analysis.primary_type

                    # Update first_crossed audio timestamps
                    if current_level in ("suspicious", "likely_scam", "scam") and first_crossed["suspicious"] is None:
                        first_crossed["suspicious"] = total_audio_s
                    if current_level in ("likely_scam", "scam") and first_crossed["likely_scam"] is None:
                        first_crossed["likely_scam"] = total_audio_s

                    # Extract newly identified signals
                    new_signals: List[Dict[str, Any]] = []
                    for sig in analysis.signals:
                        sig_key = (sig.category, sig.evidence, sig.segment_index)
                        if sig_key not in seen_signal_keys:
                            seen_signal_keys.add(sig_key)
                            new_signals.append(sig.model_dump())

                    risk_msg = {
                        "type": "risk",
                        "level": current_level,
                        "score": current_score,
                        "primary_type": current_primary_type,
                        "new_signals": new_signals,
                        "elapsed_s": round(time.time() - session_start_time, 2),
                        "first_crossed": {
                            "suspicious": first_crossed["suspicious"],
                            "likely_scam": first_crossed["likely_scam"],
                        },
                    }
                    await _safe_send_json(risk_msg)

                elif isinstance(ev, ErrorEvent):
                    await _safe_send_json({
                        "type": "error",
                        "code": ev.code,
                        "message": ev.message,
                    })
                elif isinstance(ev, EndEvent):
                    await _safe_send_json({"type": "end", "reason": ev.reason})
                    client_done_event.set()
                    break

        except Exception as exc:
            logger.warning("Error receiving from upstream: %s", exc)
            if not client_done_event.is_set():
                await _safe_send_json({"type": "end", "reason": "upstream_closed"})
                client_done_event.set()

    # Run both loops concurrently
    t_client = asyncio.create_task(client_to_upstream())
    t_upstream = asyncio.create_task(upstream_to_client())

    try:
        done, pending = await asyncio.wait(
            [t_client, t_upstream],
            return_when=asyncio.FIRST_COMPLETED,
        )
        for t in pending:
            t.cancel()
    except (WebSocketDisconnect, asyncio.CancelledError):
        pass
    finally:
        # Cleanup tasks
        t_client.cancel()
        t_upstream.cancel()

        # Decrement session counters immediately so slots are freed
        async with _active_sessions_lock:
            _global_active_sessions = max(0, _global_active_sessions - 1)
            _ip_active_sessions[client_ip] = max(0, _ip_active_sessions[client_ip] - 1)
            if _ip_active_sessions[client_ip] == 0:
                _ip_active_sessions.pop(client_ip, None)

        # Usage recording: larger of wall clock and audio duration
        try:
            session_wall_clock_s = round(time.time() - session_start_time, 2)
            audio_dur_s = round(cumulative_audio_duration_ms / 1000.0, 2)
            total_stt_s = max(session_wall_clock_s, audio_dur_s)
            record_stt_usage(total_stt_s)
        except Exception as exc:
            logger.warning("Error recording usage: %s", exc)

        # Close upstream client
        try:
            if upstream:
                await asyncio.wait_for(upstream.close(), timeout=1.0)
        except Exception as exc:
            logger.warning("Error closing upstream: %s", exc)

        # Close client WebSocket if still connected
        try:
            if websocket.client_state == WebSocketState.CONNECTED:
                await asyncio.wait_for(websocket.close(), timeout=1.0)
        except Exception:
            pass
