"""M0 smoke test for the Gnani APIs (spec section 10, M0 step 3).

Steps:
  (a) TTS REST: synthesize one short Hindi sentence (timbre-v2.5, Chitra, hi-IN, WAV 16 kHz) and save it.
  (b) STT REST: transcribe that WAV with hi-IN.
  (c) STT WebSocket: stream the WAV's raw PCM in exact 1,024-byte frames at 32 ms cadence,
      then >= 1 s of zero frames so VAD closes the segment; print received events.

Prints STT-seconds and TTS-characters used. Never prints the API key.

Run from the repo root:
    api\\.venv\\Scripts\\python.exe scripts\\smoke.py      (Windows)
    api/.venv/bin/python scripts/smoke.py                 (macOS/Linux)
"""

from __future__ import annotations

import asyncio
import json
import os
import sys
import time
import wave
from pathlib import Path

import httpx
import websockets

REPO_ROOT = Path(__file__).resolve().parents[1]
OUT_DIR = REPO_ROOT / "scripts" / "out"  # git-ignored
BASE_URL = "https://api.vachana.ai"
WS_URL = "wss://api.vachana.ai/stt/v3/stream"

TTS_TEXT = "नमस्ते, यह सजग की जाँच है। कृपया किसी को भी अपना कोड न बताएं।"
TTS_MODEL = "timbre-v2.5"
TTS_VOICE = "Chitra"
LANG = "hi-IN"
SAMPLE_RATE = 16000
FRAME_BYTES = 1024  # 512 samples * 2 bytes
FRAME_SECONDS = 512 / SAMPLE_RATE  # 0.032 s
TRAILING_SILENCE_S = 1.5

usage = {"tts_chars": 0, "stt_seconds": 0.0}


def load_api_key() -> str:
    """Read GNANI_API_KEY from the environment or the repo-root .env. Never printed."""
    env_path = REPO_ROOT / ".env"
    if env_path.is_file():
        for raw in env_path.read_text(encoding="utf-8").splitlines():
            line = raw.strip()
            if line.startswith("GNANI_API_KEY=") and "GNANI_API_KEY" not in os.environ:
                os.environ["GNANI_API_KEY"] = line.split("=", 1)[1].split(" #", 1)[0].strip().strip('"').strip("'")
    key = os.environ.get("GNANI_API_KEY", "")
    if not key:
        print("BLOCKED: GNANI_API_KEY is missing. Create .env in the repo root (see .env.example).")
        sys.exit(2)
    return key


def describe_error(resp: httpx.Response) -> str:
    """Error summary without echoing request headers."""
    try:
        body = json.dumps(resp.json(), ensure_ascii=False)
    except ValueError:
        body = resp.text[:300]
    return f"HTTP {resp.status_code}: {body}"


def step_tts(client: httpx.Client, key: str) -> Path:
    print("\n=== (a) TTS REST ===")
    body = {
        "text": TTS_TEXT,
        "model": TTS_MODEL,
        "voice": TTS_VOICE,
        "language": LANG,
        "speed": 1.0,
        "audio_config": {
            "sample_rate": SAMPLE_RATE,
            "num_channels": 1,
            "sample_width": 2,
            "encoding": "linear_pcm",
            "container": "wav",
        },
    }
    t0 = time.perf_counter()
    resp = client.post(
        f"{BASE_URL}/api/v1/tts/inference",
        headers={"X-API-Key-ID": key, "Content-Type": "application/json"},
        json=body,
    )
    dt = time.perf_counter() - t0
    usage["tts_chars"] += len(TTS_TEXT)  # counted as sent, even on error
    if resp.status_code != 200:
        raise RuntimeError(f"TTS failed after {dt:.2f}s: {describe_error(resp)}")
    out = OUT_DIR / "smoke_tts_hi.wav"
    out.write_bytes(resp.content)
    with wave.open(str(out), "rb") as w:
        rate, ch, width, frames = w.getframerate(), w.getnchannels(), w.getsampwidth(), w.getnframes()
    print(f"status=200 latency={dt:.2f}s content-type={resp.headers.get('content-type')} bytes={len(resp.content)}")
    print(f"wav: rate={rate} channels={ch} sample_width={width} duration={frames / rate:.2f}s -> {out.relative_to(REPO_ROOT)}")
    if (rate, ch, width) != (SAMPLE_RATE, 1, 2):
        raise RuntimeError("TTS WAV is not 16 kHz mono 16-bit; cannot stream it as-is.")
    return out


def wav_duration(path: Path) -> float:
    with wave.open(str(path), "rb") as w:
        return w.getnframes() / w.getframerate()


def step_stt_rest(client: httpx.Client, key: str, wav_path: Path) -> None:
    print("\n=== (b) STT REST ===")
    t0 = time.perf_counter()
    with wav_path.open("rb") as f:
        resp = client.post(
            f"{BASE_URL}/stt/v3",
            headers={"X-API-Key-ID": key},
            files={"audio_file": (wav_path.name, f, "audio/wav")},
            data={"language_code": LANG, "format": "verbatim"},
        )
    dt = time.perf_counter() - t0
    usage["stt_seconds"] += wav_duration(wav_path)
    if resp.status_code != 200:
        raise RuntimeError(f"STT REST failed after {dt:.2f}s: {describe_error(resp)}")
    data = resp.json()
    shape = {k: type(v).__name__ for k, v in data.items()}
    print(f"status=200 latency={dt:.2f}s keys={shape}")
    print(f"success={data.get('success')} transcript={data.get('transcript')!r}")


async def step_stt_ws(key: str, wav_path: Path) -> None:
    print("\n=== (c) STT WebSocket ===")
    with wave.open(str(wav_path), "rb") as w:
        pcm = w.readframes(w.getnframes())
    if len(pcm) % FRAME_BYTES:
        pcm += b"\x00" * (FRAME_BYTES - len(pcm) % FRAME_BYTES)
    frames = [pcm[i : i + FRAME_BYTES] for i in range(0, len(pcm), FRAME_BYTES)]
    silence_frames = int(TRAILING_SILENCE_S / FRAME_SECONDS) + 1
    frames += [b"\x00" * FRAME_BYTES] * silence_frames
    assert all(len(fr) == FRAME_BYTES for fr in frames)
    streamed_s = len(frames) * FRAME_SECONDS
    print(f"frames={len(frames)} (incl. {silence_frames} zero frames) streamed_audio={streamed_s:.2f}s")

    headers = {
        "x-api-key-id": key,
        "lang_code": LANG,
        "x-sample-rate": str(SAMPLE_RATE),
        "x-format": "verbatim",
    }
    got_transcript = asyncio.Event()
    events: list[dict] = []
    t_start = time.perf_counter()

    async with websockets.connect(WS_URL, additional_headers=headers) as ws:

        async def receiver() -> None:
            async for msg in ws:
                if isinstance(msg, bytes):
                    print(f"  +{time.perf_counter() - t_start:6.2f}s  <binary {len(msg)} bytes>")
                    continue
                ev = json.loads(msg)
                events.append(ev)
                shown = dict(ev)
                if "segment_id" in shown:
                    shown["segment_id"] = "<redacted>"
                print(f"  +{time.perf_counter() - t_start:6.2f}s  {json.dumps(shown, ensure_ascii=False)}")
                if ev.get("type") == "transcript":
                    got_transcript.set()

        recv_task = asyncio.create_task(receiver())
        try:
            # Real-time cadence: schedule each frame against a monotonic clock (no burst).
            t0 = time.perf_counter()
            for i, fr in enumerate(frames):
                await ws.send(fr)
                delay = t0 + (i + 1) * FRAME_SECONDS - time.perf_counter()
                if delay > 0:
                    await asyncio.sleep(delay)
            usage["stt_seconds"] += streamed_s
            try:
                await asyncio.wait_for(got_transcript.wait(), timeout=10)
            except asyncio.TimeoutError:
                pass
        finally:
            await ws.close()
            try:
                await asyncio.wait_for(recv_task, timeout=3)
            except (asyncio.TimeoutError, websockets.ConnectionClosed):
                recv_task.cancel()

    if not got_transcript.is_set():
        raise RuntimeError("STT WebSocket: no transcript event received within 10 s after streaming.")


def main() -> int:
    key = load_api_key()
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    ok = True
    try:
        with httpx.Client(timeout=60) as client:
            wav = step_tts(client, key)
            step_stt_rest(client, key, wav)
        asyncio.run(step_stt_ws(key, wav))
    except Exception as exc:  # report and fail; message never includes the key
        ok = False
        print(f"\nFAILED: {type(exc).__name__}: {exc}")
    finally:
        print(f"\nUsage this run: STT seconds={usage['stt_seconds']:.2f}  TTS characters={usage['tts_chars']}")
    print("SMOKE OK" if ok else "SMOKE FAILED")
    return 0 if ok else 1


if __name__ == "__main__":
    sys.exit(main())
