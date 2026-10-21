"""Run Section 8.5 STT Configuration Experiments on dev split.

Decides with data and records in docs/DECISIONS.md:
1. Hinglish speech: hi-IN vs en-IN
2. format=verbatim vs transcribe
3. Word boosting off vs on (bias_score=0.0 vs 1.0) with change in FPR
"""

from __future__ import annotations

import asyncio
import json
import os
import sys
from pathlib import Path
from typing import Any, Sequence

import httpx

REPO_ROOT = Path(__file__).resolve().parents[1]
if str(REPO_ROOT / "api") not in sys.path:
    sys.path.insert(0, str(REPO_ROOT / "api"))
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))

from eval.corpus import Script, load_all_scripts
from eval.run_eval import CORPUS_AUDIO_DIR, compute_metrics, evaluate_clip


async def run_clips(
    scripts: Sequence[Script],
    *,
    fmt: str = "verbatim",
    hinglish_stt_lang: str = "hi-IN",
    bias_list: Sequence[str] | None = None,
    bias_score: float = 0.0,
    variant: str = "clean",
) -> list[dict[str, Any]]:
    results = []
    async with httpx.AsyncClient(timeout=httpx.Timeout(connect=10.0, read=45.0, write=15.0, pool=10.0)) as client:
        for s in scripts:
            audio_path = CORPUS_AUDIO_DIR / variant / f"{s.id}.wav"
            if not audio_path.is_file():
                continue
            res = await evaluate_clip(
                audio_path,
                s,
                variant=variant,
                fmt=fmt,
                hinglish_stt_lang=hinglish_stt_lang,
                bias_list=bias_list,
                bias_score=bias_score,
                client=client,
            )
            results.append(res)
    return results


async def main() -> None:
    all_scripts = load_all_scripts()
    dev_scripts = [s for s in all_scripts if s.split == "dev"]

    print(f"Total dev scripts: {len(dev_scripts)}")

    # -------------------------------------------------------------
    # Experiment 1: Hinglish Speech: hi-IN vs en-IN
    # -------------------------------------------------------------
    hien_dev = [s for s in dev_scripts if s.language == "hi-en"]
    print(f"\n==========================================")
    print(f"Experiment 1: Hinglish hi-IN vs en-IN ({len(hien_dev)} dev clips)")
    print(f"==========================================")

    res_hien_hi = await run_clips(hien_dev, hinglish_stt_lang="hi-IN")
    m_hien_hi = compute_metrics(res_hien_hi)
    print("hi-IN results:", json.dumps(m_hien_hi, indent=2))

    res_hien_en = await run_clips(hien_dev, hinglish_stt_lang="en-IN")
    m_hien_en = compute_metrics(res_hien_en)
    print("en-IN results:", json.dumps(m_hien_en, indent=2))

    # -------------------------------------------------------------
    # Experiment 2: format=verbatim vs transcribe
    # -------------------------------------------------------------
    # Sample 30 dev scripts across languages (15 scam, 15 legit)
    dev_scam = [s for s in dev_scripts if s.label != "legit"]
    dev_legit = [s for s in dev_scripts if s.label == "legit"]
    exp2_scripts = dev_scam[:15] + dev_legit[:15]

    print(f"\n==========================================")
    print(f"Experiment 2: verbatim vs transcribe ({len(exp2_scripts)} dev clips)")
    print(f"==========================================")

    res_verb = await run_clips(exp2_scripts, fmt="verbatim")
    m_verb = compute_metrics(res_verb)
    print("verbatim results:", json.dumps(m_verb, indent=2))

    res_trans = await run_clips(exp2_scripts, fmt="transcribe")
    m_trans = compute_metrics(res_trans)
    print("transcribe results:", json.dumps(m_trans, indent=2))

    # -------------------------------------------------------------
    # Experiment 3: Word boosting OFF vs ON (bias_score 0.0 vs 1.0)
    # -------------------------------------------------------------
    bias_keywords = [
        "OTP", "KYC", "CBI", "UPI", "AnyDesk", "TeamViewer", "arrest",
        "ओटीपी", "केवाईसी", "सीबीआई", "यूपीआई", "एनीडेस्क", "पार्सल",
    ]
    print(f"\n==========================================")
    print(f"Experiment 3: Word boosting OFF vs ON ({len(exp2_scripts)} dev clips)")
    print(f"==========================================")

    res_bias_off = await run_clips(exp2_scripts, bias_score=0.0)
    m_bias_off = compute_metrics(res_bias_off)
    print("bias OFF results:", json.dumps(m_bias_off, indent=2))

    res_bias_on = await run_clips(exp2_scripts, bias_list=bias_keywords, bias_score=1.0)
    m_bias_on = compute_metrics(res_bias_on)
    print("bias ON results:", json.dumps(m_bias_on, indent=2))

    # -------------------------------------------------------------
    # Save results to a json file
    # -------------------------------------------------------------
    exp_summary = {
        "exp1_hinglish": {
            "hi_IN": m_hien_hi,
            "en_IN": m_hien_en,
        },
        "exp2_format": {
            "verbatim": m_verb,
            "transcribe": m_trans,
        },
        "exp3_word_boosting": {
            "off": m_bias_off,
            "on": m_bias_on,
            "fpr_change": round(m_bias_on.get("false_positive_rate", 0) - m_bias_off.get("false_positive_rate", 0), 4),
        },
    }

    out_path = REPO_ROOT / "eval" / "results" / "experiments_8_5.json"
    out_path.write_text(json.dumps(exp_summary, indent=2), encoding="utf-8")
    print(f"\nSaved experiment results to {out_path}")


if __name__ == "__main__":
    asyncio.run(main())
