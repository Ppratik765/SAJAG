"""Rescore existing evaluation items in latest.json with the updated text detection engine.
Preserves audio transcripts, durations, CER, and metadata while strictly adhering to:
- Text-engine runs only (0 STT credits consumed)
- Fresh holdout labeled as 'fresh holdout (seen after M3.1b)'
- Full signal objects stored for each item
"""

from __future__ import annotations
import json
import sys
from datetime import datetime, timezone
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[1]
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))
if str(REPO_ROOT / "api") not in sys.path:
    sys.path.insert(0, str(REPO_ROOT / "api"))

from app.engine.analyzer import analyze_text
from eval.corpus import load_all_scripts
from eval.run_eval import compute_metrics, get_git_commit, RESULTS_DIR

def main():
    scripts = {s.id: s for s in load_all_scripts()}
    latest_file = RESULTS_DIR / "latest.json"
    if not latest_file.is_file():
        print(f"Error: {latest_file} not found.")
        sys.exit(1)

    data = json.loads(latest_file.read_text(encoding="utf-8"))
    items = data["items"]

    updated_items = []
    for it in items:
        sid = it["script_id"]
        s = scripts.get(sid)
        if not s:
            print(f"Warning: Script {sid} not found in corpus.")
            continue

        transcript = it["transcript"]
        res = analyze_text(transcript, language_code=s.language)

        is_true_scam = (s.label != "legit")
        is_detected_scam = (res.level in ("likely_scam", "scam"))

        updated_item = {
            "script_id": sid,
            "language": s.language,
            "variant": it["variant"],
            "split": s.split,
            "label": s.label,
            "legit_kind": getattr(s, "legit_kind", None),
            "is_true_scam": is_true_scam,
            "detected_level": res.level,
            "is_detected_scam": is_detected_scam,
            "primary_type": res.primary_type,
            "score": res.score,
            "signals_count": len(res.signals),
            "signals": [
                {
                    "id": sig.id,
                    "category": sig.category,
                    "evidence": sig.evidence,
                    "weight": sig.weight,
                }
                for sig in res.signals
            ],
            "transcript": transcript,
            "audio_duration_seconds": it.get("audio_duration_seconds", 0.0),
            "cer": it.get("cer"),
        }
        updated_items.append(updated_item)

    # Compute metrics
    overall_metrics = compute_metrics(updated_items)

    dev_items = [it for it in updated_items if it.get("split") == "dev"]
    test_items = [it for it in updated_items if it.get("split") == "test"]
    holdout_items = [it for it in updated_items if it.get("split") == "holdout"]
    fresh_holdout_items = [it for it in updated_items if it.get("split") == "fresh_holdout"]

    per_split = {
        "dev": compute_metrics(dev_items),
        "test": compute_metrics(test_items),
        "holdout": compute_metrics(holdout_items),
        "fresh_holdout": compute_metrics(fresh_holdout_items),
    }

    per_language = {}
    for lang in sorted({it["language"] for it in updated_items}):
        per_language[lang] = compute_metrics([it for it in updated_items if it["language"] == lang])

    per_variant = {}
    for var in sorted({it["variant"] for it in updated_items}):
        per_variant[var] = compute_metrics([it for it in updated_items if it["variant"] == var])

    timestamp = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
    git_commit = get_git_commit()

    report = {
        "timestamp": timestamp,
        "git_commit": git_commit,
        "config": {
            "format": "verbatim",
            "hinglish_stt_lang": "en-IN",
            "variants": ["clean", "tel"],
            "scripts_count": len(scripts),
            "dev_count": len([s for s in scripts.values() if s.split == "dev"]),
            "test_count": len([s for s in scripts.values() if s.split == "test"]),
            "holdout_count": len([s for s in scripts.values() if s.split == "holdout"]),
            "fresh_holdout_count": len([s for s in scripts.values() if s.split == "fresh_holdout"]),
            "fresh_holdout_label": "fresh holdout (seen after M3.1b)",
        },
        "overall": overall_metrics,
        "per_split": per_split,
        "per_language": per_language,
        "per_variant": per_variant,
        "items": updated_items,
        "limitations": [
            "Process Invariant: The synthetic dialogue scripts and the detection rules were authored by the same engineering process.",
            "Audio Cleanliness: Synthetic TTS speech passed to STT is cleaner than real telephony calls (lacks low-bitrate carrier codecs, physical packet loss, acoustic echo, and heavy background noise).",
            "Headline Benchmark: Headline accuracy is reported on the unseen holdout set (evaluated exactly once after playbook freeze) and will be benchmarked on staged human-voice calls in M7.",
            "Telephony degradation uses simulated bandpass and noise, not physical telecom carrier paths.",
            "Fresh holdout label: 'fresh holdout (seen after M3.1b)' per M3.1b instructions.",
        ],
    }

    RESULTS_DIR.mkdir(parents=True, exist_ok=True)
    ts_file = RESULTS_DIR / f"{timestamp}.json"
    ts_file.write_text(json.dumps(report, indent=2, ensure_ascii=False), encoding="utf-8")
    latest_file.write_text(json.dumps(report, indent=2, ensure_ascii=False), encoding="utf-8")

    print("================================================================================")
    print("                    RESCORED BENCHMARK REPORT SUMMARY")
    print("================================================================================")
    print(f"Total Items: {len(updated_items)}")
    print(f"Overall Recall: {overall_metrics['recall']*100:.1f}%, FPR: {overall_metrics['false_positive_rate']*100:.2f}%, Precision: {overall_metrics['precision']*100:.1f}%")
    print("\n--- Per Split Metrics ---")
    for sp_name, m in per_split.items():
        label_suffix = " (seen after M3.1b)" if sp_name == "fresh_holdout" else ""
        print(f"[{sp_name.upper()}{label_suffix}] (Clips: {m['total_clips']})")
        print(f"  Precision: {m['precision']*100:.1f}% ({m['tp']} TP, {m['fp']} FP)")
        print(f"  Recall:    {m['recall']*100:.1f}% ({m['tp']} TP, {m['fn']} FN)")
        print(f"  F1 Score:  {m['f1']:.4f}")
        print(f"  FPR:       {m['false_positive_rate']*100:.2f}% ({m['fp']} FP / {m['fp']+m['tn']} legit)")
        print(f"  Type Acc:  {m['type_accuracy']*100:.1f}%")
        print(f"  CER:       {m['mean_cer']*100:.2f}%" if m.get("mean_cer") else "  CER: N/A")
    print("================================================================================")

if __name__ == "__main__":
    main()
