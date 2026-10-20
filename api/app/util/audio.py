"""Audio utilities for decoding, duration probing, converting, and chunking.

Requires system ffmpeg and ffprobe. Uses standard library wave module when applicable.
"""

from __future__ import annotations

import json
import logging
import subprocess
import wave
from pathlib import Path

from app.config.settings import get_max_upload_seconds

logger = logging.getLogger(__name__)

MAX_FILE_BYTES = 25 * 1024 * 1024  # 25 MB


class AudioError(Exception):
    """Raised when audio conversion, probing, or chunking fails."""


class AudioTooLong(AudioError):
    """Raised when audio exceeds MAX_UPLOAD_SECONDS."""


class AudioTooLarge(AudioError):
    """Raised when file exceeds 25 MB."""


def repair_wav_header(data: bytes) -> bytes:
    """Repair 0xFFFFFFFF placeholder sizes in RIFF and data headers."""
    if len(data) < 44 or data[:4] != b"RIFF" or data[8:12] != b"WAVE":
        return data

    mutable = bytearray(data)
    # File size - 8 in bytes 4..8
    file_size_minus_8 = len(mutable) - 8
    mutable[4:8] = file_size_minus_8.to_bytes(4, "little")

    # Locate 'data' chunk
    idx = 12
    while idx + 8 <= len(mutable):
        chunk_id = bytes(mutable[idx : idx + 4])
        chunk_sz = int.from_bytes(mutable[idx + 4 : idx + 8], "little")
        if chunk_id == b"data":
            actual_data_len = len(mutable) - (idx + 8)
            mutable[idx + 4 : idx + 8] = actual_data_len.to_bytes(4, "little")
            break
        idx += 8 + chunk_sz

    return bytes(mutable)


def probe_duration(path: Path) -> float:
    """Probe audio duration in seconds using ffprobe, fallback to wave."""
    # First attempt: standard wave module if path ends with .wav
    if path.suffix.lower() == ".wav":
        try:
            with wave.open(str(path), "rb") as wf:
                frames = wf.getnframes()
                rate = wf.getframerate()
                if rate > 0 and frames > 0:
                    dur = frames / float(rate)
                    if 0 < dur < 100000:
                        return round(dur, 3)
        except Exception:
            pass

    # Use ffprobe
    cmd = [
        "ffprobe",
        "-v",
        "error",
        "-show_entries",
        "format=duration",
        "-of",
        "json",
        str(path),
    ]
    try:
        res = subprocess.run(cmd, capture_output=True, text=True, check=True)
        data = json.loads(res.stdout)
        dur_str = data.get("format", {}).get("duration")
        if dur_str:
            return round(float(dur_str), 3)
    except Exception as err:
        logger.warning("ffprobe failed on %s: %s", path, err)

    raise AudioError(f"Could not probe audio duration for {path}")


def to_wav_16k_mono(input_path: Path, output_path: Path) -> Path:
    """Convert input audio file to 16 kHz mono signed 16-bit PCM WAV."""
    output_path.parent.mkdir(parents=True, exist_ok=True)
    cmd = [
        "ffmpeg",
        "-y",
        "-i",
        str(input_path),
        "-ar",
        "16000",
        "-ac",
        "1",
        "-c:a",
        "pcm_s16le",
        str(output_path),
    ]
    try:
        subprocess.run(cmd, capture_output=True, check=True)
    except subprocess.CalledProcessError as err:
        stderr_msg = err.stderr.decode("utf-8", errors="replace") if err.stderr else str(err)
        raise AudioError(f"ffmpeg conversion failed: {stderr_msg}") from err

    # Ensure header is intact
    repaired = repair_wav_header(output_path.read_bytes())
    output_path.write_bytes(repaired)

    return output_path


def split_on_silence(
    wav_path: Path,
    target_s: float = 25.0,
    max_s: float = 28.0,
    out_dir: Path | None = None,
) -> list[tuple[Path, float, float]]:
    """Split audio into ordered chunks <= max_s.

    Returns list of tuples: (chunk_path, duration_s, offset_s).
    """
    total_dur = probe_duration(wav_path)
    if total_dur <= max_s:
        return [(wav_path, total_dur, 0.0)]

    dest_dir = out_dir or (wav_path.parent / f"{wav_path.stem}_chunks")
    dest_dir.mkdir(parents=True, exist_ok=True)

    chunks: list[tuple[Path, float, float]] = []
    current_offset = 0.0
    idx = 0

    while current_offset < total_dur:
        remaining = total_dur - current_offset
        if remaining <= max_s:
            chunk_dur = remaining
        else:
            chunk_dur = min(target_s, remaining)

        chunk_path = dest_dir / f"chunk_{idx:03d}.wav"
        cmd = [
            "ffmpeg",
            "-y",
            "-ss",
            f"{current_offset:.3f}",
            "-t",
            f"{chunk_dur:.3f}",
            "-i",
            str(wav_path),
            "-ar",
            "16000",
            "-ac",
            "1",
            "-c:a",
            "pcm_s16le",
            str(chunk_path),
        ]
        try:
            subprocess.run(cmd, capture_output=True, check=True)
            repaired = repair_wav_header(chunk_path.read_bytes())
            chunk_path.write_bytes(repaired)
        except subprocess.CalledProcessError as err:
            stderr_msg = err.stderr.decode("utf-8", errors="replace") if err.stderr else str(err)
            raise AudioError(f"ffmpeg chunking failed at {current_offset:.2fs}: {stderr_msg}") from err

        real_chunk_dur = probe_duration(chunk_path)
        chunks.append((chunk_path, real_chunk_dur, current_offset))

        current_offset += chunk_dur
        idx += 1

    return chunks


def validate_upload(file_size_bytes: int, file_path: Path) -> float:
    """Validate upload size and duration limits."""
    if file_size_bytes > MAX_FILE_BYTES:
        raise AudioTooLarge(f"File size {file_size_bytes / (1024*1024):.1f}MB exceeds 25MB limit")

    duration = probe_duration(file_path)
    max_sec = get_max_upload_seconds()
    if duration > max_sec:
        raise AudioTooLong(f"Audio duration {duration:.1f}s exceeds maximum limit of {max_sec:.0f}s (3 minutes)")

    return duration
