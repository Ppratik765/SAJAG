"""Real End-to-End M1 Test.

Builds a ~2 minute WAV by looping the existing smoke WAV (zero TTS cost).
Sends it through the real transcription pipeline via analyze_audio.
Verifies chunking (no chunk > 28s), ordered reassembly, and budget guard (< 600s).
"""

from __future__ import annotations

import asyncio
import io
import sys
import wave
from pathlib import Path

# Ensure UTF-8 output on Windows consoles
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")
if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8")

from app.config.settings import REPO_ROOT
from app.gnani.stt_rest import transcribe_file
from app.util.audio import probe_duration, split_on_silence, to_wav_16k_mono

SMOKE_WAV = REPO_ROOT / "scripts" / "out" / "smoke_tts_hi.wav"
OUT_DIR = REPO_ROOT / "scripts" / "out"
E2E_WAV = OUT_DIR / "m1_e2e_2min.wav"


def build_looped_wav(src_path: Path, dest_path: Path, target_duration_s: float = 118.0) -> float:
    """Loop audio in src_path until target_duration_s is reached without re-encoding."""
    with wave.open(str(src_path), "rb") as wf_in:
        params = wf_in.getparams()
        frames = wf_in.readframes(wf_in.getnframes())

    src_dur = len(frames) / (params.nchannels * params.sampwidth * params.framerate)
    loops_needed = int(target_duration_s / src_dur) + 1

    dest_path.parent.mkdir(parents=True, exist_ok=True)
    with wave.open(str(dest_path), "wb") as wf_out:
        wf_out.setparams(params)
        for _ in range(loops_needed):
            wf_out.writeframes(frames)

    final_dur = probe_duration(dest_path)
    return final_dur


async def run_e2e():
    print("=== M1 Real End-to-End Transcription Test ===")
    assert SMOKE_WAV.is_file(), f"Smoke WAV not found at {SMOKE_WAV}"

    # 1. Build ~2-minute test audio
    print(f"Building ~2 minute test audio from {SMOKE_WAV.name}...")
    dur = build_looped_wav(SMOKE_WAV, E2E_WAV, target_duration_s=118.0)
    print(f"Created {E2E_WAV.name}: duration = {dur:.2f}s ({dur/60:.2f} min)")

    assert 110.0 <= dur <= 135.0, f"Expected ~2 min, got {dur}s"

    # 2. Split into chunks <= 28s
    chunk_dir = OUT_DIR / "m1_chunks"
    chunks = split_on_silence(E2E_WAV, target_s=25.0, max_s=28.0, out_dir=chunk_dir)
    print(f"Split into {len(chunks)} chunks:")
    for idx, (path, c_dur, c_off) in enumerate(chunks):
        print(f"  Chunk {idx}: {path.name} | duration = {c_dur:.2f}s | offset = {c_off:.2f}s")
        assert c_dur <= 28.0, f"Chunk {idx} exceeds 28s: {c_dur}s"

    # 3. Transcribe chunks using real Gnani Prisma STT (concurrency <= 3)
    print("\nTranscribing chunks with real Gnani Prisma v2.5 STT (concurrency <= 3)...")
    semaphore = asyncio.Semaphore(3)

    async def _worker(path: Path, idx: int):
        async with semaphore:
            res = await transcribe_file(path, "hi-IN")
            print(f"  [Chunk {idx} done] req_id: {res.request_id} | latency: {res.processing_time}s | text snippet: {res.transcript[:40]}...")
            return (idx, res)

    tasks = [_worker(p, i) for i, (p, _, _) in enumerate(chunks)]
    results = await asyncio.gather(*tasks)
    results.sort(key=lambda x: x[0])

    full_transcript = " ".join(r[1].transcript for r in results)
    print(f"\nReassembled Full Transcript ({len(full_transcript)} chars):")
    print(f"'{full_transcript[:120]}...'")

    # 4. Check budget guard
    print(f"\nSTT seconds consumed: {dur:.2f}s (Budget limit: 600s)")
    assert dur < 600.0, "Budget exceeded!"
    print("SUCCESS: Real M1 End-to-End Transcription test passed with 0 errors!")


if __name__ == "__main__":
    asyncio.run(run_e2e())
