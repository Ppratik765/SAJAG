"""make_live_test_clip.build_fixture: pure conversion of a recorded event log (no network, no credits)."""
import importlib.util
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
spec = importlib.util.spec_from_file_location("make_live_test_clip", ROOT / "scripts" / "make_live_test_clip.py")
mod = importlib.util.module_from_spec(spec)
spec.loader.exec_module(mod)

LOG = ROOT / "eval" / "results" / "live_logs" / "da_hi_002.json"
META = {"id": "x", "kind": "synthetic", "title": "t", "title_hi": "t", "language_code": "hi-IN",
        "audio_url": "/live-tests/x/call.mp3", "audio_duration_s": 26.86, "credit": "c"}


def test_stream_clock_used_and_duplicates_removed():
    events = json.loads(LOG.read_text(encoding="utf-8"))
    fx = mod.build_fixture(events, META)
    idx = [s["index"] for s in fx["segments"]]
    assert idx == sorted(set(idx))
    # appear_s comes from stream_elapsed_s, not the wall clock that includes the ~1.95 s connect time
    first = next(e for e in events if e["type"] == "transcript")
    assert fx["segments"][0]["appear_s"] == round(first["stream_elapsed_s"], 3)
    assert fx["segments"][0]["appear_s"] < first["elapsed_s"]
    # segment audio offsets are contiguous
    for a, b in zip(fx["segments"], fx["segments"][1:]):
        assert abs(a["audio_end_s"] - b["audio_start_s"]) < 1e-6


def test_first_appeared_and_final_level_from_events_only():
    fx = mod.build_fixture(json.loads(LOG.read_text(encoding="utf-8")), META)
    fa = fx["meta"]["first_appeared_s"]
    assert fa["suspicious"] < fa["likely_scam"] < fa["scam"]
    assert fx["meta"]["final_level"] == "scam"


def test_events_before_first_frame_are_ignored_and_empty_log_is_empty():
    assert mod.build_fixture([{"type": "ready", "elapsed_s": 1.9, "payload": {}}], META)["segments"] == []


def test_evidence_is_substring_of_segment_text():
    fx = mod.build_fixture(json.loads(LOG.read_text(encoding="utf-8")), META)
    by_idx = {s["index"]: s["text"] for s in fx["segments"]}
    for sig in fx["signals"]:
        assert sig["evidence"] in by_idx[sig["segment_index"]]
