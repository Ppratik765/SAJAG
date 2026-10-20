"""Tests for FastAPI endpoints: /healthz, /api/meta, /api/usage, /api/analyze/audio."""

import io
import wave
from pathlib import Path
from unittest.mock import AsyncMock, patch

import httpx
import pytest
import respx
from app.gnani.stt_rest import STT_ENDPOINT, SttResult
from app.main import app


def _create_wav_bytes(duration_s: float = 2.0, sample_rate: int = 16000) -> bytes:
    buf = io.BytesIO()
    num_samples = int(duration_s * sample_rate)
    with wave.open(buf, "wb") as wf:
        wf.setnchannels(1)
        wf.setsampwidth(2)
        wf.setframerate(sample_rate)
        wf.writeframes(b"\x00\x00" * num_samples)
    return buf.getvalue()


@pytest.mark.asyncio
async def test_healthz():
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.get("/healthz")
        assert resp.status_code == 200
        assert resp.json() == {"ok": True}


@pytest.mark.asyncio
async def test_meta():
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.get("/api/meta")
        assert resp.status_code == 200
        data = resp.json()
        assert "hi-IN" in data["supported_stt_languages"]
        assert data["engine_attached"] is False


@pytest.mark.asyncio
async def test_usage_auth():
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        with patch("app.routes.meta.get_admin_token", return_value="secret123"):
            # Missing token -> 403
            resp = await client.get("/api/usage")
            assert resp.status_code == 403

            # Valid token -> 200
            resp_ok = await client.get("/api/usage", headers={"X-Admin-Token": "secret123"})
            assert resp_ok.status_code == 200
            assert "stt_seconds" in resp_ok.json()


@pytest.mark.asyncio
@respx.mock
async def test_analyze_audio_success():
    respx.post(STT_ENDPOINT).mock(
        return_value=httpx.Response(
            200,
            json={
                "success": True,
                "request_id": "req_mock_1",
                "transcript": "यह एक परीक्षण है",
            },
        )
    )

    wav_bytes = _create_wav_bytes(duration_s=3.0)
    transport = httpx.ASGITransport(app=app)

    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        files = {"file": ("test.wav", wav_bytes, "audio/wav")}
        data = {"language_code": "hi-IN"}
        resp = await client.post("/api/analyze/audio", files=files, data=data)
        assert resp.status_code == 200
        payload = resp.json()
        assert payload["transcript"] == "यह एक परीक्षण है"
        assert payload["language_code"] == "hi-IN"
        assert payload["engine_attached"] is False
        assert len(payload["segments"]) >= 1


@pytest.mark.asyncio
async def test_analyze_audio_invalid_lang():
    wav_bytes = _create_wav_bytes(duration_s=1.0)
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        files = {"file": ("test.wav", wav_bytes, "audio/wav")}
        data = {"language_code": "invalid-lang"}
        resp = await client.post("/api/analyze/audio", files=files, data=data)
        assert resp.status_code == 400
        assert resp.json()["error"]["code"] == "invalid_language"


@pytest.mark.asyncio
async def test_analyze_audio_maintenance_mode():
    wav_bytes = _create_wav_bytes(duration_s=1.0)
    transport = httpx.ASGITransport(app=app)
    with patch("app.routes.analyze.is_maintenance_mode", return_value=True):
        async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
            files = {"file": ("test.wav", wav_bytes, "audio/wav")}
            resp = await client.post("/api/analyze/audio", files=files, data={"language_code": "hi-IN"})
            assert resp.status_code == 503
            assert resp.json()["error"]["code"] == "maintenance"
