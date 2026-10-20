"""Unit tests for Gnani STT REST client with mocked HTTP (respx)."""

import pytest
import respx
import httpx
from app.gnani.stt_rest import (
    STT_ENDPOINT,
    GnaniAuthError,
    GnaniBadRequest,
    GnaniQuotaError,
    GnaniRateLimit,
    GnaniServerError,
    transcribe_file,
)


@pytest.mark.asyncio
@respx.mock
async def test_transcribe_success_200():
    respx.post(STT_ENDPOINT).mock(
        return_value=httpx.Response(
            200,
            json={
                "success": True,
                "request_id": "req_12345",
                "transcript": "नमस्ते यह परीक्षण है",
                "model": "gnani-prisma-v2.5",
                "processing_time": 0.22,
                "end_to_end_latency": 0.23,
            },
        )
    )

    res = await transcribe_file(b"RIFFdummydata", "hi-IN", api_key="test_key")
    assert res.transcript == "नमस्ते यह परीक्षण है"
    assert res.request_id == "req_12345"
    assert res.model == "gnani-prisma-v2.5"
    assert res.processing_time == 0.22


@pytest.mark.asyncio
@respx.mock
async def test_transcribe_401_auth_error():
    respx.post(STT_ENDPOINT).mock(
        return_value=httpx.Response(401, json={"success": False, "error": {"type": "UNAUTHORIZED", "message": "Invalid key"}})
    )

    with pytest.raises(GnaniAuthError) as exc:
        await transcribe_file(b"RIFFdummy", "hi-IN", api_key="invalid_key")
    assert exc.value.status_code == 401


@pytest.mark.asyncio
@respx.mock
async def test_transcribe_403_quota_error():
    respx.post(STT_ENDPOINT).mock(
        return_value=httpx.Response(403, json={"success": False, "error": {"type": "FORBIDDEN", "message": "Credits exhausted"}})
    )

    with pytest.raises(GnaniQuotaError) as exc:
        await transcribe_file(b"RIFFdummy", "hi-IN", api_key="depleted_key")
    assert exc.value.status_code == 403


@pytest.mark.asyncio
@respx.mock
async def test_transcribe_400_bad_request():
    respx.post(STT_ENDPOINT).mock(
        return_value=httpx.Response(400, json={"success": False, "error": {"type": "BAD_REQUEST", "message": "Exceeds 60 seconds"}})
    )

    with pytest.raises(GnaniBadRequest) as exc:
        await transcribe_file(b"RIFFdummy", "hi-IN", api_key="test_key")
    assert exc.value.status_code == 400


@pytest.mark.asyncio
@respx.mock
async def test_transcribe_429_rate_limit_retry():
    # Return 429 three times to exhaust retries
    route = respx.post(STT_ENDPOINT).mock(
        return_value=httpx.Response(429, json={"error": "Too Many Requests"})
    )

    with pytest.raises(GnaniRateLimit) as exc:
        await transcribe_file(b"RIFFdummy", "hi-IN", api_key="test_key", max_retries=2)
    assert exc.value.status_code == 429
    assert route.call_count == 2


@pytest.mark.asyncio
@respx.mock
async def test_transcribe_500_retry_then_success():
    # Return 500 once, then 200 on retry
    route = respx.post(STT_ENDPOINT)
    route.side_effect = [
        httpx.Response(500, json={"error": "Server error"}),
        httpx.Response(200, json={"success": True, "request_id": "req_ok", "transcript": "सफल"}),
    ]

    res = await transcribe_file(b"RIFFdummy", "hi-IN", api_key="test_key", max_retries=2)
    assert res.transcript == "सफल"
    assert route.call_count == 2
