"""Unit tests for Gnani Timbre TTS REST client using respx mock."""

from __future__ import annotations

import struct
import httpx
import pytest
import respx

from app.gnani.stt_rest import (
    GnaniAuthError,
    GnaniBadRequest,
    GnaniQuotaError,
    GnaniRateLimit,
    GnaniServerError,
)
from app.gnani.tts_rest import TTS_ENDPOINT, repair_wav_header, synthesize


def make_dummy_riff_wav() -> bytes:
    """Create a minimal mock RIFF WAV with 0xFFFFFFFF placeholder headers."""
    header = bytearray(44)
    header[:4] = b"RIFF"
    struct.pack_into("<I", header, 4, 0xFFFFFFFF)
    header[8:12] = b"WAVE"
    header[12:16] = b"fmt "
    struct.pack_into("<I", header, 16, 16)  # fmt size
    struct.pack_into("<H", header, 20, 1)   # PCM
    struct.pack_into("<H", header, 22, 1)   # 1 channel
    struct.pack_into("<I", header, 24, 16000) # rate
    struct.pack_into("<I", header, 28, 32000) # byte rate
    struct.pack_into("<H", header, 32, 2)   # block align
    struct.pack_into("<H", header, 34, 16)  # bits per sample
    header[36:40] = b"data"
    struct.pack_into("<I", header, 40, 0xFFFFFFFF)
    pcm = b"\x00\x00" * 100
    return bytes(header + pcm)


def test_repair_wav_header():
    raw = make_dummy_riff_wav()
    repaired = repair_wav_header(raw)
    assert len(repaired) == len(raw)
    riff_size = struct.unpack_from("<I", repaired, 4)[0]
    data_size = struct.unpack_from("<I", repaired, 40)[0]
    assert riff_size == len(repaired) - 8
    assert data_size == 200


@pytest.mark.asyncio
async def test_tts_synthesize_success(respx_mock):
    dummy_wav = make_dummy_riff_wav()
    route = respx_mock.post(TTS_ENDPOINT).mock(
        return_value=httpx.Response(200, content=dummy_wav)
    )

    result = await synthesize(
        text="Test synthesis text",
        language="hi-IN",
        voice="Chitra",
        container="wav",
        api_key="test_key",
        use_cache=False,
    )

    assert route.called
    assert len(result) == len(dummy_wav)
    # Header repaired
    riff_size = struct.unpack_from("<I", result, 4)[0]
    assert riff_size == len(result) - 8


@pytest.mark.asyncio
async def test_tts_synthesize_401_auth_error(respx_mock):
    respx_mock.post(TTS_ENDPOINT).mock(
        return_value=httpx.Response(401, json={"success": False, "error": {"message": "Invalid API key"}})
    )

    with pytest.raises(GnaniAuthError):
        await synthesize(
            text="Test synthesis text",
            language="hi-IN",
            voice="Chitra",
            api_key="bad_key",
            use_cache=False,
        )


@pytest.mark.asyncio
async def test_tts_synthesize_403_quota_error(respx_mock):
    respx_mock.post(TTS_ENDPOINT).mock(
        return_value=httpx.Response(403, json={"success": False, "error": {"message": "Quota exceeded"}})
    )

    with pytest.raises(GnaniQuotaError):
        await synthesize(
            text="Test synthesis text",
            language="hi-IN",
            voice="Chitra",
            api_key="test_key",
            use_cache=False,
        )


@pytest.mark.asyncio
async def test_tts_synthesize_400_bad_request(respx_mock):
    respx_mock.post(TTS_ENDPOINT).mock(
        return_value=httpx.Response(400, json={"success": False, "error": {"message": "Invalid voice"}})
    )

    with pytest.raises(GnaniBadRequest):
        await synthesize(
            text="Test synthesis text",
            language="hi-IN",
            voice="InvalidVoice",
            api_key="test_key",
            use_cache=False,
        )


@pytest.mark.asyncio
async def test_tts_synthesize_retry_500(respx_mock):
    dummy_wav = make_dummy_riff_wav()
    route = respx_mock.post(TTS_ENDPOINT)
    route.side_effect = [
        httpx.Response(500, text="Internal server error"),
        httpx.Response(200, content=dummy_wav),
    ]

    result = await synthesize(
        text="Test retry text",
        language="hi-IN",
        voice="Chitra",
        container="wav",
        api_key="test_key",
        use_cache=False,
        max_retries=2,
    )

    assert route.call_count == 2
    assert len(result) == len(dummy_wav)
