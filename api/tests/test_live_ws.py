"""Integration tests for WS /ws/live with a local fake upstream server (0 credits).

Tests:
1. Relay and cadence, speech_start, transcript, and risk updates
2. Bad frame handling (>20 invalid frames closes socket)
3. Escalation rule (safe -> suspicious -> likely_scam never drops)
4. first_crossed audio timestamps calculation
5. Session time limit (MAX_LIVE_SESSION_SECONDS)
6. Global and per-IP active session limits
7. Upstream error mapping (auth/quota)
8. Cleanup on disconnect
"""

import asyncio
import json
import os
import threading
import time
from unittest.mock import patch

import pytest
from starlette.testclient import TestClient
from websockets.asyncio.server import serve

from app.gnani.stt_stream import FRAME_BYTES
from app.main import app
import app.routes.live as live_route


class ThreadedFakeGnaniServer:
    def __init__(self, mode: str = "normal"):
        self.mode = mode
        self.received_frames = []
        self.received_headers = {}
        self.loop = None
        self.thread = None
        self.server = None
        self.port = 0
        self.ready_event = threading.Event()
        self.stop_event = threading.Event()

    async def handler(self, websocket):
        try:
            self.received_headers = dict(websocket.request.headers)
        except Exception:
            pass
        if self.mode == "auth_fail":
            await websocket.send(json.dumps({
                "type": "error",
                "code": "invalid_api_key",
                "message": "Invalid API Key or quota exhausted",
            }))
            await websocket.close(1008)
            return

        # 1. Send connected handshake
        await websocket.send(json.dumps({
            "type": "connected",
            "message": "STT service ready — VAD service connected",
            "request_id": "req-mock-123",
            "config": {"sample_rate": 16000, "chunk_size": 512},
            "timestamp": "2026-10-21T06:00:00Z",
        }))

        try:
            async for msg in websocket:
                if isinstance(msg, bytes):
                    self.received_frames.append(msg)

                    if self.mode == "normal":
                        # On first frame, emit speech_start
                        if len(self.received_frames) == 1:
                            await websocket.send(json.dumps({
                                "type": "speech_start",
                                "utterance_id": "u1",
                                "timestamp": "2026-10-21T06:00:01Z",
                            }))

                        # On frame 3, emit segment 0 (safe)
                        if len(self.received_frames) == 3:
                            await websocket.send(json.dumps({
                                "type": "transcript",
                                "text": "नमस्ते, मैं आपका बैंक खाता विवरण जानना चाहता था।",
                                "audio_duration_ms": 3200.0,
                                "segment_index": 0,
                                "utterance_id": "u1",
                                "is_final": True,
                                "latency": 45,
                                "timestamp": "2026-10-21T06:00:02Z",
                            }))

                        # On frame 6, emit segment 1 (scam: digital arrest)
                        elif len(self.received_frames) == 6:
                            await websocket.send(json.dumps({
                                "type": "transcript",
                                "text": "मैं पुलिस से बोल रहा हूँ। आपके नाम पर अरेस्ट वारंट है। अभी पैसे ट्रांसफर करें।",
                                "audio_duration_ms": 4000.0,
                                "segment_index": 1,
                                "utterance_id": "u2",
                                "is_final": True,
                                "latency": 50,
                                "timestamp": "2026-10-21T06:00:04Z",
                            }))

                        # On frame 9, emit segment 2 (safe chit-chat: verify level never drops)
                        elif len(self.received_frames) == 9:
                            await websocket.send(json.dumps({
                                "type": "transcript",
                                "text": "धन्यवाद, शुभ दिन।",
                                "audio_duration_ms": 1500.0,
                                "segment_index": 2,
                                "utterance_id": "u3",
                                "is_final": True,
                                "latency": 30,
                                "timestamp": "2026-10-21T06:00:06Z",
                            }))

        except Exception:
            pass

    def start(self):
        def _run():
            self.loop = asyncio.new_event_loop()
            asyncio.set_event_loop(self.loop)

            async def _start():
                self.server = await serve(self.handler, "127.0.0.1", 0)
                self.port = self.server.sockets[0].getsockname()[1]
                self.ready_event.set()
                while not self.stop_event.is_set():
                    await asyncio.sleep(0.05)
                self.server.close()
                await self.server.wait_closed()

            self.loop.run_until_complete(_start())
            self.loop.close()

        self.thread = threading.Thread(target=_run, daemon=True)
        self.thread.start()
        self.ready_event.wait(timeout=5.0)

    def stop(self):
        self.stop_event.set()
        if self.thread:
            self.thread.join(timeout=3.0)


@pytest.fixture(autouse=True)
def reset_session_counters():
    """Ensure session counters are clean before and after each test."""
    live_route._global_active_sessions = 0
    live_route._ip_active_sessions.clear()
    yield
    live_route._global_active_sessions = 0
    live_route._ip_active_sessions.clear()


@pytest.fixture
def fake_gnani():
    server = ThreadedFakeGnaniServer(mode="normal")
    server.start()
    os.environ["GNANI_STT_WS_URL"] = f"ws://127.0.0.1:{server.port}"
    try:
        yield server
    finally:
        server.stop()
        os.environ.pop("GNANI_STT_WS_URL", None)


def test_invalid_language():
    client = TestClient(app)
    with client.websocket_connect("/ws/live?lang=xx-YY") as ws:
        msg = ws.receive_json()
        assert msg["type"] == "error"
        assert msg["code"] == "invalid_language"


def test_origin_not_allowed():
    client = TestClient(app)
    with patch("app.routes.live.allowed_origins", return_value=["http://localhost:3000"]):
        with client.websocket_connect("/ws/live?lang=hi-IN", headers={"origin": "http://evil-site.com"}) as ws:
            msg = ws.receive_json()
            assert msg["type"] == "error"
            assert msg["code"] == "origin_not_allowed"


def test_full_relay_and_escalation(fake_gnani: ThreadedFakeGnaniServer):
    client = TestClient(app)
    silence_frame = b"\x00" * FRAME_BYTES

    with patch("app.routes.live.get_gnani_api_key", return_value="dummy_key"):
        with client.websocket_connect("/ws/live?lang=hi-IN") as ws:
            # 1. Expect ready
            msg = ws.receive_json()
            assert msg["type"] == "ready"

            # 2. Send frame 1 -> should trigger speech
            ws.send_bytes(silence_frame)
            msg_speech = ws.receive_json()
            assert msg_speech["type"] == "speech"

            # 3. Send frame 2 and frame 3 -> triggers segment 0
            ws.send_bytes(silence_frame)
            ws.send_bytes(silence_frame)

            msg_transcript_0 = ws.receive_json()
            assert msg_transcript_0["type"] == "transcript"
            assert msg_transcript_0["index"] == 0

            msg_risk_0 = ws.receive_json()
            assert msg_risk_0["type"] == "risk"
            # Segment 0 was benign inquiry
            assert msg_risk_0["level"] in ("safe", "suspicious")

            # 4. Send frame 4, 5, 6 -> triggers segment 1 (scam)
            ws.send_bytes(silence_frame)
            ws.send_bytes(silence_frame)
            ws.send_bytes(silence_frame)

            msg_transcript_1 = ws.receive_json()
            assert msg_transcript_1["type"] == "transcript"
            assert msg_transcript_1["index"] == 1

            msg_risk_1 = ws.receive_json()
            assert msg_risk_1["type"] == "risk"
            # Should escalate to likely_scam or scam
            assert msg_risk_1["level"] in ("likely_scam", "scam")
            assert msg_risk_1["first_crossed"]["likely_scam"] is not None
            # Verify first_crossed is audio time (3200ms + 4000ms = 7.2s)
            assert msg_risk_1["first_crossed"]["likely_scam"] == 7.2
            assert len(msg_risk_1["new_signals"]) > 0

            # 5. Send frame 7, 8, 9 -> triggers segment 2 (benign phrase)
            ws.send_bytes(silence_frame)
            ws.send_bytes(silence_frame)
            ws.send_bytes(silence_frame)

            msg_transcript_2 = ws.receive_json()
            assert msg_transcript_2["type"] == "transcript"
            assert msg_transcript_2["index"] == 2

            msg_risk_2 = ws.receive_json()
            assert msg_risk_2["type"] == "risk"
            # Escalation rule: level MUST NOT drop back down!
            assert msg_risk_2["level"] in ("likely_scam", "scam")
            assert msg_risk_2["first_crossed"]["likely_scam"] == 7.2

            # Close gracefully
            ws.close()


def test_bad_frames_counter(fake_gnani: ThreadedFakeGnaniServer):
    client = TestClient(app)
    bad_frame = b"\x00" * 500  # Invalid length (not 1024)

    with patch("app.routes.live.get_gnani_api_key", return_value="dummy_key"):
        with client.websocket_connect("/ws/live?lang=hi-IN") as ws:
            msg = ws.receive_json()
            assert msg["type"] == "ready"

            # Send 21 bad frames
            for _ in range(21):
                ws.send_bytes(bad_frame)

            err_msg = ws.receive_json()
            assert err_msg["type"] == "error"
            assert err_msg["code"] == "bad_frames"


def test_session_time_limit(fake_gnani: ThreadedFakeGnaniServer):
    client = TestClient(app)
    silence_frame = b"\x00" * FRAME_BYTES

    with patch("app.routes.live.get_gnani_api_key", return_value="dummy_key"), \
         patch("app.routes.live.get_max_live_session_seconds", return_value=0.5):
        with client.websocket_connect("/ws/live?lang=hi-IN") as ws:
            msg = ws.receive_json()
            assert msg["type"] == "ready"

            # Wait > 0.5s and send a frame
            time.sleep(0.6)
            ws.send_bytes(silence_frame)

            end_msg = ws.receive_json()
            assert end_msg["type"] == "end"
            assert end_msg["reason"] == "time_limit"


def test_active_session_limits():
    client = TestClient(app)

    # Global limit
    with patch("app.routes.live.get_max_live_sessions", return_value=0):
        with client.websocket_connect("/ws/live?lang=hi-IN") as ws:
            msg = ws.receive_json()
            assert msg["type"] == "error"
            assert msg["code"] == "session_limit"

    # Per-IP limit
    with patch("app.routes.live.get_max_live_sessions_per_ip", return_value=0):
        with client.websocket_connect("/ws/live?lang=hi-IN") as ws:
            msg = ws.receive_json()
            assert msg["type"] == "error"
            assert msg["code"] == "ip_limit"


def test_upstream_auth_error():
    fake = ThreadedFakeGnaniServer(mode="auth_fail")
    fake.start()
    os.environ["GNANI_STT_WS_URL"] = f"ws://127.0.0.1:{fake.port}"

    try:
        client = TestClient(app)
        with patch("app.routes.live.get_gnani_api_key", return_value="dummy_key"):
            with client.websocket_connect("/ws/live?lang=hi-IN") as ws:
                msg = ws.receive_json()
                assert msg["type"] == "error"
                assert msg["code"] in ("upstream_auth", "upstream_quota")
    finally:
        fake.stop()
        os.environ.pop("GNANI_STT_WS_URL", None)


def test_cleanup_on_disconnect(fake_gnani: ThreadedFakeGnaniServer):
    client = TestClient(app)
    with patch("app.routes.live.get_gnani_api_key", return_value="dummy_key"):
        with client.websocket_connect("/ws/live?lang=hi-IN") as ws:
            msg = ws.receive_json()
            assert msg["type"] == "ready"
            # Session counter should be 1
            assert live_route._global_active_sessions == 1
            ws.close()

    # After close, wait briefly for background finally block to decrement counters
    for _ in range(20):
        if live_route._global_active_sessions == 0:
            break
        time.sleep(0.05)

    assert live_route._global_active_sessions == 0


def test_max_speech_s_header(fake_gnani: ThreadedFakeGnaniServer):
    client = TestClient(app)
    with patch("app.routes.live.get_gnani_api_key", return_value="dummy_key"):
        with client.websocket_connect("/ws/live?lang=hi-IN&max_speech_s=6.0") as ws:
            msg = ws.receive_json()
            assert msg["type"] == "ready"
            assert fake_gnani.received_headers.get("x-max-speech-s") == "6.0"


def test_silence_flush_on_client_disconnect(fake_gnani: ThreadedFakeGnaniServer):
    client = TestClient(app)
    with patch("app.routes.live.get_gnani_api_key", return_value="dummy_key"):
        with client.websocket_connect("/ws/live?lang=hi-IN") as ws:
            msg = ws.receive_json()
            assert msg["type"] == "ready"
            # Send 2 speech audio frames (non-zero)
            audio_frame = b"\x01\x00" * (FRAME_BYTES // 2)
            ws.send_bytes(audio_frame)
            ws.send_bytes(audio_frame)
            time.sleep(0.1)
            # Close client connection
            ws.close()

    # Wait for flush frames to arrive at fake upstream server
    for _ in range(40):
        if len(fake_gnani.received_frames) >= 10:
            break
        time.sleep(0.05)

    # Verify that silence frames (all zero bytes) were flushed upstream
    assert len(fake_gnani.received_frames) > 2
    # The flushed frames should be all zero bytes
    flushed_frames = fake_gnani.received_frames[2:]
    for f in flushed_frames:
        assert f == b"\x00" * FRAME_BYTES

