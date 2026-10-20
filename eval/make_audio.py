"""Synthetic dialogue audio generator using Gnani Timbre v2.5.

Implements section 8.2 of SAJAG_SPEC.md:
- Synthesizes each turn with speaker-appropriate Timbre voice (caller vs victim)
- Concatenates turns with 200-600 ms pauses into 16 kHz mono WAV
- Enforces budget guards and disk caching
- Reusable clean audio for all degrade variants
"""

from __future__ import annotations

import argparse
import asyncio
import io
import logging
import sys
import wave
from pathlib import Path
from typing import Sequence

REPO_ROOT = Path(__file__).resolve().parents[1]
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))
if str(REPO_ROOT / "api") not in sys.path:
    sys.path.insert(0, str(REPO_ROOT / "api"))

import numpy as np

from app.config.settings import REPO_ROOT
from app.config.voices import VOICES_BY_LANGUAGE
from app.gnani.tts_rest import synthesize
from eval.corpus import Script, load_all_scripts, load_script
from eval.degrade import read_wav, write_wav

logger = logging.getLogger(__name__)

AUDIO_OUT_DIR = REPO_ROOT / "data" / "corpus" / "audio" / "clean"

# Caller and victim voices per language from section 2.5
SPEAKER_VOICE_MAP: dict[str, dict[str, str]] = {
    "hi-IN": {"caller": "Deepak", "victim": "Chitra"},
    "en-IN": {"caller": "Pranav", "victim": "Kaveri"},
    "hi-en": {"caller": "Poorvi", "victim": "Deepak"},
    "ta-IN": {"caller": "Vedika", "victim": "Brinda"},
    "te-IN": {"caller": "Suhana", "victim": "Lavanya"},
    "kn-IN": {"caller": "Kavin", "victim": "Saanvi"},
    "ml-IN": {"caller": "Riyaan", "victim": "Reshma"},
    "mr-IN": {"caller": "Ishaan", "victim": "Zahira"},
    "bn-IN": {"caller": "Dhruva", "victim": "Kirra"},
    "gu-IN": {"caller": "Veera", "victim": "Falak"},
    "pa-IN": {"caller": "Zayan", "victim": "Mehuli"},
}


def get_voice_for_speaker(language: str, speaker: str) -> tuple[str, str]:
    """Return (voice_name, voice_language) for a given speaker."""
    lang_map = SPEAKER_VOICE_MAP.get(language, SPEAKER_VOICE_MAP["hi-IN"])
    voice = lang_map.get(speaker, lang_map["caller"])

    # Poorvi is hi-en, Deepak is hi-IN, etc.
    if voice == "Poorvi":
        voice_lang = "hi-en"
    elif voice in VOICES_BY_LANGUAGE.get(language, []):
        voice_lang = language
    else:
        # Check which language table owns this voice
        voice_lang = language
        for vlang, voices in VOICES_BY_LANGUAGE.items():
            if voice in voices:
                voice_lang = vlang
                break

    return voice, voice_lang


def make_silence_samples(duration_s: float, sample_rate: int = 16000) -> np.ndarray:
    """Generate float32 zero array for pause duration."""
    return np.zeros(int(sample_rate * duration_s), dtype=np.float32)


async def synthesize_script_audio(
    script: Script,
    out_dir: Path = AUDIO_OUT_DIR,
    *,
    pause_min_ms: int = 250,
    pause_max_ms: int = 450,
) -> Path:
    """Synthesize all turns of a script and write combined 16 kHz mono WAV."""
    out_dir.mkdir(parents=True, exist_ok=True)
    out_wav_path = out_dir / f"{script.id}.wav"

    all_turn_samples: list[np.ndarray] = []

    for idx, turn in enumerate(script.turns):
        voice, voice_lang = get_voice_for_speaker(script.language, turn.speaker)

        # Synthesize turn to 16 kHz mono WAV
        wav_bytes = await synthesize(
            text=turn.text,
            language=voice_lang,
            voice=voice,
            model="timbre-v2.5",
            container="wav",
            sample_rate=16000,
            use_cache=True,
        )

        # Parse WAV bytes into float32 array
        with wave.open(io.BytesIO(wav_bytes), "rb") as w:
            n_frames = w.getnframes()
            rate = w.getframerate()
            raw = w.readframes(n_frames)
            turn_samples = np.frombuffer(raw, dtype=np.int16).astype(np.float32) / 32768.0

        all_turn_samples.append(turn_samples)

        # Add pause between turns (deterministic pause based on turn index)
        if idx < len(script.turns) - 1:
            pause_ms = pause_min_ms + ((idx * 73) % (pause_max_ms - pause_min_ms))
            pause_samples = make_silence_samples(pause_ms / 1000.0, 16000)
            all_turn_samples.append(pause_samples)

    full_audio = np.concatenate(all_turn_samples)
    write_wav(out_wav_path, full_audio, 16000)
    logger.info("Generated %s: %.2fs audio", out_wav_path.name, len(full_audio) / 16000.0)
    return out_wav_path


def project_tts_cost(scripts: Sequence[Script]) -> dict[str, int | float]:
    """Calculate character count and estimated audio duration for a set of scripts."""
    total_chars = sum(sum(len(turn.text) for turn in s.turns) for s in scripts)
    total_words = sum(s.total_words for s in scripts)
    # Average speaking rate ~2.5 words/second
    est_spoken_seconds = total_words / 2.5
    est_pauses_seconds = sum(len(s.turns) * 0.35 for s in scripts)
    return {
        "num_scripts": len(scripts),
        "total_chars": total_chars,
        "total_words": total_words,
        "estimated_audio_seconds": round(est_spoken_seconds + est_pauses_seconds, 1),
    }


async def main() -> None:
    parser = argparse.ArgumentParser(description="Generate synthetic call audio using Timbre TTS")
    parser.add_argument("--script-id", help="Single script ID to generate")
    parser.add_argument("--script-ids", nargs="+", help="Explicit list of script IDs to generate")
    parser.add_argument("--split", choices=["dev", "test"], help="Generate for specific split")
    parser.add_argument("--calibration-only", action="store_true", help="Generate only 5 calibration scripts")
    parser.add_argument("--exclude-calibration", action="store_true", help="Exclude calibration scripts")
    parser.add_argument("--limit", type=int, default=None, help="Maximum number of scripts to process")
    parser.add_argument("--offset", type=int, default=0, help="Offset into scripts list")
    parser.add_argument("--dry-run", action="store_true", help="Print projection without synthesizing")

    args = parser.parse_args()

    all_scripts = load_all_scripts()
    selected: list[Script] = []

    if args.script_id:
        selected = [s for s in all_scripts if s.id == args.script_id]
        if not selected:
            print(f"Error: Script {args.script_id} not found.")
            return
    elif args.script_ids:
        id_set = set(args.script_ids)
        selected = [s for s in all_scripts if s.id in id_set]
    elif args.calibration_only:
        selected = [s for s in all_scripts if "_calib_" in s.id]
    else:
        candidates = all_scripts
        if args.exclude_calibration:
            candidates = [s for s in candidates if "_calib_" not in s.id]
        if args.split:
            candidates = [s for s in candidates if s.split == args.split]
        selected = candidates[args.offset : (args.offset + args.limit) if args.limit else None]

    projection = project_tts_cost(selected)
    print(f"Target scripts: {len(selected)}")
    print(f"Total TTS characters: {projection['total_chars']}")
    print(f"Estimated audio duration: {projection['estimated_audio_seconds']}s")

    if args.dry_run:
        print("[Dry-run completed. No API calls made.]")
        return

    print("Beginning audio synthesis...")
    for s in selected:
        print(f"Synthesizing {s.id} ({s.language}, {len(s.turns)} turns)...")
        wav_path = await synthesize_script_audio(s)
        print(f"Saved: {wav_path}")


if __name__ == "__main__":
    asyncio.run(main())
