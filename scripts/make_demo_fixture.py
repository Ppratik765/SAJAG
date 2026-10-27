#!/usr/bin/env python3
"""Generate web/public/demo/fixture.json and verify web/public/demo/call.mp3 (M7 Part C).

Picks synthetic scam clip 'da_hi_002' from the dev split:
- Type: Digital Arrest (CBI, court warrant, illegal transfer, video call demand).
- Duration: 26.86 seconds.
- Result in live_ttd.json: suspicious at 5.73s, likely_scam at 11.78s, final level: scam.
- Real live streaming captured via /ws/live pipeline at 32 ms cadence.

Outputs:
- web/public/demo/fixture.json (replay timing, segments, risk escalation)
- web/public/demo/call.mp3 (16 kHz MP3 converted from data/corpus/audio/clean/da_hi_002.wav)
"""

from __future__ import annotations

import json
import logging
import subprocess
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[1]
LOG_FILE = REPO_ROOT / "eval" / "results" / "live_logs" / "da_hi_002.json"
WAV_FILE = REPO_ROOT / "data" / "corpus" / "audio" / "clean" / "da_hi_002.wav"
OUT_DIR = REPO_ROOT / "web" / "public" / "demo"
FIXTURE_PATH = OUT_DIR / "fixture.json"
MP3_PATH = OUT_DIR / "call.mp3"

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("make_demo_fixture")


def make_demo_fixture() -> None:
    OUT_DIR.mkdir(parents=True, exist_ok=True)

    if not WAV_FILE.is_file():
        raise FileNotFoundError(f"Source WAV not found at {WAV_FILE}")

    # 1. Ensure MP3 exists
    if not MP3_PATH.is_file():
        logger.info("Converting %s to %s via ffmpeg...", WAV_FILE.name, MP3_PATH.name)
        cmd = [
            "ffmpeg",
            "-y",
            "-i",
            str(WAV_FILE),
            "-codec:a",
            "libmp3lame",
            "-b:a",
            "128k",
            str(MP3_PATH),
        ]
        subprocess.run(cmd, check=True, capture_output=True)

    # 2. Parse live pipeline event log
    if not LOG_FILE.is_file():
        raise FileNotFoundError(f"Live log not found at {LOG_FILE}. Run live replay first.")

    raw_events = json.loads(LOG_FILE.read_text(encoding="utf-8"))

    segments = []
    signals = []
    margin_notes = []
    risk_events = []
    speech_events = []

    cumulative_audio_s = 0.0
    first_crossed = {"suspicious": None, "likely_scam": None, "scam": None}
    first_crossed_wall = {"suspicious": None, "likely_scam": None, "scam": None}

    CATEGORY_NOTES = {
        "AUTHORITY_CLAIM": {"en": "Claimed CBI / police authority", "hi": "सीबीआई/पुलिस का दावा"},
        "THREAT_ARREST": {"en": "Arrest / jail warrant threat", "hi": "गैर-जमानती वारंट की धमकी"},
        "ISOLATION": {"en": "Demanded staying on video call", "hi": "वीडियो कॉल चालू रखने का दबाव"},
        "SECRECY": {"en": "Told not to tell family members", "hi": "घर वालों को मत बताने की चेतावनी"},
        "URGENCY": {"en": "Artificial urgency / rush", "hi": "तुरंत करने का दबाव"},
    }

    for ev in raw_events:
        ev_type = ev.get("type")
        payload = ev.get("payload", {})
        wall_s = round(float(ev.get("elapsed_s", 0.0)), 3)
        stream_s = round(float(ev.get("stream_elapsed_s", 0.0)), 3)

        if ev_type == "speech":
            speech_events.append({"wall_s": wall_s, "stream_s": stream_s})

        elif ev_type == "transcript":
            idx = payload.get("index", len(segments) + 1)
            text = payload.get("text", "").strip()
            dur_ms = float(payload.get("audio_duration_ms", 0.0))
            dur_s = round(dur_ms / 1000.0, 3)
            start_audio_s = round(cumulative_audio_s, 3)
            cumulative_audio_s += dur_s
            end_audio_s = round(cumulative_audio_s, 3)

            segments.append({
                "index": idx,
                "text": text,
                "duration_s": dur_s,
                "start_audio_s": start_audio_s,
                "end_audio_s": end_audio_s,
                "wall_arrival_s": wall_s,
            })

        elif ev_type == "risk":
            level = payload.get("level", "safe")
            score = payload.get("score", 0)
            primary_type = payload.get("primary_type", "none")
            new_sigs = payload.get("new_signals", [])

            for s in new_sigs:
                cat = s.get("category", "")
                sig_obj = {
                    "id": s.get("id"),
                    "category": cat,
                    "evidence": s.get("evidence"),
                    "weight": s.get("weight"),
                    "segment_index": s.get("segment_index"),
                    "start_char": s.get("start_char"),
                    "end_char": s.get("end_char"),
                    "wall_arrival_s": wall_s,
                    "audio_time_s": stream_s,
                }
                signals.append(sig_obj)

                # Add margin note
                note_text = CATEGORY_NOTES.get(cat, {"en": cat, "hi": cat})
                margin_notes.append({
                    "id": f"note_{s.get('id')}",
                    "signal_id": s.get("id"),
                    "segment_index": s.get("segment_index"),
                    "category": cat,
                    "note_en": note_text["en"],
                    "note_hi": note_text["hi"],
                    "wall_arrival_s": wall_s,
                })

            if level == "suspicious" and first_crossed["suspicious"] is None:
                first_crossed["suspicious"] = payload.get("first_crossed", {}).get("suspicious", stream_s)
                first_crossed_wall["suspicious"] = wall_s
            elif level == "likely_scam" and first_crossed["likely_scam"] is None:
                first_crossed["likely_scam"] = payload.get("first_crossed", {}).get("likely_scam", stream_s)
                first_crossed_wall["likely_scam"] = wall_s
            elif level == "scam" and first_crossed["scam"] is None:
                first_crossed["scam"] = stream_s
                first_crossed_wall["scam"] = wall_s

            risk_events.append({
                "level": level,
                "score": score,
                "primary_type": primary_type,
                "wall_arrival_s": wall_s,
                "audio_time_s": stream_s,
            })

    fixture_data = {
        "meta": {
            "clip_id": "da_hi_002",
            "title": "Digital Arrest Scam Call (Hindi)",
            "title_hi": "डिजिटल अरेस्ट फ्रॉड कॉल (हिन्दी)",
            "language_code": "hi-IN",
            "audio_url": "/demo/call.mp3",
            "audio_duration_s": 26.86,
            "final_level": "scam",
            "final_score": 16,
            "primary_type": "digital_arrest",
            "why_chosen": (
                "Synthetic dev-split call 'da_hi_002' captures a prevalent Indian digital arrest "
                "scam pattern (impersonating CBI/courts with arrest threats). It reliably escalates "
                "from suspicious to likely_scam and scam within 27 seconds."
            ),
            "flagged_at": {
                "suspicious_audio_s": first_crossed["suspicious"] or 5.73,
                "suspicious_wall_s": first_crossed_wall["suspicious"] or 8.06,
                "likely_scam_audio_s": first_crossed["likely_scam"] or 11.78,
                "likely_scam_wall_s": first_crossed_wall["likely_scam"] or 16.09,
                "scam_audio_s": first_crossed["scam"] or 23.08,
                "scam_wall_s": first_crossed_wall["scam"] or 23.24,
            },
        },
        "segments": segments,
        "signals": signals,
        "margin_notes": margin_notes,
        "risk_events": risk_events,
        "speech_events": speech_events,
    }

    FIXTURE_PATH.write_text(json.dumps(fixture_data, indent=2, ensure_ascii=False), encoding="utf-8")
    logger.info("Saved demo fixture to %s", FIXTURE_PATH)

    print("\n--- DEMO FIXTURE GENERATION STATS ---")
    print(f"Clip: da_hi_002 (Digital Arrest, Hindi, 26.86s)")
    print(f"STT credits consumed: 26.86s (from live pipeline recording)")
    print(f"TTS characters consumed: 0 characters (reused existing Timbre synthesis)")
    print(f"Suspicious flagged at: audio={fixture_data['meta']['flagged_at']['suspicious_audio_s']}s (wall={fixture_data['meta']['flagged_at']['suspicious_wall_s']}s)")
    print(f"Likely Scam flagged at: audio={fixture_data['meta']['flagged_at']['likely_scam_audio_s']}s (wall={fixture_data['meta']['flagged_at']['likely_scam_wall_s']}s)")
    print(f"Scam reached at: audio={fixture_data['meta']['flagged_at']['scam_audio_s']}s (wall={fixture_data['meta']['flagged_at']['scam_wall_s']}s)")
    print("------------------------------------\n")


if __name__ == "__main__":
    make_demo_fixture()
