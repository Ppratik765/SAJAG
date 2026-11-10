#!/usr/bin/env python3
"""Build one "See live test" clip for the website (/test and /demo).

What it does, in order:
  1. Cuts/converts your source audio (any format ffmpeg reads) to 16 kHz mono WAV (for Prisma) and MP3 (for the website).
  2. Unless --log is given, streams the WAV through the REAL backend `/ws/live` at real-time pace
     (scripts/live_replay.py:replay_clip). This is the only step that spends Gnani STT credits
     (about 1 credit-second per second of audio; see docs/LIVE_TEST_CLIPS.md).
  3. Converts the recorded event log into web/public/live-tests/<id>/fixture.json and
     web/public/live-tests/<id>/call.mp3, and upserts web/public/live-tests/manifest.json.

Timing rule (important): every time in the fixture is on the STREAM CLOCK = seconds since the first audio frame was
sent = the same clock as audio playback. `appear_s` is the moment the transcript / alert actually arrived, i.e. what
a listener would have seen N seconds into the call. Nothing is typed in; everything comes from the event log.

Usage examples:
  python scripts/make_live_test_clip.py --id da_real_01 --audio data/private_audio/call1.mp3 \
      --start 12 --duration 90 --lang hi-IN --kind real \
      --title "Digital arrest call (real recording)" --title-hi "डिजिटल अरेस्ट कॉल (असली रिकॉर्डिंग)" \
      --credit "Source: <channel/uploader>, used with permission for educational purposes"
  python scripts/make_live_test_clip.py --id da_real_01 --log eval/results/live_logs/da_real_01.json --audio ... (rebuild, no credits)
"""
from __future__ import annotations

import argparse
import asyncio
import json
import re
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path
from typing import Any

REPO_ROOT = Path(__file__).resolve().parent.parent
OUT_ROOT = REPO_ROOT / "web" / "public" / "live-tests"
MANIFEST = OUT_ROOT / "manifest.json"
LOG_DIR = REPO_ROOT / "eval" / "results" / "live_logs"

MAX_CLIP_SECONDS = 150  # server MAX_LIVE_SESSION_SECONDS defaults to 180; leave room for connect + flush
SUPPORTED_LANGS = {"hi-IN", "en-IN"}
KINDS = {"synthetic", "real"}
ID_RE = re.compile(r"^[a-z0-9][a-z0-9_-]{1,40}$")
RANK = {"safe": 0, "suspicious": 1, "likely_scam": 2, "scam": 3}


def run(cmd: list[str]) -> None:
    subprocess.run(cmd, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.PIPE)


def prepare_audio(src: Path, start: float, duration: float | None, wav_out: Path, mp3_out: Path) -> float:
    """Cut and convert. Returns the clip duration in seconds (from ffprobe on the WAV)."""
    if shutil.which("ffmpeg") is None:
        raise SystemExit("ffmpeg is required (apt install ffmpeg / brew install ffmpeg).")
    base = ["ffmpeg", "-y", "-ss", str(start)]
    if duration:
        base += ["-t", str(duration)]
    base += ["-i", str(src), "-ac", "1", "-ar", "16000"]
    run(base + ["-c:a", "pcm_s16le", str(wav_out)])
    run(base + ["-c:a", "libmp3lame", "-b:a", "48k", str(mp3_out)])
    probe = subprocess.run(
        ["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", str(wav_out)],
        check=True, capture_output=True, text=True,
    )
    return round(float(probe.stdout.strip()), 2)


def build_fixture(events: list[dict[str, Any]], meta: dict[str, Any]) -> dict[str, Any]:
    """Event log -> fixture. Pure function (no I/O) so it can be unit-tested."""
    segments: list[dict[str, Any]] = []
    signals: list[dict[str, Any]] = []
    risk: list[dict[str, Any]] = []
    speech: list[float] = []
    heard = 0.0

    for ev in events:
        t = ev.get("stream_elapsed_s")
        payload = ev.get("payload", {})
        kind = ev.get("type")
        if t is None:
            continue  # before the first audio frame (e.g. `ready`)
        t = round(float(t), 3)
        if kind == "speech":
            speech.append(t)
        elif kind == "transcript":
            dur = round(float(payload.get("audio_duration_ms", 0.0)) / 1000.0, 3)
            segments.append({
                "index": payload.get("index", len(segments) + 1),
                "text": str(payload.get("text", "")).strip(),
                "audio_start_s": round(heard, 3),
                "audio_end_s": round(heard + dur, 3),
                "appear_s": t,
                "stt_latency_ms": payload.get("latency"),
            })
            heard += dur
        elif kind == "risk":
            for s in payload.get("new_signals", []) or []:
                signals.append({
                    "id": s.get("id"),
                    "category": s.get("category"),
                    "weight": s.get("weight"),
                    "evidence": s.get("evidence"),
                    "segment_index": s.get("segment_index"),
                    "appear_s": t,
                })
            risk.append({
                "level": payload.get("level", "safe"),
                "score": payload.get("score", 0),
                "primary_type": payload.get("primary_type", "none"),
                "appear_s": t,
                "audio_heard_s": round(heard, 3),
            })

    # De-duplicate: the log can contain the same transcript event twice (seen in da_hi_002.json).
    seen: set[int] = set()
    uniq: list[dict[str, Any]] = []
    for s in segments:
        if s["index"] in seen:
            continue
        seen.add(s["index"])
        uniq.append(s)
    # Recompute audio offsets on the de-duplicated list.
    heard = 0.0
    for s in uniq:
        dur = round(s["audio_end_s"] - s["audio_start_s"], 3)
        s["audio_start_s"] = round(heard, 3)
        heard += dur
        s["audio_end_s"] = round(heard, 3)
    for r in risk:
        r["audio_heard_s"] = max((s["audio_end_s"] for s in uniq if s["appear_s"] <= r["appear_s"] + 0.01), default=0.0)

    first: dict[str, float] = {}
    for name in ("suspicious", "likely_scam", "scam"):
        hit = next((r for r in risk if RANK.get(r["level"], 0) >= RANK[name]), None)
        if hit:
            first[name] = hit["appear_s"]

    final = risk[-1] if risk else {"level": "safe", "score": 0, "primary_type": "none"}
    return {
        "meta": {**meta, "final_level": final["level"], "final_score": final["score"],
                 "primary_type": final["primary_type"], "first_appeared_s": first},
        "segments": uniq,
        "signals": signals,
        "risk_events": risk,
        "speech_events": speech,
    }


def upsert_manifest(entry: dict[str, Any]) -> None:
    items: list[dict[str, Any]] = []
    if MANIFEST.is_file():
        items = json.loads(MANIFEST.read_text(encoding="utf-8")).get("clips", [])
    items = [i for i in items if i["id"] != entry["id"]] + [entry]
    items.sort(key=lambda i: (i["kind"] != "real", i["id"]))  # real first, then synthetic
    MANIFEST.write_text(json.dumps({"version": 1, "clips": items}, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")


def main() -> None:
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument("--id", required=True, help="lowercase id, e.g. da_real_01")
    p.add_argument("--audio", required=True, type=Path, help="source audio file (any ffmpeg format)")
    p.add_argument("--lang", default="hi-IN", choices=sorted(SUPPORTED_LANGS))
    p.add_argument("--kind", default="real", choices=sorted(KINDS))
    p.add_argument("--title", required=True)
    p.add_argument("--title-hi", default="")
    p.add_argument("--credit", default="", help="attribution line shown under the player (required for kind=real)")
    p.add_argument("--start", type=float, default=0.0, help="seconds to skip at the start")
    p.add_argument("--duration", type=float, default=None, help="seconds to keep (default: whole file, max 150)")
    p.add_argument("--log", type=Path, default=None, help="reuse an existing event log instead of calling Gnani")
    p.add_argument("--ws-url", default=None, help="override /ws/live URL (default http://127.0.0.1:8000)")
    p.add_argument("--yes", action="store_true", help="skip the credit confirmation prompt")
    a = p.parse_args()

    if not ID_RE.match(a.id):
        raise SystemExit("--id must be lowercase letters, digits, - or _ (2-41 chars)")
    if a.kind == "real" and not a.credit.strip():
        raise SystemExit("--credit is required for kind=real (who made the recording, and the permission basis).")
    if not a.audio.is_file():
        raise SystemExit(f"Audio not found: {a.audio}")

    out_dir = OUT_ROOT / a.id
    out_dir.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory() as tmp:
        wav = Path(tmp) / f"{a.id}.wav"
        mp3 = out_dir / "call.mp3"
        dur = prepare_audio(a.audio, a.start, a.duration, wav, mp3)
        if dur > MAX_CLIP_SECONDS:
            mp3.unlink(missing_ok=True)
            raise SystemExit(f"Clip is {dur}s; max is {MAX_CLIP_SECONDS}s (live session limit). Use --start/--duration.")

        log_path = a.log or (LOG_DIR / f"{a.id}.json")
        if a.log is None:
            print(f"About to stream {dur}s of audio through the real backend -> roughly {dur:.0f} STT credit-seconds.")
            if not a.yes and input("Continue? [y/N] ").strip().lower() != "y":
                raise SystemExit("Aborted, nothing spent.")
            sys.path.insert(0, str(REPO_ROOT / "scripts"))
            import live_replay  # noqa: E402

            kwargs: dict[str, Any] = {"append_silence_s": 3.0}
            if a.ws_url:
                kwargs["base_ws_url"] = a.ws_url
            result = asyncio.run(live_replay.replay_clip(a.id, wav, a.lang, **kwargs))
            print(f"Replay status={result.get('status')} final={result.get('final_level')} log={log_path}")
        events = json.loads(log_path.read_text(encoding="utf-8"))

    meta = {
        "id": a.id, "kind": a.kind, "title": a.title, "title_hi": a.title_hi or a.title,
        "language_code": a.lang, "audio_url": f"/live-tests/{a.id}/call.mp3",
        "audio_duration_s": dur, "credit": a.credit.strip(),
        "captured_with": "Gnani Prisma STT via this site's /ws/live, streamed at real-time pace",
    }
    fixture = build_fixture(events, meta)
    if not fixture["segments"]:
        raise SystemExit("The log has no transcripts, so nothing was published. Check the log and the language.")
    (out_dir / "fixture.json").write_text(json.dumps(fixture, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    upsert_manifest({
        "id": a.id, "kind": a.kind, "title": a.title, "title_hi": a.title_hi or a.title,
        "language_code": a.lang, "duration_s": dur, "fixture_url": f"/live-tests/{a.id}/fixture.json",
        "final_level": fixture["meta"]["final_level"],
    })
    print(json.dumps(fixture["meta"]["first_appeared_s"], indent=2))
    print(f"Wrote {out_dir}/fixture.json, call.mp3 and updated {MANIFEST}")
    print("REVIEW BEFORE PUBLISHING: read every transcript line for names, phone numbers, account numbers.")


if __name__ == "__main__":
    main()
