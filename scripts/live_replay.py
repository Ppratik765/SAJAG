#!/usr/bin/env python3
"""Live mode real-time replay runner (Milestone M4b).

Streams corpus audio through /ws/live at 32 ms cadence (512 samples = 1,024 bytes).
Measures time-to-detect (TTD) in audio time, wall-clock latency, and final level.
Writes results to eval/results/live_ttd.json.
"""

from __future__ import annotations

import asyncio
import json
import logging
import os
import sys
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
logger = logging.getLogger("live_replay")

FRAME_BYTES = 1024
FRAME_SAMPLES = 512
FRAME_INTERVAL_S = 0.032  # 32 ms per frame at 16 kHz

DEFAULT_WS_URL = os.environ.get("SAJAG_LIVE_WS_URL", "ws://127.0.0.1:8000/ws/live")


def _redact_event(data: Any) -> Any:
    """Recursively redact IDs and sensitive tokens."""
    if isinstance(data, dict):
        res = {}
        for k, v in data.items():
            if k in ("request_id", "segment_id", "utterance_id", "api_key", "x-api-key-id"):
                res[k] = "<id-redacted>"
            else:
                res[k] = _redact_event(v)
        return res
    elif isinstance(data, list):
        return [_redact_event(x) for x in data]
    return data


def load_and_normalize_wav(
    wav_path: Path,
    resample_method: str = "interp",
    append_silence_s: float = 0.0,
) -> tuple[bytes, float, int]:
    """Read a WAV file, downsample/resample to 16 kHz mono signed 16-bit PCM LE."""
    with wave.open(str(wav_path), "rb") as wf:
        n_channels = wf.getnchannels()
        sampwidth = wf.getsampwidth()
        framerate = wf.getframerate()
        n_frames = wf.getnframes()
        raw_bytes = wf.readframes(n_frames)

    duration_s = n_frames / framerate

    # Convert to numpy array of float32
    if sampwidth == 2:
        samples = np.frombuffer(raw_bytes, dtype=np.int16).astype(np.float32) / 32768.0
    elif sampwidth == 1:
        samples = (np.frombuffer(raw_bytes, dtype=np.uint8).astype(np.float32) - 128.0) / 128.0
    elif sampwidth == 4:
        samples = np.frombuffer(raw_bytes, dtype=np.int32).astype(np.float32) / 2147483648.0
    else:
        raise ValueError(f"Unsupported sample width: {sampwidth}")

    # If multi-channel, average or take channel 0
    if n_channels > 1:
        samples = samples.reshape(-1, n_channels)[:, 0]

    # Resample to 16,000 Hz if necessary
    target_rate = 16000
    if framerate != target_rate:
        if resample_method == "scipy":
            import math
            from scipy.signal import resample_poly
            gcd = math.gcd(target_rate, framerate)
            up = target_rate // gcd
            down = framerate // gcd
            samples = resample_poly(samples, up, down).astype(np.float32)
        else:
            target_len = int(round(len(samples) * target_rate / framerate))
            x_orig = np.linspace(0, len(samples) - 1, len(samples))
            x_target = np.linspace(0, len(samples) - 1, target_len)
            samples = np.interp(x_target, x_orig, samples)

    # Append trailing silence if requested
    if append_silence_s > 0:
        silence_samples = int(round(append_silence_s * target_rate))
        samples = np.concatenate([samples, np.zeros(silence_samples, dtype=np.float32)])

    # Hard clip to [-1.0, 1.0] and convert to int16
    samples = np.clip(samples, -1.0, 1.0)
    pcm16 = (samples * 32767.0).astype(np.int16)
    pcm16_bytes = pcm16.tobytes()

    effective_duration_s = len(samples) / target_rate
    return pcm16_bytes, effective_duration_s, target_rate


async def replay_clip(
    clip_id: str,
    wav_path: Path,
    language_code: str,
    *,
    base_ws_url: str = DEFAULT_WS_URL,
    append_silence_s: float = 0.0,
    resample_method: str = "interp",
) -> Dict[str, Any]:
    """Stream a single WAV clip through /ws/live at real-time cadence and record metrics."""
    logger.info("=== Starting replay: %s (%s, %s) ===", clip_id, language_code, wav_path.name)
    pcm_bytes, duration_s, sample_rate = load_and_normalize_wav(
        wav_path,
        resample_method=resample_method,
        append_silence_s=append_silence_s,
    )

    sep = "&" if "?" in base_ws_url else "?"
    ws_url = f"{base_ws_url}{sep}lang={language_code}"
    result: Dict[str, Any] = {
        "clip_id": clip_id,
        "wav_file": wav_path.name,
        "language_code": language_code,
        "audio_duration_s": round(duration_s, 2),
        "first_crossed": {"suspicious": None, "likely_scam": None},
        "wall_clock_latency_s": None,
        "final_level": "safe",
        "final_score": 0,
        "primary_type": "none",
        "signals": [],
        "messages_received": 0,
        "status": "pending",
    }

    raw_events: List[Dict[str, Any]] = []
    replay_start_time = time.time()

    try:
        async with websockets.connect(
            ws_url,
            max_size=2 * 1024 * 1024,
            ping_interval=20,
            ping_timeout=20,
        ) as ws:
            # 1. Wait for ready event
            ready_msg = await asyncio.wait_for(ws.recv(), timeout=15.0)
            ready_data = json.loads(ready_msg)
            now = time.time()
            raw_events.append({
                "elapsed_s": round(now - replay_start_time, 3),
                "received_at": time.strftime("%Y-%m-%dT%H:%M:%S", time.gmtime(now)) + f".{int((now % 1) * 1000):03d}Z",
                "type": ready_data.get("type"),
                "payload": _redact_event(ready_data),
            })
            if ready_data.get("type") != "ready":
                result["status"] = f"error_on_ready: {ready_data}"
                return result

            logger.info("Live WS ready. Streaming %0.2fs audio (%d bytes)...", duration_s, len(pcm_bytes))

            # Concurrently send audio and receive events
            receiver_done = asyncio.Event()
            sender_done = asyncio.Event()

            last_transcript_time: Optional[float] = None
            first_likely_scam_recorded = False

            async def receiver():
                nonlocal last_transcript_time, first_likely_scam_recorded
                try:
                    async for raw in ws:
                        if isinstance(raw, bytes):
                            continue
                        data = json.loads(raw)
                        ev_type = data.get("type")
                        result["messages_received"] += 1
                        now = time.time()

                        redacted = _redact_event(data)
                        raw_events.append({
                            "elapsed_s": round(now - replay_start_time, 3),
                            "received_at": time.strftime("%Y-%m-%dT%H:%M:%S", time.gmtime(now)) + f".{int((now % 1) * 1000):03d}Z",
                            "type": ev_type,
                            "payload": redacted,
                        })
                        logger.info(
                            "[WS event] +%0.3fs type=%s: %s",
                            round(now - replay_start_time, 3),
                            ev_type,
                            json.dumps(redacted),
                        )

                        if ev_type == "speech":
                            logger.debug("[WS speech_start]")
                        elif ev_type == "transcript":
                            last_transcript_time = time.time()
                            logger.info(
                                "[WS transcript #%d] %s (%0.1fms)",
                                data.get("index", 0),
                                data.get("text", "")[:40],
                                data.get("audio_duration_ms", 0.0),
                            )
                        elif ev_type == "risk":
                            now = time.time()
                            level = data.get("level", "safe")
                            score = data.get("score", 0)
                            primary_type = data.get("primary_type", "none")
                            fc = data.get("first_crossed", {})

                            result["final_level"] = level
                            result["final_score"] = score
                            result["primary_type"] = primary_type
                            if fc.get("suspicious") is not None and result["first_crossed"]["suspicious"] is None:
                                result["first_crossed"]["suspicious"] = fc["suspicious"]
                            if fc.get("likely_scam") is not None and result["first_crossed"]["likely_scam"] is None:
                                result["first_crossed"]["likely_scam"] = fc["likely_scam"]

                            # Measure latency from the transcript that triggered likely_scam
                            if level in ("likely_scam", "scam") and not first_likely_scam_recorded:
                                if last_transcript_time:
                                    result["wall_clock_latency_s"] = round(now - last_transcript_time, 3)
                                first_likely_scam_recorded = True

                            for sig in data.get("new_signals", []):
                                result["signals"].append({
                                    "category": sig.get("category"),
                                    "evidence": sig.get("evidence"),
                                    "weight": sig.get("weight"),
                                })

                            logger.info(
                                "[WS risk] level=%s score=%d type=%s fc=%s",
                                level,
                                score,
                                primary_type,
                                fc,
                            )
                        elif ev_type == "error":
                            logger.warning("[WS error] %s: %s", data.get("code"), data.get("message"))
                            result["error"] = data
                        elif ev_type == "end":
                            logger.info("[WS end] reason=%s", data.get("reason"))
                            break
                except websockets.exceptions.ConnectionClosed:
                    pass
                finally:
                    receiver_done.set()

            async def sender():
                offset = 0
                total_bytes = len(pcm_bytes)
                while offset < total_bytes:
                    frame = pcm_bytes[offset : offset + FRAME_BYTES]
                    if len(frame) < FRAME_BYTES:
                        # Pad trailing frame with silence to keep exact 1,024-byte invariant
                        frame = frame + b"\x00" * (FRAME_BYTES - len(frame))
                    await ws.send(frame)
                    offset += FRAME_BYTES
                    # Maintain real-time 32 ms cadence
                    await asyncio.sleep(FRAME_INTERVAL_S)

                logger.info("All audio frames sent (%0.2fs). Waiting for trailing transcripts...", duration_s)
                sender_done.set()

            # Run sender and receiver
            t_recv = asyncio.create_task(receiver())
            t_send = asyncio.create_task(sender())

            await t_send
            # Allow up to 4s for trailing VAD closure and risk update
            try:
                await asyncio.wait_for(receiver_done.wait(), timeout=4.0)
            except asyncio.TimeoutError:
                pass

            t_recv.cancel()
            result["status"] = "completed"

    except Exception as exc:
        logger.exception("Error during live replay of %s: %s", clip_id, exc)
        result["status"] = f"exception: {exc}"
    finally:
        # Save raw upstream event log
        logs_dir = REPO_ROOT / "eval" / "results" / "live_logs"
        logs_dir.mkdir(parents=True, exist_ok=True)
        log_file = logs_dir / f"{clip_id}.json"
        log_file.write_text(json.dumps(raw_events, indent=2, ensure_ascii=False), encoding="utf-8")
        logger.info("Saved raw event log to %s (%d events)", log_file, len(raw_events))

    return result


async def main():
    import argparse

    parser = argparse.ArgumentParser(description="Live replay runner through /ws/live")
    parser.add_argument("--clip", help="Run a single clip ID")
    parser.add_argument("--lang", default="hi-IN", help="Language code")
    parser.add_argument("--ws-url", default=DEFAULT_WS_URL, help="WebSocket URL for /ws/live")
    parser.add_argument("--out", default=str(REPO_ROOT / "eval" / "results" / "live_ttd.json"), help="Output JSON path")
    parser.add_argument("--append-silence-s", type=float, default=0.0, help="Append N seconds of silence to the clip")
    parser.add_argument("--resample-method", default="interp", choices=["interp", "scipy"], help="Resampling method")
    args = parser.parse_args()

    # Pre-declared clips for M4b
    TARGET_CLIPS = [
        # 3 dev scam
        {"id": "da_hi_002", "split": "dev", "label": "digital_arrest", "lang": "hi-IN", "variant": "clean"},
        {"id": "cp_en_001", "split": "dev", "label": "courier_parcel", "lang": "en-IN", "variant": "clean"},
        {"id": "bk_hi_001", "split": "dev", "label": "bank_kyc", "lang": "hi-IN", "variant": "clean"},
        # 3 test scam
        {"id": "da_hi_001", "split": "test", "label": "digital_arrest", "lang": "hi-IN", "variant": "clean"},
        {"id": "bk_en_001", "split": "test", "label": "bank_kyc", "lang": "en-IN", "variant": "clean"},
        {"id": "cp_hi_003", "split": "test", "label": "courier_parcel", "lang": "hi-IN", "variant": "clean"},
        # 2 legit advisory
        {"id": "holdout_legit_ba_en_001", "split": "holdout", "label": "legit", "lang": "en-IN", "variant": "clean"},
        {"id": "fresh_holdout_legit_police_hi_001", "split": "fresh_holdout", "label": "legit", "lang": "hi-IN", "variant": "clean"},
        # 2 tel_noise15 variants
        {"id": "da_hi_001", "split": "test", "label": "digital_arrest", "lang": "hi-IN", "variant": "tel_noise15"},
        {"id": "bk_en_001", "split": "test", "label": "bank_kyc", "lang": "en-IN", "variant": "tel_noise15"},
    ]

    if args.clip:
        # Run single clip
        matching = [c for c in TARGET_CLIPS if c["id"] == args.clip]
        if matching:
            clips_to_run = matching
        else:
            clips_to_run = [{"id": args.clip, "split": "manual", "label": "manual", "lang": args.lang, "variant": "clean"}]
    else:
        clips_to_run = TARGET_CLIPS

    results: List[Dict[str, Any]] = []
    total_audio_s = 0.0

    for item in clips_to_run:
        cid = item["id"]
        variant = item["variant"]
        lang = item["lang"]
        wav_path = REPO_ROOT / "data" / "corpus" / "audio" / variant / f"{cid}.wav"

        if not wav_path.is_file():
            logger.error("WAV file not found: %s", wav_path)
            continue

        res = await replay_clip(
            clip_id=f"{cid}_{variant}" if variant != "clean" else cid,
            wav_path=wav_path,
            language_code=lang,
            base_ws_url=args.ws_url,
            append_silence_s=args.append_silence_s,
            resample_method=args.resample_method,
        )
        res["split"] = item["split"]
        res["label"] = item["label"]
        res["variant"] = variant
        results.append(res)
        total_audio_s += res.get("audio_duration_s", 0.0)

    # Summary table
    print("\n" + "=" * 90)
    print(f"SAJAG LIVE REPLAY TIME-TO-DETECT SUMMARY (Total Audio Sent: {total_audio_s:.1f}s)")
    print("=" * 90)
    print(f"{'Clip ID':<30} {'Variant':<12} {'Label':<15} {'Duration':<9} {'FC Susp':<9} {'FC Scam':<9} {'Final Level':<12}")
    print("-" * 90)

    scam_ttd_values = []
    for r in results:
        fc_susp = f"{r['first_crossed']['suspicious']}s" if r['first_crossed']['suspicious'] else "-"
        fc_scam = f"{r['first_crossed']['likely_scam']}s" if r['first_crossed']['likely_scam'] else "-"
        print(f"{r['clip_id']:<30} {r['variant']:<12} {r['label']:<15} {r['audio_duration_s']:<9.1f} {fc_susp:<9} {fc_scam:<9} {r['final_level']:<12}")
        if r['label'] != 'legit' and r['first_crossed']['likely_scam'] is not None:
            scam_ttd_values.append(r['first_crossed']['likely_scam'])

    if scam_ttd_values:
        print("-" * 90)
        print(f"Scam Time-To-Detect (audio-time to likely_scam, n={len(scam_ttd_values)}):")
        print(f"  Median: {float(np.median(scam_ttd_values)):.1f}s | Min: {min(scam_ttd_values):.1f}s | Max: {max(scam_ttd_values):.1f}s")
    print("=" * 90)

    out_file = Path(args.out)
    out_file.parent.mkdir(parents=True, exist_ok=True)
    out_file.write_text(json.dumps(results, indent=2, ensure_ascii=False), encoding="utf-8")
    logger.info("Saved results to %s", out_file)


if __name__ == "__main__":
    asyncio.run(main())
