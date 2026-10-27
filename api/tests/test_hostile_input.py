"""Hostile input, origin security, rate limiting, and maintenance mode tests (M7 Part B).

Verifies that no input crashes, hangs, or returns stack traces, that origin and
rate limits are strictly enforced, and that maintenance mode selectively disables
speech endpoints while keeping offline text analysis functional.
"""

from __future__ import annotations

import io
import struct
import wave
import zipfile
from unittest.mock import patch

import httpx
import pytest
from starlette.testclient import TestClient

from app.main import app
from app.util.rate_limit import reset_rate_limits


@pytest.fixture(autouse=True)
def clean_rate_limits():
    reset_rate_limits()
    yield
    reset_rate_limits()


# =========================================================================
# 1. Text Analysis Hostile Input Tests
# =========================================================================

@pytest.mark.asyncio
async def test_hostile_text_empty():
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.post("/api/analyze/text", json={"text": "", "language_code": "hi-IN"})
        assert resp.status_code == 200
        data = resp.json()
        assert data["level"] == "safe"
        assert data["score"] == 0


@pytest.mark.asyncio
async def test_hostile_text_8000_plus_chars():
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        huge_text = "आपका बैंक खाता ब्लॉक कर दिया गया है तुरंत ओटीपी बताएं। " * 200  # > 10,000 chars
        resp = await client.post("/api/analyze/text", json={"text": huge_text, "language_code": "hi-IN"})
        assert resp.status_code == 200
        data = resp.json()
        assert data["level"] in ("suspicious", "likely_scam", "scam")


@pytest.mark.asyncio
async def test_hostile_text_only_emoji():
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        emoji_text = "🚨👮‍♂️💸📱🔒🛑" * 100
        resp = await client.post("/api/analyze/text", json={"text": emoji_text, "language_code": "hi-IN"})
        assert resp.status_code == 200
        assert resp.json()["level"] == "safe"


@pytest.mark.asyncio
async def test_hostile_text_100k_combining_marks():
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        zalgo = "a" + ("\u0300" * 100000)
        resp = await client.post("/api/analyze/text", json={"text": zalgo, "language_code": "hi-IN"})
        assert resp.status_code == 200
        assert resp.json()["level"] == "safe"


@pytest.mark.asyncio
async def test_hostile_text_null_bytes():
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        null_text = "hello\x00world\x00police\x00arrest"
        resp = await client.post("/api/analyze/text", json={"text": null_text, "language_code": "en-IN"})
        assert resp.status_code == 200


# =========================================================================
# 2. Audio Analysis Hostile Input Tests
# =========================================================================

@pytest.mark.asyncio
async def test_hostile_audio_zero_bytes():
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        files = {"file": ("empty.wav", b"", "audio/wav")}
        resp = await client.post("/api/analyze/audio", files=files, data={"language_code": "hi-IN"})
        assert resp.status_code == 400
        assert resp.json()["error"]["code"] == "invalid_audio"


@pytest.mark.asyncio
async def test_hostile_audio_zip_renamed_to_wav():
    zip_buffer = io.BytesIO()
    with zipfile.ZipFile(zip_buffer, "w") as zf:
        zf.writestr("test.txt", "this is a text file inside a zip")
    zip_bytes = zip_buffer.getvalue()

    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        files = {"file": ("fake.wav", zip_bytes, "audio/wav")}
        resp = await client.post("/api/analyze/audio", files=files, data={"language_code": "hi-IN"})
        assert resp.status_code == 400
        assert resp.json()["error"]["code"] == "invalid_audio"


@pytest.mark.asyncio
async def test_hostile_audio_lying_header():
    # Construct a corrupted WAV with impossible sample rate / header
    buf = io.BytesIO()
    with wave.open(buf, "wb") as wf:
        wf.setnchannels(1)
        wf.setsampwidth(2)
        wf.setframerate(16000)
        wf.writeframes(b"\x00\x00" * 50)
    raw = bytearray(buf.getvalue())
    # Corrupt the header format / sample rate chunk to 0
    raw[24:28] = b"\x00\x00\x00\x00"  # sample rate = 0
    raw[28:32] = b"\x00\x00\x00\x00"  # byte rate = 0

    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        files = {"file": ("lying.wav", bytes(raw), "audio/wav")}
        resp = await client.post("/api/analyze/audio", files=files, data={"language_code": "hi-IN"})
        # Must return 400 without crashing, hanging, or 500
        assert resp.status_code == 400
        assert resp.json()["error"]["code"] in ("invalid_audio", "audio_too_long")


@pytest.mark.asyncio
async def test_hostile_audio_over_max_duration():
    from app.util.audio import AudioTooLong
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        with patch("app.routes.analyze.validate_upload", side_effect=AudioTooLong("Exceeds 180s")):
            files = {"file": ("long.wav", b"dummy", "audio/wav")}
            resp = await client.post("/api/analyze/audio", files=files, data={"language_code": "hi-IN"})
            assert resp.status_code == 400
            assert resp.json()["error"]["code"] == "audio_too_long"


# =========================================================================
# 3. Rate Limiting Tests
# =========================================================================

@pytest.mark.asyncio
async def test_rate_limit_analyze_text():
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        # Limit is 30/min
        for i in range(30):
            resp = await client.post("/api/analyze/text", json={"text": f"test {i}", "language_code": "en-IN"})
            assert resp.status_code == 200

        # 31st must be rejected with 429
        resp_31 = await client.post("/api/analyze/text", json={"text": "overflow", "language_code": "en-IN"})
        assert resp_31.status_code == 429
        assert resp_31.json()["detail"]["code"] == "rate_limit_exceeded"


@pytest.mark.asyncio
async def test_rate_limit_proxy_ip():
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        with patch("app.util.rate_limit.trust_proxy", return_value=True):
            # 30 requests from IP 1.2.3.4
            for i in range(30):
                resp = await client.post(
                    "/api/analyze/text",
                    json={"text": f"test {i}"},
                    headers={"X-Forwarded-For": "1.2.3.4, 10.0.0.1"},
                )
                assert resp.status_code == 200

            # 31st from 1.2.3.4 is 429
            resp_block = await client.post(
                "/api/analyze/text",
                json={"text": "blocked"},
                headers={"X-Forwarded-For": "1.2.3.4, 10.0.0.1"},
            )
            assert resp_block.status_code == 429

            # Different client IP 5.6.7.8 should still be allowed
            resp_other = await client.post(
                "/api/analyze/text",
                json={"text": "allowed"},
                headers={"X-Forwarded-For": "5.6.7.8, 10.0.0.1"},
            )
            assert resp_other.status_code == 200


# =========================================================================
# 4. Maintenance Mode Tests
# =========================================================================

@pytest.mark.asyncio
async def test_maintenance_mode_behavior():
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        with patch("app.routes.analyze.is_maintenance_mode", return_value=True), \
             patch("app.routes.tts.is_maintenance_mode", return_value=True):

            # Audio analysis returns 503 maintenance
            files = {"file": ("test.wav", b"dummy", "audio/wav")}
            resp_audio = await client.post("/api/analyze/audio", files=files)
            assert resp_audio.status_code == 503
            assert resp_audio.json()["error"]["code"] == "maintenance"

            # TTS warning returns 503 maintenance
            resp_tts = await client.post("/api/tts/warning", json={"kind": "alert_scam", "language_code": "hi-IN"})
            assert resp_tts.status_code == 503
            assert resp_tts.json()["detail"]["code"] == "maintenance"

            # TEXT analysis continues to work in maintenance mode!
            resp_text = await client.post("/api/analyze/text", json={"text": "hello safe text", "language_code": "en-IN"})
            assert resp_text.status_code == 200
            assert resp_text.json()["level"] == "safe"


# =========================================================================
# 5. WebSocket Origin Security Tests
# =========================================================================

def test_websocket_origin_enforcement():
    client = TestClient(app)

    # 1. ALLOW_NO_ORIGIN=false (production default) -> no origin rejected
    with patch("app.routes.live.allow_no_origin", return_value=False):
        with client.websocket_connect("/ws/live?lang=hi-IN") as ws:
            msg = ws.receive_json()
            assert msg["type"] == "error"
            assert msg["code"] == "origin_not_allowed"

    # 2. ALLOW_NO_ORIGIN=true (dev default) -> no origin accepted
    with patch("app.routes.live.allow_no_origin", return_value=True), \
         patch("app.routes.live.get_current_day_usage", return_value={"stt_remaining_seconds": 100}), \
         patch("app.routes.live.GnaniSTTStreamClient"):
        with client.websocket_connect("/ws/live?lang=hi-IN") as ws:
            ws.send_bytes(b"\x00" * 1024)
            ws.close()
