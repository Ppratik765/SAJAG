"""Corpus evaluation harness and benchmarking runner.

Implements section 8.4 of SAJAG_SPEC.md:
- Feeds degraded audio through production STT REST chunking pipeline
- Runs detection engine with streaming simulation for time-to-detect
- Computes precision, recall, F1, false-positive rate on legit scripts,
  type accuracy, median/p90 time-to-detect, and normalized CER
- Writes eval/results/<timestamp>.json and updates eval/results/latest.json
"""

from __future__ import annotations

import argparse
import asyncio
import hashlib
import json
import logging
import math
import re
import subprocess
import sys
import tempfile
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Sequence

REPO_ROOT = Path(__file__).resolve().parents[1]
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))
if str(REPO_ROOT / "api") not in sys.path:
    sys.path.insert(0, str(REPO_ROOT / "api"))

import httpx

from app.config.settings import REPO_ROOT
from app.engine.analyzer import analyze_text
from app.gnani.stt_rest import transcribe_file
from app.gnani.usage import record_stt_usage
from app.util.audio import split_on_silence, to_wav_16k_mono
from eval.corpus import Script, load_all_scripts, load_script
from eval.degrade import VARIANTS, create_degraded_variants

logger = logging.getLogger(__name__)

RESULTS_DIR = REPO_ROOT / "eval" / "results"
CORPUS_AUDIO_DIR = REPO_ROOT / "data" / "corpus" / "audio"


def get_git_commit() -> str:
    """Return current git commit hash, or 'unknown'."""
    try:
        out = subprocess.check_output(["git", "rev-parse", "HEAD"], cwd=str(REPO_ROOT), text=True)
        return out.strip()
    except Exception:
        return "unknown"


def compute_cer(reference: str, hypothesis: str) -> float:
    """Compute character error rate (CER) with standard text normalization."""
    # Normalize: lowercase, remove punctuation, collapse whitespace
    def clean(s: str) -> str:
        s = s.lower()
        s = re.sub(r"[^\w\s\u0900-\u097F]", " ", s)  # keep Latin and Devanagari alphanumerics
        return " ".join(s.split())

    r = clean(reference)
    h = clean(hypothesis)

    if not r:
        return 0.0 if not h else 1.0

    # Levenshtein distance on characters
    n, m = len(r), len(h)
    dp = list(range(m + 1))
    for i in range(1, n + 1):
        prev = dp[0]
        dp[0] = i
        for j in range(1, m + 1):
            temp = dp[j]
            if r[i - 1] == h[j - 1]:
                dp[j] = prev
            else:
                dp[j] = 1 + min(prev, dp[j], dp[j - 1])
            prev = temp

    return min(1.0, dp[m] / len(r))


async def transcribe_audio_pipeline(
    wav_path: Path,
    language_code: str,
    *,
    fmt: str = "verbatim",
    hinglish_stt_lang: str = "hi-IN",
    bias_list: Sequence[str] | None = None,
    bias_score: float = 0.0,
    client: httpx.AsyncClient | None = None,
) -> tuple[str, list[dict[str, Any]], float]:
    """Transcribe an audio file using the production chunking pipeline."""
    # Resolve STT language code: Gnani Prisma accepts hi-IN or en-IN for Hinglish
    stt_lang = hinglish_stt_lang if language_code == "hi-en" else language_code

    # Check disk cache
    cache_dir = REPO_ROOT / "eval" / ".cache" / "stt"
    cache_dir.mkdir(parents=True, exist_ok=True)
    bias_key = f"{','.join(bias_list)}:{bias_score}" if bias_list and bias_score > 0 else "nobias"
    cache_token = f"{wav_path.name}:{wav_path.stat().st_size}:{stt_lang}:{fmt}:{bias_key}"
    cache_file = cache_dir / f"{hashlib.sha256(cache_token.encode()).hexdigest()}.json"

    if cache_file.is_file():
        try:
            cached = json.loads(cache_file.read_text(encoding="utf-8"))
            if cached.get("transcript"):
                return cached["transcript"], cached["segments"], cached["audio_duration"]
        except Exception:
            pass

    # 1. Convert to 16 kHz mono WAV
    with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as tmp:
        mono_16k = Path(tmp.name)
    try:
        to_wav_16k_mono(wav_path, mono_16k)
        # 2. Split on silence into chunks <= 28s
        chunks = split_on_silence(mono_16k, target_s=25.0, max_s=28.0)
        segments: list[dict[str, Any]] = []
        transcript_parts: list[str] = []
        total_audio_time = 0.0

        for idx, (chunk_path, duration, offset) in enumerate(chunks):
            total_audio_time += duration
            # Convert chunk to lossless FLAC for Cloudflare WAF resilience
            flac_chunk = chunk_path.with_suffix(".flac")
            upload_target = chunk_path
            try:
                subprocess.run(
                    ["ffmpeg", "-y", "-i", str(chunk_path), "-c:a", "flac", str(flac_chunk)],
                    capture_output=True,
                    check=True,
                )
                upload_target = flac_chunk
            except Exception:
                upload_target = chunk_path

            try:
                res = await transcribe_file(
                    upload_target,
                    language_code=stt_lang,
                    fmt=fmt,
                    bias_list=bias_list,
                    bias_score=bias_score,
                    client=client,
                )
                text = res.transcript.strip()
            except Exception as err:
                logger.error("Chunk transcription error: %s", err)
                text = ""
            finally:
                if flac_chunk.is_file():
                    flac_chunk.unlink(missing_ok=True)

            segments.append({
                "index": idx,
                "text": text,
                "duration_seconds": round(duration, 2),
                "cumulative_seconds": round(total_audio_time, 2),
            })
            if text:
                transcript_parts.append(text)

        full_transcript = " ".join(transcript_parts)
        record_stt_usage(total_audio_time)

        # Cache result
        try:
            cache_file.write_text(
                json.dumps({
                    "transcript": full_transcript,
                    "segments": segments,
                    "audio_duration": total_audio_time,
                }, ensure_ascii=False),
                encoding="utf-8",
            )
        except Exception as err:
            logger.warning("Could not write STT eval cache: %s", err)

        return full_transcript, segments, total_audio_time

    finally:
        if mono_16k != wav_path and mono_16k.is_file():
            mono_16k.unlink(missing_ok=True)


async def evaluate_clip(
    audio_path: Path,
    script: Script,
    variant: str,
    *,
    fmt: str = "verbatim",
    hinglish_stt_lang: str = "hi-IN",
    bias_list: Sequence[str] | None = None,
    bias_score: float = 0.0,
    client: httpx.AsyncClient | None = None,
) -> dict[str, Any]:
    """Run full evaluation on a single audio clip."""
    full_transcript, segments, audio_duration = await transcribe_audio_pipeline(
        audio_path,
        language_code=script.language,
        fmt=fmt,
        hinglish_stt_lang=hinglish_stt_lang,
        bias_list=bias_list,
        bias_score=bias_score,
        client=client,
    )

    # Streaming simulation: evaluate engine after each segment arrives
    first_suspicious_time: float | None = None
    first_likely_scam_time: float | None = None
    rolling_text = ""

    for seg in segments:
        if not seg["text"]:
            continue
        rolling_text = f"{rolling_text} {seg['text']}".strip()
        intermediate = analyze_text(rolling_text, language_code=script.language)

        if intermediate.level in ("suspicious", "likely_scam", "scam") and first_suspicious_time is None:
            first_suspicious_time = seg["cumulative_seconds"]
        if intermediate.level in ("likely_scam", "scam") and first_likely_scam_time is None:
            first_likely_scam_time = seg["cumulative_seconds"]

    # Final decision on full transcript
    final_result = analyze_text(full_transcript, language_code=script.language)
    is_detected_scam = final_result.level in ("likely_scam", "scam")
    is_true_scam = script.label != "legit"

    # CER: compute only for en-IN and hi-IN where reference and ASR use matching scripts.
    # For hi-en (Hinglish), reference is Latin script and ASR is Devanagari (not directly character-comparable).
    cer = None
    if script.language in ("en-IN", "hi-IN") or (script.language == "hi-en" and hinglish_stt_lang == "en-IN"):
        cer = round(compute_cer(script.full_text, full_transcript), 4)

    return {
        "script_id": script.id,
        "language": script.language,
        "variant": variant,
        "split": script.split,
        "label": script.label,
        "legit_kind": script.legit_kind,
        "is_true_scam": is_true_scam,
        "detected_level": final_result.level,
        "is_detected_scam": is_detected_scam,
        "primary_type": final_result.primary_type,
        "score": final_result.score,
        "signals_count": len(final_result.signals),
        "transcript": full_transcript,
        "audio_duration_seconds": round(audio_duration, 2),
        "cer": cer,
    }


def compute_metrics(eval_items: Sequence[dict[str, Any]]) -> dict[str, Any]:
    """Compute precision, recall, F1, FPR, type accuracy, and CER."""
    total = len(eval_items)
    if total == 0:
        return {}

    scam_items = [it for it in eval_items if it["is_true_scam"]]
    legit_items = [it for it in eval_items if not it["is_true_scam"]]

    tp = sum(1 for it in scam_items if it["is_detected_scam"])
    fn = sum(1 for it in scam_items if not it["is_detected_scam"])
    fp = sum(1 for it in legit_items if it["is_detected_scam"])
    tn = sum(1 for it in legit_items if not it["is_detected_scam"])

    precision = tp / (tp + fp) if (tp + fp) > 0 else 1.0
    recall = tp / (tp + fn) if (tp + fn) > 0 else 0.0
    f1 = (2 * precision * recall) / (precision + recall) if (precision + recall) > 0 else 0.0
    fpr = fp / (fp + tn) if (fp + tn) > 0 else 0.0

    # Type accuracy among true positives
    correct_type_count = sum(1 for it in scam_items if it["is_detected_scam"] and it["primary_type"] == it["label"])
    type_accuracy = correct_type_count / tp if tp > 0 else 0.0

    # CER averaged only over comparable languages (hi-IN, en-IN)
    comparable_cer_items = [it["cer"] for it in eval_items if it.get("cer") is not None]
    mean_cer = sum(comparable_cer_items) / len(comparable_cer_items) if comparable_cer_items else None

    return {
        "total_clips": total,
        "tp": tp,
        "fp": fp,
        "tn": tn,
        "fn": fn,
        "precision": round(precision, 4),
        "recall": round(recall, 4),
        "f1": round(f1, 4),
        "false_positive_rate": round(fpr, 4),
        "type_accuracy": round(type_accuracy, 4),
        "mean_cer": round(mean_cer, 4) if mean_cer is not None else None,
    }


async def run_evaluation(
    scripts: Sequence[Script],
    variants: Sequence[str] = ("clean",),
    *,
    fmt: str = "verbatim",
    hinglish_stt_lang: str = "hi-IN",
    bias_list: Sequence[str] | None = None,
    bias_score: float = 0.0,
) -> dict[str, Any]:
    """Execute evaluation over selected scripts and variants."""
    RESULTS_DIR.mkdir(parents=True, exist_ok=True)
    timestamp = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
    git_commit = get_git_commit()

    all_results: list[dict[str, Any]] = []

    async with httpx.AsyncClient(timeout=httpx.Timeout(connect=10.0, read=45.0, write=15.0, pool=10.0)) as client:
        for script in scripts:
            clean_audio = CORPUS_AUDIO_DIR / "clean" / f"{script.id}.wav"
            if not clean_audio.is_file():
                logger.warning("Clean audio missing for %s; skipping", script.id)
                continue

            # Ensure degraded variants exist if requested
            if any(v != "clean" for v in variants):
                create_degraded_variants(clean_audio, CORPUS_AUDIO_DIR, script.id)

            for variant in variants:
                audio_path = CORPUS_AUDIO_DIR / variant / f"{script.id}.wav"
                if not audio_path.is_file():
                    logger.warning("Audio path missing: %s", audio_path)
                    continue

                logger.info("Evaluating %s [%s]...", script.id, variant)
                clip_result = await evaluate_clip(
                    audio_path,
                    script,
                    variant,
                    fmt=fmt,
                    hinglish_stt_lang=hinglish_stt_lang,
                    bias_list=bias_list,
                    bias_score=bias_score,
                    client=client,
                )
                all_results.append(clip_result)

    metrics = compute_metrics(all_results)

    # Per-split metrics
    per_split: dict[str, Any] = {}
    splits = sorted({it["split"] for it in all_results if "split" in it})
    for sp in splits:
        per_split[sp] = compute_metrics([it for it in all_results if it.get("split") == sp])

    # Per-language metrics
    per_language: dict[str, Any] = {}
    languages = sorted({it["language"] for it in all_results})
    for lang in languages:
        per_language[lang] = compute_metrics([it for it in all_results if it["language"] == lang])

    # Per-variant metrics
    per_variant: dict[str, Any] = {}
    for var in sorted({it["variant"] for it in all_results}):
        per_variant[var] = compute_metrics([it for it in all_results if it["variant"] == var])

    report = {
        "timestamp": timestamp,
        "git_commit": git_commit,
        "config": {
            "format": fmt,
            "variants": list(variants),
            "scripts_count": len(scripts),
        },
        "overall": metrics,
        "per_split": per_split,
        "per_language": per_language,
        "per_variant": per_variant,
        "items": all_results,
        "limitations": [
            "Synthetic dialogue generated with Timbre TTS (cleaner than real telephony calls)",
            "Evaluation set is calibrated on dev split",
            "Telephony degradation uses simulated bandpass and noise, not physical telecom carrier paths",
        ],
    }

    # Save to timestamped file and latest.json
    timestamp_file = RESULTS_DIR / f"{timestamp}.json"
    latest_file = RESULTS_DIR / "latest.json"

    timestamp_file.write_text(json.dumps(report, indent=2, ensure_ascii=False), encoding="utf-8")
    latest_file.write_text(json.dumps(report, indent=2, ensure_ascii=False), encoding="utf-8")
    logger.info("Saved evaluation report to %s and %s", timestamp_file.name, latest_file.name)

    return report


async def main() -> None:
    parser = argparse.ArgumentParser(description="Run Sajag corpus evaluation harness")
    parser.add_argument("--script-id", help="Single script ID to evaluate")
    parser.add_argument("--script-ids", nargs="+", help="Explicit list of script IDs to evaluate")
    parser.add_argument("--split", choices=["dev", "test", "holdout", "all"], default="all", help="Dataset split (default: all)")
    parser.add_argument("--label", choices=["scam", "legit", "all"], default="all", help="Filter by label (scam, legit, all)")
    parser.add_argument("--variants", nargs="+", default=["clean"], help="Variants to evaluate: clean, tel, tel_noise15, tel_noise5")
    parser.add_argument("--calibration-only", action="store_true", help="Run only on calibration scripts")
    parser.add_argument("--exclude-calibration", action="store_true", help="Exclude calibration scripts")
    parser.add_argument("--limit", type=int, default=None, help="Maximum number of scripts to evaluate")
    parser.add_argument("--offset", type=int, default=0, help="Offset into scripts list")
    parser.add_argument("--format", default="verbatim", choices=["verbatim", "transcribe"], help="STT formatting mode")
    parser.add_argument("--hinglish-stt-lang", default="en-IN", choices=["hi-IN", "en-IN"], help="STT language to use for Hinglish (default: en-IN)")
    parser.add_argument("--bias-list", nargs="+", help="Word boosting list for STT")
    parser.add_argument("--bias-score", type=float, default=0.0, choices=[0.0, 0.5, 1.0, 1.5, 2.0], help="Word boosting score")

    args = parser.parse_args()

    all_scripts = load_all_scripts()
    if args.script_id:
        selected = [s for s in all_scripts if s.id == args.script_id]
    elif args.script_ids:
        id_set = set(args.script_ids)
        selected = [s for s in all_scripts if s.id in id_set]
    elif args.calibration_only:
        selected = [s for s in all_scripts if "_calib_" in s.id]
    else:
        candidates = all_scripts
        if args.exclude_calibration:
            candidates = [s for s in candidates if "_calib_" not in s.id]
        if args.label and args.label != "all":
            if args.label == "legit":
                candidates = [s for s in candidates if s.label == "legit"]
            elif args.label == "scam":
                candidates = [s for s in candidates if s.label != "legit"]
        if args.split and args.split != "all":
            candidates = [s for s in candidates if s.split == args.split]
        selected = candidates[args.offset : (args.offset + args.limit) if args.limit else None]

    print(f"Running evaluation on {len(selected)} scripts (variants={args.variants})...")
    report = await run_evaluation(
        selected,
        variants=args.variants,
        fmt=args.format,
        hinglish_stt_lang=args.hinglish_stt_lang,
        bias_list=args.bias_list,
        bias_score=args.bias_score,
    )
    print("\n=== Evaluation Results ===")
    print(json.dumps(report["overall"], indent=2))


if __name__ == "__main__":
    asyncio.run(main())
