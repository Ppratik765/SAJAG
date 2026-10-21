"""Generate consolidated benchmark report with separate dev, test, and holdout splits.

Implements M3 reporting requirements:
- Dev split: 113 scripts (56 scam, 57 legit)
- Test split: 54 scripts (28 scam, 26 legit)
- Holdout split: 30 scripts (15 scam, 15 legit) evaluated on clean and tel (60 clips)
- Frozen playbook, zero tuning after holdout evaluation
"""

from __future__ import annotations

import asyncio
import json
from datetime import datetime, timezone
from pathlib import Path
import sys

REPO_ROOT = Path(__file__).resolve().parents[1]
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))
if str(REPO_ROOT / "api") not in sys.path:
    sys.path.insert(0, str(REPO_ROOT / "api"))

import httpx
from eval.corpus import load_all_scripts
from eval.run_eval import evaluate_clip, compute_metrics, get_git_commit, CORPUS_AUDIO_DIR, RESULTS_DIR

async def main() -> None:
    scripts = load_all_scripts()
    dev_scripts = [s for s in scripts if s.split == "dev"]
    test_scripts = [s for s in scripts if s.split == "test"]
    holdout_scripts = [s for s in scripts if s.split == "holdout"]

    print(f"Loaded scripts: dev={len(dev_scripts)}, test={len(test_scripts)}, holdout={len(holdout_scripts)}")

    all_items = []

    async with httpx.AsyncClient(timeout=httpx.Timeout(connect=10.0, read=45.0, write=15.0, pool=10.0)) as client:
        # 1. Evaluate dev scripts (clean)
        print("Evaluating dev scripts (clean)...")
        for s in dev_scripts:
            wav_path = CORPUS_AUDIO_DIR / "clean" / f"{s.id}.wav"
            if wav_path.is_file():
                res = await evaluate_clip(wav_path, s, "clean", hinglish_stt_lang="en-IN", client=client)
                all_items.append(res)
                await asyncio.sleep(0.1)

        # 2. Evaluate test scripts (clean)
        print("Evaluating test scripts (clean)...")
        for s in test_scripts:
            wav_path = CORPUS_AUDIO_DIR / "clean" / f"{s.id}.wav"
            if wav_path.is_file():
                res = await evaluate_clip(wav_path, s, "clean", hinglish_stt_lang="en-IN", client=client)
                all_items.append(res)
                await asyncio.sleep(0.2)

        # 3. Evaluate holdout scripts (clean and tel)
        print("Evaluating holdout scripts (clean and tel)...")
        for s in holdout_scripts:
            for variant in ("clean", "tel"):
                wav_path = CORPUS_AUDIO_DIR / variant / f"{s.id}.wav"
                if wav_path.is_file():
                    res = await evaluate_clip(wav_path, s, variant, hinglish_stt_lang="en-IN", client=client)
                    all_items.append(res)
                    await asyncio.sleep(0.1)

    print(f"Total evaluated clips: {len(all_items)}")

    # Compute overall and per-split metrics
    overall_metrics = compute_metrics(all_items)
    
    per_split = {
        "dev": compute_metrics([it for it in all_items if it.get("split") == "dev"]),
        "test": compute_metrics([it for it in all_items if it.get("split") == "test"]),
        "holdout": compute_metrics([it for it in all_items if it.get("split") == "holdout"]),
    }

    per_language = {}
    for lang in sorted({it["language"] for it in all_items}):
        per_language[lang] = compute_metrics([it for it in all_items if it["language"] == lang])

    per_variant = {}
    for var in sorted({it["variant"] for it in all_items}):
        per_variant[var] = compute_metrics([it for it in all_items if it["variant"] == var])

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
            "dev_count": len(dev_scripts),
            "test_count": len(test_scripts),
            "holdout_count": len(holdout_scripts),
        },
        "overall": overall_metrics,
        "per_split": per_split,
        "per_language": per_language,
        "per_variant": per_variant,
        "items": all_items,
        "limitations": [
            "Process Invariant: The synthetic dialogue scripts and the detection rules were authored by the same engineering process.",
            "Audio Cleanliness: Synthetic TTS speech passed to STT is cleaner than real telephony calls (lacks low-bitrate carrier codecs, physical packet loss, acoustic echo, and heavy background noise).",
            "Headline Benchmark: Headline accuracy is reported on the unseen holdout set (evaluated exactly once after playbook freeze) and will be benchmarked on staged human-voice calls in M7.",
            "Telephony degradation uses simulated bandpass and noise, not physical telecom carrier paths.",
        ],
    }

    # Save timestamped report and update latest.json
    RESULTS_DIR.mkdir(parents=True, exist_ok=True)
    ts_file = RESULTS_DIR / f"{timestamp}.json"
    latest_file = RESULTS_DIR / "latest.json"

    ts_file.write_text(json.dumps(report, indent=2, ensure_ascii=False), encoding="utf-8")
    latest_file.write_text(json.dumps(report, indent=2, ensure_ascii=False), encoding="utf-8")

    print("\n=== Split Breakdown Summary ===")
    for sp_name, m in per_split.items():
        print(f"\n[{sp_name.upper()}] (Clips: {m['total_clips']})")
        print(f"  Precision: {m['precision']*100:.1f}% ({m['tp']} TP, {m['fp']} FP)")
        print(f"  Recall:    {m['recall']*100:.1f}% ({m['tp']} TP, {m['fn']} FN)")
        print(f"  F1 Score:  {m['f1']:.4f}")
        print(f"  FPR:       {m['false_positive_rate']*100:.2f}% ({m['fp']} FP / {m['fp']+m['tn']} legit)")
        print(f"  Type Acc:  {m['type_accuracy']*100:.1f}%")
        print(f"  CER:       {m['mean_cer']*100:.2f}%" if m.get("mean_cer") else "  CER: N/A")

if __name__ == "__main__":
    asyncio.run(main())
