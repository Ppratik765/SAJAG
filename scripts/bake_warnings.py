"""Bake pre-rendered warning and explanation audio clips (M5 Part 1).

Generates static MP3s under web/public/audio/warnings/{lang}/ for hi-IN and en-IN.
Uses content-addressed caching in api/app/gnani/tts_rest.py to avoid burning credits.
Enforces the 8,000 TTS characters hard cap.
Generates docs/WARNING_REVIEW.md for human review.
"""

from __future__ import annotations

import asyncio
import os
import sys
from pathlib import Path
from typing import Any

import yaml

# Ensure api directory is on sys.path
REPO_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(REPO_ROOT / "api"))

from app.config.voices import get_default_warning_voice
from app.gnani.tts_rest import synthesize
from app.gnani.usage import get_current_day_usage

WARNINGS_YAML = REPO_ROOT / "api" / "app" / "config" / "warnings.yaml"
OUTPUT_BASE = REPO_ROOT / "web" / "public" / "audio" / "warnings"
DOCS_DIR = REPO_ROOT / "docs"
REVIEW_MD = DOCS_DIR / "WARNING_REVIEW.md"
TTS_HARD_CAP_CHARS = 8000


def get_mp3_duration(path: Path) -> float:
    """Accurately estimate MP3 audio duration by parsing frame headers."""
    bitrates_v2 = [0, 8, 16, 24, 32, 40, 48, 56, 64, 80, 96, 112, 128, 144, 160]
    sample_rates_v2 = [22050, 24000, 16000]
    data = path.read_bytes()
    pos = 0
    total_samples = 0
    sample_rate = 24000
    while pos < len(data) - 4:
        if data[pos] == 0xFF and (data[pos + 1] & 0xE0) == 0xE0:
            header = int.from_bytes(data[pos : pos + 4], "big")
            version = (header >> 19) & 3
            layer = (header >> 17) & 3
            br_idx = (header >> 12) & 15
            sr_idx = (header >> 10) & 3
            padding = (header >> 9) & 1
            if version == 2 and layer == 1 and 1 <= br_idx < 15 and 0 <= sr_idx < 3:
                sample_rate = sample_rates_v2[sr_idx]
                bitrate = bitrates_v2[br_idx] * 1000
                frame_len = int(72 * bitrate / sample_rate) + padding
                total_samples += 576
                pos += frame_len
                continue
            elif version == 3 and layer == 1 and 1 <= br_idx < 15:
                frame_len = int(144 * (br_idx * 1000) / 44100) + padding
                total_samples += 1152
                pos += frame_len
                continue
        pos += 1
    return round(total_samples / sample_rate, 2) if sample_rate else 0.0


async def main() -> None:
    if not WARNINGS_YAML.is_file():
        print(f"Error: {WARNINGS_YAML} not found")
        sys.exit(1)

    with open(WARNINGS_YAML, "r", encoding="utf-8") as f:
        cfg = yaml.safe_load(f)

    languages_to_bake = ["hi-IN", "en-IN"]
    
    # 1. Project character counts
    items_to_bake: list[dict[str, Any]] = []
    total_projected_chars = 0

    for lang in languages_to_bake:
        lang_data = cfg.get("languages", {}).get(lang, {})
        voice = get_default_warning_voice(lang)

        # alert_scam
        text_scam = lang_data.get("alert_scam", "")
        items_to_bake.append({
            "lang": lang,
            "voice": voice,
            "filename": "alert_scam.mp3",
            "kind": "alert_scam",
            "type": None,
            "text": text_scam,
            "chars": len(text_scam),
        })
        total_projected_chars += len(text_scam)

        # alert_suspicious
        text_susp = lang_data.get("alert_suspicious", "")
        items_to_bake.append({
            "lang": lang,
            "voice": voice,
            "filename": "alert_suspicious.mp3",
            "kind": "alert_suspicious",
            "type": None,
            "text": text_susp,
            "chars": len(text_susp),
        })
        total_projected_chars += len(text_susp)

        # explanations
        for scam_type, exp_text in lang_data.get("explain", {}).items():
            items_to_bake.append({
                "lang": lang,
                "voice": voice,
                "filename": f"explain_{scam_type}.mp3",
                "kind": "explain",
                "type": scam_type,
                "text": exp_text,
                "chars": len(exp_text),
            })
            total_projected_chars += len(exp_text)

    print(f"============================================================")
    print(f"M5 TTS Audio Baker — Pre-Bake Projection")
    print(f"Total files to bake: {len(items_to_bake)}")
    print(f"Total projected characters: {total_projected_chars}")
    print(f"M5 Hard Cap: {TTS_HARD_CAP_CHARS} characters")
    print(f"============================================================")

    if total_projected_chars > TTS_HARD_CAP_CHARS:
        print(f"FATAL: Projected characters ({total_projected_chars}) exceed hard cap ({TTS_HARD_CAP_CHARS})!")
        sys.exit(1)

    usage_before = get_current_day_usage()
    print(f"TTS Usage Before Bake: {usage_before['tts_chars']} characters today\n")

    # 2. Synthesize and save audio files
    results: list[dict[str, Any]] = []
    total_bytes = 0

    for item in items_to_bake:
        lang = item["lang"]
        voice = item["voice"]
        filename = item["filename"]
        text = item["text"]
        out_dir = OUTPUT_BASE / lang
        out_dir.mkdir(parents=True, exist_ok=True)
        out_file = out_dir / filename

        print(f"Synthesizing [{lang}/{voice}] {filename} ({len(text)} chars)...", end="", flush=True)

        audio_bytes = await synthesize(
            text=text,
            language=lang,
            voice=voice,
            model="timbre-v2.5",
            speed=1.0,
            container="mp3",
            sample_rate=24000,
            bitrate="64k",
            use_cache=True,
        )

        out_file.write_bytes(audio_bytes)
        file_size = len(audio_bytes)
        total_bytes += file_size
        duration_s = get_mp3_duration(out_file)

        print(f" Done ({file_size} bytes, {duration_s}s)")

        results.append({
            "path": f"web/public/audio/warnings/{lang}/{filename}",
            "lang": lang,
            "voice": voice,
            "filename": filename,
            "kind": item["kind"],
            "type": item["type"] or "-",
            "text": text,
            "chars": len(text),
            "size_bytes": file_size,
            "duration_s": duration_s,
        })

    usage_after = get_current_day_usage()
    chars_consumed_by_run = usage_after["tts_chars"] - usage_before["tts_chars"]

    print("\n============================================================")
    print(f"Bake Complete!")
    print(f"Files written: {len(results)}")
    print(f"Total audio payload size: {total_bytes / 1024:.1f} KB ({total_bytes} bytes)")
    print(f"TTS Usage Before: {usage_before['tts_chars']} chars")
    print(f"TTS Usage After:  {usage_after['tts_chars']} chars")
    print(f"New Characters Consumed in This Run: {chars_consumed_by_run}")
    print(f"============================================================\n")

    # 3. Generate docs/WARNING_REVIEW.md
    DOCS_DIR.mkdir(parents=True, exist_ok=True)
    review_lines = [
        "# Warning Audio Review Table (M5 Part 1)",
        "",
        "> [!NOTE]",
        "> Audio clips were generated with Gnani Timbre TTS v2.5 (`hi-IN`: Chitra, `en-IN`: Kaveri) and are awaiting human pronunciation and clarity review.",
        "> As an AI agent cannot judge authentic pronunciation, clips are cataloged below as generated and awaiting human review.",
        "",
        f"- **Total Clips:** {len(results)}",
        f"- **Total Audio Size:** {total_bytes / 1024:.1f} KB",
        f"- **Characters Consumed:** {chars_consumed_by_run} (Projected: {total_projected_chars})",
        "",
        "| File Path | Lang | Voice | Kind / Type | Spoken Text | Duration | Size | Human Verdict (ok / mispronounced / fix text) |",
        "| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |",
    ]

    for r in results:
        kind_label = r["kind"] if r["type"] == "-" else f"explain ({r['type']})"
        review_lines.append(
            f"| `{r['path']}` | {r['lang']} | {r['voice']} | {kind_label} | \"{r['text']}\" | {r['duration_s']}s | {r['size_bytes']} B | |"
        )

    review_lines.append("")
    review_lines.append("## Claims for the human to verify")
    review_lines.append("The following institutional statements are spoken in the warning explanations:")
    review_lines.append("1. **Digital Arrest (`digital_arrest`):** Real police, CBI, or court officials never conduct arrests, trials, or demand money/verification fees over video calls.")
    review_lines.append("2. **Helpline Number:** The national cyber-crime helpline is one nine three zero (`1930` / एक नौ तीन शून्य).")
    review_lines.append("3. **Banking & KYC (`bank_kyc`):** Genuine bank officials never call to ask for OTPs, ATM PINs, UPI PINs, or passwords to update KYC records or prevent account closure.")
    review_lines.append("4. **UPI Refunds (`upi_refund`):** Users never need to enter a UPI PIN or scan a QR code to receive money or refunds; PIN is solely required for outgoing payments.")
    review_lines.append("5. **Remote Access Apps (`tech_support_remote`):** Legitimate customer support teams never ask users to install third-party remote screen-sharing tools like AnyDesk to resolve billing or delivery issues.")
    review_lines.append("6. **Utility Bills (`utility_disconnect`):** Electricity or water supply departments never threaten immediate same-day line disconnection demanding immediate app downloads or direct transfers to personal numbers.")
    review_lines.append("7. **Lottery & Prizes (`lottery_prize`):** Legitimate lotteries or gift schemes do not require advance tax or processing fees to release winnings.")
    review_lines.append("")

    REVIEW_MD.write_text("\n".join(review_lines), encoding="utf-8")
    print(f"Generated {REVIEW_MD} with {len(results)} rows.")


if __name__ == "__main__":
    asyncio.run(main())
