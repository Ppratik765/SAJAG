#!/usr/bin/env python3
"""Private real-audio evaluation tool (M7 Part E).

Evaluates user-provided real scam-call or scam-awareness audio recordings
located in data/private_audio/ without storing transcripts, evidence quotes,
or personal caller details.

STRICT PRIVACY GUARANTEE:
- Raw recordings never leave the local machine and are git-ignored.
- Only aggregate metrics and high-level signal categories are written
  to eval/results/real_audio_summary.json.
- Verbatim transcripts and quotes are NEVER persisted to disk.

Usage:
  python scripts/eval_real_audio.py [folder] [--lang hi-IN] [--yes]
"""

from __future__ import annotations

import argparse
import asyncio
import json
import logging
import os
import subprocess
import sys
import tempfile
import time
import wave
from pathlib import Path
from typing import Any, Dict, List, Optional

import numpy as np
import websockets

REPO_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(REPO_ROOT / "api"))

from app.config.settings import load_dotenv

load_dotenv()

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("eval_real_audio")

FRAME_BYTES = 1024
FRAME_SAMPLES = 512
FRAME_INTERVAL_S = 0.032  # 32 ms cadence

DEFAULT_WS_URL = os.environ.get("SAJAG_LIVE_WS_URL", "ws://127.0.0.1:8000/ws/live")
RESULTS_PATH = REPO_ROOT / "eval" / "results" / "real_audio_summary.json"


def probe_duration(path: Path) -> float:
    """Probe audio duration in seconds using ffprobe."""
    cmd = [
        "ffprobe",
        "-v",
        "error",
        "-show_entries",
        "format=duration",
        "-of",
        "json",
        str(path),
    ]
    res = subprocess.run(cmd, capture_output=True, text=True, check=True)
    data = json.loads(res.stdout)
    return float(data.get("format", {}).get("duration", 0.0))


def convert_to_16k_mono(input_path: Path, output_path: Path) -> None:
    """Convert input audio to 16 kHz mono signed 16-bit PCM WAV using ffmpeg."""
    cmd = [
        "ffmpeg",
        "-y",
        "-i",
        str(input_path),
        "-ar",
        "16000",
        "-ac",
        "1",
        "-c:a",
        "pcm_s16le",
        str(output_path),
    ]
    subprocess.run(cmd, capture_output=True, check=True)


async def replay_single_file(
    wav_path: Path,
    file_index: int,
    ws_url: str,
    lang: str,
) -> Dict[str, Any]:
    """Stream one audio file through /ws/live and return aggregate-only metrics."""
    with wave.open(str(wav_path), "rb") as wf:
        n_frames = wf.getnframes()
        framerate = wf.getframerate()
        raw_pcm = wf.readframes(n_frames)

    duration_s = round(n_frames / float(framerate), 2)
    url = f"{ws_url}?lang={lang}"

    # Pacing state
    segments_count = 0
    signals_count = 0
    categories_set = set()
    final_level = "safe"
    time_to_suspicious_audio = None
    time_to_suspicious_wall = None
    time_to_likely_scam_audio = None
    time_to_likely_scam_wall = None

    stream_start_wall = time.time()
    frames = [raw_pcm[i : i + FRAME_BYTES] for i in range(0, len(raw_pcm), FRAME_BYTES)]

    # Add 1.5s trailing silence frames for clean VAD finalization
    silence_frames = 45
    frames.extend([b"\x00" * FRAME_BYTES] * silence_frames)

    async with websockets.connect(url, max_size=10 * 1024 * 1024) as ws:
        # Sender coroutine
        async def sender():
            target_time = stream_start_wall
            for frame in frames:
                if len(frame) < FRAME_BYTES:
                    frame = frame + b"\x00" * (FRAME_BYTES - len(frame))
                await ws.send(frame)
                target_time += FRAME_INTERVAL_S
                sleep_s = target_time - time.time()
                if sleep_s > 0:
                    await asyncio.sleep(sleep_s)

        # Receiver coroutine
        async def receiver():
            nonlocal segments_count, signals_count, final_level
            nonlocal time_to_suspicious_audio, time_to_suspicious_wall
            nonlocal time_to_likely_scam_audio, time_to_likely_scam_wall

            while True:
                try:
                    msg = await ws.recv()
                    wall_elapsed = round(time.time() - stream_start_wall, 3)
                    if isinstance(msg, bytes):
                        continue
                    data = json.loads(msg)
                    ev_type = data.get("type")

                    if ev_type == "transcript":
                        segments_count += 1

                    elif ev_type == "risk":
                        lvl = data.get("level", "safe")
                        final_level = lvl
                        first_crossed = data.get("first_crossed", {})

                        if lvl == "suspicious" and time_to_suspicious_wall is None:
                            time_to_suspicious_audio = first_crossed.get("suspicious")
                            time_to_suspicious_wall = wall_elapsed
                        elif (lvl == "likely_scam" or lvl == "scam") and time_to_likely_scam_wall is None:
                            time_to_likely_scam_audio = first_crossed.get("likely_scam")
                            time_to_likely_scam_wall = wall_elapsed

                        for sig in data.get("new_signals", []):
                            signals_count += 1
                            cat = sig.get("category")
                            if cat:
                                categories_set.add(cat)

                    elif ev_type in ("end", "error"):
                        break

                except websockets.exceptions.ConnectionClosed:
                    break

        sender_task = asyncio.create_task(sender())
        receiver_task = asyncio.create_task(receiver())

        await sender_task
        # Allow up to 4s for remaining server processing
        await asyncio.wait_for(asyncio.shield(receiver_task), timeout=5.0)

    # Return STRICTLY aggregate statistics. NO quotes, NO transcripts, NO filename.
    return {
        "file_index": file_index,
        "duration_s": duration_s,
        "language_code": lang,
        "final_level": final_level,
        "time_to_suspicious_audio_s": time_to_suspicious_audio,
        "time_to_suspicious_wall_s": time_to_suspicious_wall,
        "time_to_likely_scam_audio_s": time_to_likely_scam_audio,
        "time_to_likely_scam_wall_s": time_to_likely_scam_wall,
        "transcript_segment_count": segments_count,
        "signal_count": signals_count,
        "signal_categories": sorted(list(categories_set)),
    }


async def main() -> None:
    parser = argparse.ArgumentParser(description="Evaluate private scam audio recordings safely")
    parser.add_argument("folder", nargs="?", default="data/private_audio", help="Folder containing audio files")
    parser.add_argument("--lang", default="hi-IN", help="Speech recognition language code (default: hi-IN)")
    parser.add_argument("--ws-url", default=DEFAULT_WS_URL, help="WebSocket URL for /ws/live")
    parser.add_argument("--yes", action="store_true", help="Confirm execution above 600s budget")
    args = parser.parse_args()

    target_dir = Path(args.folder)
    if not target_dir.is_dir():
        target_dir.mkdir(parents=True, exist_ok=True)
        print(f"Created folder: {target_dir}")
        print("Place your private .wav, .mp3, or .m4a audio files here and rerun.")
        return

    # Find audio files
    extensions = {".wav", ".mp3", ".m4a", ".aac", ".ogg", ".flac"}
    files = sorted([f for f in target_dir.iterdir() if f.is_file() and f.suffix.lower() in extensions])

    if not files:
        print(f"No audio files found in {target_dir}.")
        print("To evaluate private real-world calls safely:")
        print("1. Place trimmed audio recordings in data/private_audio/")
        print("2. Run: python scripts/eval_real_audio.py data/private_audio/ --lang hi-IN")
        return

    # 1. Budget Projection
    print(f"\nScanning {len(files)} audio recordings in {target_dir}...")
    total_seconds = 0.0
    file_durations = []

    for f in files:
        dur = probe_duration(f)
        file_durations.append((f, dur))
        total_seconds += dur

    print(f"\n=======================================================")
    print(f"BUDGET PROJECTION FOR PRIVATE REAL AUDIO EVALUATION")
    print(f"Total files: {len(files)}")
    print(f"Total duration: {total_seconds:.1f} seconds ({total_seconds / 60.0:.2f} minutes)")
    print(f"Speech recognition language: {args.lang}")
    print(f"=======================================================\n")

    if total_seconds > 600 and not args.yes:
        print(f"ERROR: Total duration ({total_seconds:.1f}s) exceeds the 600s safety limit.")
        print("To proceed with this run, pass --yes flag:")
        print(f"  python scripts/eval_real_audio.py {args.folder} --lang {args.lang} --yes")
        sys.exit(1)

    # 2. Run Replay on Each File
    file_results = []
    temp_dir = Path(tempfile.mkdtemp(prefix="sajag_real_audio_"))

    try:
        for idx, (src_file, dur) in enumerate(file_durations, start=1):
            print(f"[{idx}/{len(files)}] Processing recording #{idx} ({dur:.1f}s)...")
            conv_wav = temp_dir / f"clean_{idx}.wav"
            convert_to_16k_mono(src_file, conv_wav)

            try:
                res = await replay_single_file(conv_wav, idx, args.ws_url, args.lang)
                file_results.append(res)
                print(f"    -> Result: Level={res['final_level']} | Signals={res['signal_count']} | Categories={res['signal_categories']}")
                if res['time_to_likely_scam_audio_s']:
                    print(f"    -> Likely Scam flagged at {res['time_to_likely_scam_audio_s']:.1f}s (audio time)")
            except Exception as err:
                logger.error("Failed processing recording #%d: %s", idx, err)
                file_results.append({
                    "file_index": idx,
                    "duration_s": dur,
                    "language_code": args.lang,
                    "error": str(err),
                })
            finally:
                if conv_wav.is_file():
                    conv_wav.unlink(missing_ok=True)

    finally:
        import shutil
        shutil.rmtree(temp_dir, ignore_errors=True)

    # 3. Calculate Aggregate Metrics
    successful = [r for r in file_results if "error" not in r]
    scam_count = sum(1 for r in successful if r["final_level"] in ("likely_scam", "scam"))
    likely_scam_times = [
        r["time_to_likely_scam_audio_s"]
        for r in successful
        if r["time_to_likely_scam_audio_s"] is not None
    ]
    median_time = float(np.median(likely_scam_times)) if likely_scam_times else None

    summary = {
        "metadata": {
            "date": time.strftime("%Y-%m-%d %H:%M:%S UTC", time.gmtime()),
            "total_recordings": len(files),
            "total_duration_seconds": round(total_seconds, 2),
            "language_code": args.lang,
            "reached_likely_scam_count": scam_count,
            "reached_likely_scam_pct": round((scam_count / len(successful)) * 100, 1) if successful else 0.0,
            "median_time_to_likely_scam_s": round(median_time, 2) if median_time else None,
            "privacy_notice": (
                "AGGREGATE ONLY: In compliance with project privacy policies, no raw audio, "
                "verbatim transcripts, or evidence snippets are saved or published."
            ),
        },
        "recordings": file_results,
    }

    RESULTS_PATH.parent.mkdir(parents=True, exist_ok=True)
    RESULTS_PATH.write_text(json.dumps(summary, indent=2, ensure_ascii=False), encoding="utf-8")
    print(f"\nSaved aggregate summary to {RESULTS_PATH}")
    print("\n--- SUMMARY OF REAL RECORDINGS EVALUATION ---")
    print(f"Recordings tested: {len(files)}")
    print(f"Reached likely_scam: {scam_count}/{len(successful)} ({summary['metadata']['reached_likely_scam_pct']}%)")
    print(f"Median audio time to detection: {median_time}s" if median_time else "Median detection time: N/A")
    print("---------------------------------------------\n")


if __name__ == "__main__":
    asyncio.run(main())
