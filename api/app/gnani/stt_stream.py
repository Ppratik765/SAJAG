"""Async streaming client for Gnani STT WebSocket (v3).

Connects to wss://api.vachana.ai/stt/v3/stream with server-side authentication headers.
Yields typed events: connected, speech_start, transcript, error, end.
Enforces the 1,024-byte PCM16 LE frame invariant.
Never logs the API key or audio payloads.
"""

from __future__ import annotations

import asyncio
import json
import logging
import os
from dataclasses import dataclass
from typing import Any, AsyncGenerator, Dict, Optional

import websockets
from websockets.exceptions import ConnectionClosed

logger = logging.getLogger(__name__)

DEFAULT_GNANI_STT_WS_URL = "wss://api.vachana.ai/stt/v3/stream"
FRAME_BYTES = 1024  # 512 samples of 16-bit PCM (32 ms @ 16 kHz)


class GnaniStreamError(Exception):
    """Base error for Gnani streaming STT."""


class GnaniAuthError(GnaniStreamError):
    """Invalid API key or unauthorized access (401/403)."""


class GnaniQuotaError(GnaniStreamError):
    """Upstream quota or rate limit exceeded."""


class GnaniBadFrameError(GnaniStreamError):
    """Invalid frame sent to upstream (must be exactly 1,024 bytes)."""


@dataclass
class ConnectedEvent:
    type: str = "connected"
    message: str = ""
    request_id: str = ""
    config: Dict[str, Any] = None
    timestamp: str = ""


@dataclass
class SpeechStartEvent:
    type: str = "speech_start"
    utterance_id: str = ""
    timestamp: str = ""


@dataclass
class TranscriptEvent:
    type: str = "transcript"
    text: str = ""
    audio_duration_ms: float = 0.0
    segment_index: int = 0
    utterance_id: str = ""
    is_final: bool = True
    latency: int = 0
    timestamp: str = ""


@dataclass
class ProcessingEvent:
    type: str = "processing"
    timestamp: str = ""


@dataclass
class GenericUpstreamEvent:
    type: str = "upstream_raw"
    raw_type: str = ""
    data: Dict[str, Any] = None
    timestamp: str = ""


@dataclass
class ErrorEvent:
    type: str = "error"
    code: str = ""
    message: str = ""


@dataclass
class EndEvent:
    type: str = "end"
    reason: str = ""


StreamEvent = (
    ConnectedEvent
    | SpeechStartEvent
    | ProcessingEvent
    | TranscriptEvent
    | GenericUpstreamEvent
    | ErrorEvent
    | EndEvent
)


class GnaniSTTStreamClient:
    """Async client managing an upstream WebSocket session with Gnani STT."""

    def __init__(
        self,
        api_key: str,
        language_code: str,
        *,
        ws_url: Optional[str] = None,
        sample_rate: int = 16000,
        vad_threshold: float = 0.5,
        min_silence_ms: int = 700,
        max_speech_s: Optional[float] = None,
    ):
        if not api_key:
            raise GnaniAuthError("Gnani API key is required.")
        self.api_key = api_key
        self.language_code = language_code
        self.ws_url = ws_url or os.environ.get("GNANI_STT_WS_URL", DEFAULT_GNANI_STT_WS_URL)
        self.sample_rate = sample_rate
        self.vad_threshold = vad_threshold
        self.min_silence_ms = min_silence_ms
        self.max_speech_s = max_speech_s

        self._ws: Optional[websockets.WebSocketClientProtocol] = None
        self._is_connected = False
        self._audio_duration_accum_ms = 0.0

    @property
    def is_connected(self) -> bool:
        return self._is_connected and self._ws is not None

    @property
    def total_audio_duration_ms(self) -> float:
        return self._audio_duration_accum_ms

    async def connect(self) -> ConnectedEvent:
        """Connect to upstream Gnani STT WebSocket and await handshake connected event."""
        headers = {
            "x-api-key-id": self.api_key,
            "lang_code": self.language_code,
            "x-sample-rate": str(self.sample_rate),
            "x-format": "verbatim",
            "x-vad-threshold": str(self.vad_threshold),
            "x-min-silence-ms": str(self.min_silence_ms),
        }
        if self.max_speech_s is not None:
            headers["x-max-speech-s"] = str(self.max_speech_s)

        try:
            # websockets v14+ supports additional_headers
            self._ws = await websockets.connect(
                self.ws_url,
                additional_headers=headers,
                max_size=2 * 1024 * 1024,
                ping_interval=20,
                ping_timeout=20,
            )
        except Exception as exc:
            status = getattr(exc, "status_code", None)
            if status in (401, 403):
                raise GnaniAuthError("Upstream authentication or quota rejection (403).") from exc
            if status == 429:
                raise GnaniQuotaError("Upstream rate limit / quota exceeded (429).") from exc
            if status is not None:
                raise GnaniStreamError(f"Upstream WebSocket connection failed: HTTP {status}") from exc
            raise GnaniStreamError(f"Failed to connect to upstream STT: {type(exc).__name__}: {exc}") from exc

        # Read first event, expecting 'connected'
        try:
            first_msg = await asyncio.wait_for(self._ws.recv(), timeout=10.0)
            if isinstance(first_msg, bytes):
                raise GnaniStreamError("Unexpected binary frame on handshake.")
            data = json.loads(first_msg)
            if data.get("type") != "connected":
                # Handle error on connect
                if data.get("type") == "error":
                    code = data.get("code", "upstream_error")
                    msg = data.get("message", "Upstream returned error on connect.")
                    if "quota" in msg.lower() or "limit" in msg.lower():
                        raise GnaniQuotaError(msg)
                    raise GnaniStreamError(f"{code}: {msg}")
                raise GnaniStreamError(f"Expected 'connected' event, got: {data.get('type')}")

            self._is_connected = True
            return ConnectedEvent(
                type="connected",
                message=data.get("message", "STT service ready"),
                request_id=data.get("request_id", ""),
                config=data.get("config", {}),
                timestamp=data.get("timestamp", ""),
            )
        except asyncio.TimeoutError as exc:
            await self.close()
            raise GnaniStreamError("Timeout waiting for upstream connected handshake.") from exc
        except Exception:
            await self.close()
            raise

    async def send_audio_frame(self, frame: bytes) -> None:
        """Send a single binary audio frame (must be exactly 1,024 bytes)."""
        if not self._ws or not self._is_connected:
            raise GnaniStreamError("Cannot send frame: upstream is not connected.")
        if not isinstance(frame, (bytes, bytearray)):
            raise GnaniBadFrameError("Frame must be binary bytes.")
        if len(frame) != FRAME_BYTES:
            raise GnaniBadFrameError(f"Frame must be exactly {FRAME_BYTES} bytes, got {len(frame)}.")

        try:
            await self._ws.send(frame)
        except ConnectionClosed as exc:
            self._is_connected = False
            raise GnaniStreamError("Upstream connection closed while sending frame.") from exc

    async def recv_events(self) -> AsyncGenerator[StreamEvent, None]:
        """Yield parsed events received from upstream."""
        if not self._ws:
            return

        try:
            async for raw_msg in self._ws:
                if isinstance(raw_msg, bytes):
                    # Gnani server sends text JSON, ignore raw binary if any
                    continue

                try:
                    data = json.loads(raw_msg)
                except Exception:
                    continue

                ev_type = data.get("type")
                # Log upstream event type and field names only (spec 4.1: never log transcripts or ids)
                logger.info("[Gnani upstream event] type=%s keys=%s", ev_type, sorted(data.keys()))

                if ev_type == "transcript":
                    dur = float(data.get("audio_duration_ms", 0.0))
                    self._audio_duration_accum_ms += dur
                    yield TranscriptEvent(
                        type="transcript",
                        text=data.get("text", ""),
                        audio_duration_ms=dur,
                        segment_index=int(data.get("segment_index", 0)),
                        utterance_id=data.get("utterance_id", ""),
                        is_final=bool(data.get("is_final", True)),
                        latency=int(data.get("latency", 0)),
                        timestamp=data.get("timestamp", ""),
                    )
                elif ev_type == "speech_start":
                    yield SpeechStartEvent(
                        type="speech_start",
                        utterance_id=data.get("utterance_id", ""),
                        timestamp=data.get("timestamp", ""),
                    )
                elif ev_type == "processing":
                    yield ProcessingEvent(
                        type="processing",
                        timestamp=data.get("timestamp", ""),
                    )
                elif ev_type == "error":
                    yield ErrorEvent(
                        type="error",
                        code=data.get("code", "upstream_error"),
                        message=data.get("message", "Upstream error"),
                    )
                elif ev_type == "connected":
                    yield ConnectedEvent(
                        type="connected",
                        message=data.get("message", ""),
                        request_id=data.get("request_id", ""),
                        config=data.get("config", {}),
                        timestamp=data.get("timestamp", ""),
                    )
                else:
                    yield GenericUpstreamEvent(
                        type="upstream_raw",
                        raw_type=ev_type or "unknown",
                        data=redacted_data,
                        timestamp=data.get("timestamp", ""),
                    )
        except ConnectionClosed:
            self._is_connected = False
            yield EndEvent(type="end", reason="upstream_closed")
        except Exception as exc:
            self._is_connected = False
            yield ErrorEvent(type="error", code="upstream_exception", message=str(exc))

    async def close(self) -> None:
        """Close upstream WebSocket."""
        self._is_connected = False
        if self._ws:
            try:
                await self._ws.close()
            except Exception:
                pass
            self._ws = None

    async def __aenter__(self) -> GnaniSTTStreamClient:
        await self.connect()
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb) -> None:
        await self.close()
