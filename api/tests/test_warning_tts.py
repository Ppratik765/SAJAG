"""Tests for POST /api/tts/warning endpoint (M5 Part 1)."""

from __future__ import annotations

from unittest.mock import AsyncMock, patch

import httpx
import pytest

from app.gnani.usage import BudgetExhausted
from app.main import app
from app.routes.tts import _reset_rate_limits


@pytest.fixture(autouse=True)
def reset_limits():
    _reset_rate_limits()
    yield
    _reset_rate_limits()


@pytest.mark.asyncio
async def test_warning_tts_valid_combos():
    transport = httpx.ASGITransport(app=app)
    mock_audio = b"\xff\xfb\x90\x44" + b"\x00" * 200  # Fake mp3 frame
    
    with patch("app.routes.tts._read_from_cache", return_value=None), patch("app.routes.tts.synthesize", new_callable=AsyncMock) as mock_synth:
        mock_synth.return_value = mock_audio
        async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
            # 1. alert_scam hi-IN
            resp = await client.post("/api/tts/warning", json={"kind": "alert_scam", "language_code": "hi-IN"})
            assert resp.status_code == 200
            assert resp.headers["content-type"] == "audio/mpeg"
            assert resp.content == mock_audio

            # 2. alert_suspicious en-IN
            resp = await client.post("/api/tts/warning", json={"kind": "alert_suspicious", "language_code": "en-IN"})
            assert resp.status_code == 200
            assert resp.headers["content-type"] == "audio/mpeg"

            # 3. explain digital_arrest hi-IN
            resp = await client.post(
                "/api/tts/warning",
                json={"kind": "explain", "scam_type": "digital_arrest", "language_code": "hi-IN"},
            )
            assert resp.status_code == 200

            # 4. explain bank_kyc en-IN
            resp = await client.post(
                "/api/tts/warning",
                json={"kind": "explain", "scam_type": "bank_kyc", "language_code": "en-IN"},
            )
            assert resp.status_code == 200


@pytest.mark.asyncio
async def test_warning_tts_rejects_free_text():
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        # Request with "text" field
        resp = await client.post(
            "/api/tts/warning",
            json={"kind": "alert_scam", "language_code": "hi-IN", "text": "This is free text to synthesize"},
        )
        assert resp.status_code == 400
        body = resp.json()
        assert body["detail"]["code"] == "extra_fields_forbidden"

        # Request with other arbitrary field
        resp = await client.post(
            "/api/tts/warning",
            json={"kind": "alert_scam", "language_code": "hi-IN", "prompt": "speak anything"},
        )
        assert resp.status_code == 400


@pytest.mark.asyncio
async def test_warning_tts_rejects_unknown_kind():
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.post(
            "/api/tts/warning",
            json={"kind": "super_scam_alert", "language_code": "hi-IN"},
        )
        assert resp.status_code == 400
        assert resp.json()["detail"]["code"] == "invalid_kind"


@pytest.mark.asyncio
async def test_warning_tts_rejects_unknown_scam_type():
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        # Unknown scam type
        resp = await client.post(
            "/api/tts/warning",
            json={"kind": "explain", "scam_type": "crypto_alien_heist", "language_code": "hi-IN"},
        )
        assert resp.status_code == 400
        assert resp.json()["detail"]["code"] == "unknown_scam_type"

        # Missing scam type for explain
        resp = await client.post(
            "/api/tts/warning",
            json={"kind": "explain", "language_code": "hi-IN"},
        )
        assert resp.status_code == 400
        assert resp.json()["detail"]["code"] == "missing_scam_type"


@pytest.mark.asyncio
async def test_warning_tts_rejects_unsupported_language():
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.post(
            "/api/tts/warning",
            json={"kind": "alert_scam", "language_code": "fr-FR"},
        )
        assert resp.status_code == 400
        assert resp.json()["detail"]["code"] == "unsupported_language"


@pytest.mark.asyncio
async def test_warning_tts_budget_exhausted():
    transport = httpx.ASGITransport(app=app)
    with patch("app.routes.tts._read_from_cache", return_value=None), patch("app.routes.tts.check_tts_budget") as mock_check:
        mock_check.side_effect = BudgetExhausted("Daily TTS budget exhausted", kind="tts")
        async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
            resp = await client.post(
                "/api/tts/warning",
                json={"kind": "alert_scam", "language_code": "hi-IN"},
            )
            assert resp.status_code == 503
            assert resp.json()["detail"]["code"] == "budget_exhausted"


@pytest.mark.asyncio
async def test_warning_tts_rate_limit():
    transport = httpx.ASGITransport(app=app)
    mock_audio = b"\xff\xfb\x90\x44" + b"\x00" * 50

    with patch("app.routes.tts.synthesize", new_callable=AsyncMock) as mock_synth:
        mock_synth.return_value = mock_audio
        async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
            for _ in range(5):
                resp = await client.post(
                    "/api/tts/warning",
                    json={"kind": "alert_scam", "language_code": "hi-IN"},
                )
                assert resp.status_code == 200

            # 6th request from same IP within a minute must be rejected with 429
            resp_6 = await client.post(
                "/api/tts/warning",
                json={"kind": "alert_scam", "language_code": "hi-IN"},
            )
            assert resp_6.status_code == 429
            assert resp_6.json()["detail"]["code"] == "rate_limit_exceeded"
