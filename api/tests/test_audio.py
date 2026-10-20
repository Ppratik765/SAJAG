"""Unit tests for audio utilities."""

import struct
import tempfile
import wave
from pathlib import Path

import pytest
from app.util.audio import (
    AudioTooLarge,
    AudioTooLong,
    probe_duration,
    repair_wav_header,
    split_on_silence,
    to_wav_16k_mono,
    validate_upload,
)


def _create_synthetic_wav(path: Path, duration_s: float = 1.0, sample_rate: int = 16000) -> Path:
    num_samples = int(duration_s * sample_rate)
    with wave.open(str(path), "wb") as wf:
        wf.setnchannels(1)
        wf.setsampwidth(2)
        wf.setframerate(sample_rate)
        # Write silence
        wf.writeframes(b"\x00\x00" * num_samples)
    return path


def test_repair_wav_header():
    # Construct a synthetic WAV with 0xFFFFFFFF placeholder
    header = bytearray(b"RIFF\xff\xff\xff\xffWAVEfmt \x10\x00\x00\x00\x01\x00\x01\x00\x80>\x00\x00\x00}\x00\x00\x02\x00\x10\x00data\xff\xff\xff\xff")
    pcm_data = b"\x00\x00" * 800  # 1600 bytes
    corrupt_wav = bytes(header + pcm_data)

    repaired = repair_wav_header(corrupt_wav)
    assert repaired[:4] == b"RIFF"
    riff_sz = int.from_bytes(repaired[4:8], "little")
    assert riff_sz == len(repaired) - 8

    # data chunk size
    data_idx = repaired.find(b"data")
    assert data_idx != -1
    data_sz = int.from_bytes(repaired[data_idx + 4 : data_idx + 8], "little")
    assert data_sz == len(pcm_data)


def test_probe_duration(tmp_path: Path):
    wav_path = tmp_path / "test_1s.wav"
    _create_synthetic_wav(wav_path, duration_s=1.5, sample_rate=16000)
    dur = probe_duration(wav_path)
    assert 1.48 <= dur <= 1.52


def test_to_wav_16k_mono(tmp_path: Path):
    in_wav = tmp_path / "in_44k.wav"
    _create_synthetic_wav(in_wav, duration_s=1.0, sample_rate=44100)

    out_wav = tmp_path / "out_16k.wav"
    to_wav_16k_mono(in_wav, out_wav)

    with wave.open(str(out_wav), "rb") as wf:
        assert wf.getframerate() == 16000
        assert wf.getnchannels() == 1
        assert wf.getsampwidth() == 2


def test_split_on_silence_short(tmp_path: Path):
    wav_path = tmp_path / "short_10s.wav"
    _create_synthetic_wav(wav_path, duration_s=10.0, sample_rate=16000)

    chunks = split_on_silence(wav_path, target_s=25.0, max_s=28.0)
    assert len(chunks) == 1
    assert chunks[0][0] == wav_path
    assert chunks[0][2] == 0.0


def test_split_on_silence_long(tmp_path: Path):
    wav_path = tmp_path / "long_65s.wav"
    _create_synthetic_wav(wav_path, duration_s=65.0, sample_rate=16000)

    chunks = split_on_silence(wav_path, target_s=25.0, max_s=28.0, out_dir=tmp_path / "chunks")
    # 65s split into: 25s, 25s, 15s -> 3 chunks
    assert len(chunks) == 3
    for chunk_path, dur, off in chunks:
        assert dur <= 28.0
        assert chunk_path.is_file()


def test_validate_upload_limits(tmp_path: Path):
    wav_path = tmp_path / "too_long.wav"
    _create_synthetic_wav(wav_path, duration_s=185.0, sample_rate=16000)

    with pytest.raises(AudioTooLong):
        validate_upload(1000, wav_path)

    with pytest.raises(AudioTooLarge):
        validate_upload(26 * 1024 * 1024, wav_path)
