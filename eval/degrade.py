"""Audio degradation module for telephony simulation and robustness evaluation.

Implements section 8.3 of SAJAG_SPEC.md:
- Variants per script:
    1. clean (16 kHz mono)
    2. tel (8 kHz mono, 300-3400 Hz bandpass, mu-law companding via numpy — not audioop)
    3. tel_noise15 (tel audio + synthetic white+pink noise at 15 dB SNR)
    4. tel_noise5 (tel audio + synthetic white+pink noise at 5 dB SNR)
- Seeded RNG from script_id for exact reproducibility
"""

from __future__ import annotations

import hashlib
import wave
from pathlib import Path
from typing import Sequence

import numpy as np
from scipy import signal

VARIANTS = ("clean", "tel", "tel_noise15", "tel_noise5")


def read_wav(path: Path) -> tuple[np.ndarray, int]:
    """Read a 16-bit PCM WAV into float32 samples in range [-1.0, 1.0]."""
    with wave.open(str(path), "rb") as w:
        n_channels = w.getnchannels()
        sampwidth = w.getsampwidth()
        framerate = w.getframerate()
        n_frames = w.getnframes()
        raw_bytes = w.readframes(n_frames)

    if sampwidth != 2:
        raise ValueError(f"Expected 16-bit PCM WAV (sampwidth=2), got sampwidth={sampwidth}")

    data = np.frombuffer(raw_bytes, dtype=np.int16).astype(np.float32) / 32768.0

    # If multi-channel, convert to mono by averaging
    if n_channels > 1:
        data = data.reshape(-1, n_channels).mean(axis=1)

    return data, framerate


def write_wav(path: Path, samples: np.ndarray, sample_rate: int) -> Path:
    """Write float32 samples in [-1.0, 1.0] to a 16-bit mono PCM WAV file."""
    path.parent.mkdir(parents=True, exist_ok=True)
    clipped = np.clip(samples, -1.0, 1.0)
    int16_data = (clipped * 32767.0).astype(np.int16)

    with wave.open(str(path), "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(sample_rate)
        w.writeframes(int16_data.tobytes())

    return path


def bandpass_filter(
    samples: np.ndarray,
    fs: int,
    lowcut: float = 300.0,
    highcut: float = 3400.0,
    order: int = 4,
) -> np.ndarray:
    """Apply Butterworth bandpass filter (default 300 Hz - 3400 Hz telephony band)."""
    nyq = 0.5 * fs
    low = max(0.01, lowcut / nyq)
    high = min(0.99, highcut / nyq)
    sos = signal.butter(order, [low, high], btype="bandpass", output="sos")
    filtered = signal.sosfilt(sos, samples).astype(np.float32)
    return filtered


def mulaw_compand(samples: np.ndarray, mu: float = 255.0) -> np.ndarray:
    """Apply G.711 mu-law compression and expansion in numpy (no audioop)."""
    x = np.clip(samples, -1.0, 1.0)
    # Compression: y = sign(x) * ln(1 + mu*|x|) / ln(1 + mu)
    y = np.sign(x) * np.log1p(mu * np.abs(x)) / np.log1p(mu)
    # 8-bit quantization: 256 discrete levels
    q = np.clip(np.round(y * 127.5 + 127.5), 0, 255)
    # Expansion back to linear float
    y_rec = (q - 127.5) / 127.5
    x_rec = np.sign(y_rec) * (1.0 / mu) * ((1.0 + mu) ** np.abs(y_rec) - 1.0)
    return x_rec.astype(np.float32)


def resample(samples: np.ndarray, orig_fs: int, target_fs: int) -> np.ndarray:
    """Resample audio array from orig_fs to target_fs using polyphase filtering."""
    if orig_fs == target_fs:
        return samples
    # Greatest common divisor reduction
    gcd = np.gcd(orig_fs, target_fs)
    up = target_fs // gcd
    down = orig_fs // gcd
    resampled = signal.resample_poly(samples, up, down).astype(np.float32)
    return resampled


def generate_pink_noise(n: int, rng: np.random.Generator) -> np.ndarray:
    """Generate normalized pink (1/f) noise via FFT synthesis."""
    if n <= 0:
        return np.zeros(0, dtype=np.float32)
    white = rng.normal(0.0, 1.0, n).astype(np.float32)
    spec = np.fft.rfft(white)
    freqs = np.fft.rfftfreq(n)
    freqs[0] = 1.0  # avoid divide by zero at DC
    scale = 1.0 / np.sqrt(freqs)
    scale[0] = 0.0  # zero DC component
    pink_spec = spec * scale
    pink = np.fft.irfft(pink_spec, n=n).astype(np.float32)
    std = float(np.std(pink))
    if std > 1e-12:
        pink /= std
    return pink


def add_noise(
    samples: np.ndarray,
    target_snr_db: float,
    rng: np.random.Generator,
) -> np.ndarray:
    """Add synthetic white + pink noise at target SNR (dB) computed from signal RMS."""
    sig_rms = float(np.sqrt(np.mean(samples ** 2)))
    if sig_rms < 1e-6:
        return samples.copy()

    n = len(samples)
    white = rng.normal(0.0, 1.0, n).astype(np.float32)
    white /= float(np.std(white)) + 1e-12

    pink = generate_pink_noise(n, rng)

    # Combined 50% white + 50% pink noise
    raw_noise = 0.5 * white + 0.5 * pink
    noise_rms = float(np.sqrt(np.mean(raw_noise ** 2)))
    if noise_rms > 1e-12:
        norm_noise = raw_noise / noise_rms
    else:
        norm_noise = raw_noise

    # Target noise RMS = sig_rms / 10^(SNR/20)
    target_noise_rms = sig_rms / (10.0 ** (target_snr_db / 20.0))
    scaled_noise = norm_noise * target_noise_rms

    noisy = np.clip(samples + scaled_noise, -1.0, 1.0)
    return noisy.astype(np.float32)


def make_seed(script_id: str) -> int:
    """Derive deterministic 32-bit integer seed from script_id."""
    return int(hashlib.sha256(script_id.encode("utf-8")).hexdigest()[:8], 16)


def create_degraded_variants(
    clean_wav_path: Path,
    output_base_dir: Path,
    script_id: str,
) -> dict[str, Path]:
    """Generate all 4 evaluation audio variants from clean 16 kHz audio.
    
    Returns dict mapping variant name -> file path.
    """
    clean_samples, fs = read_wav(clean_wav_path)
    if fs != 16000:
        clean_samples = resample(clean_samples, fs, 16000)
        fs = 16000

    results: dict[str, Path] = {}

    # 1. clean (16 kHz mono)
    clean_out = output_base_dir / "clean" / f"{script_id}.wav"
    results["clean"] = write_wav(clean_out, clean_samples, 16000)

    # 2. tel (8 kHz, 300-3400 Hz bandpass, mu-law companding)
    # Bandpass filter at 16 kHz first before downsampling to prevent aliasing
    filtered_16k = bandpass_filter(clean_samples, 16000, 300.0, 3400.0)
    downsampled_8k = resample(filtered_16k, 16000, 8000)
    tel_samples = mulaw_compand(downsampled_8k)
    tel_out = output_base_dir / "tel" / f"{script_id}.wav"
    results["tel"] = write_wav(tel_out, tel_samples, 8000)

    # Deterministic RNG for noise variants
    seed = make_seed(script_id)
    rng_15 = np.random.default_rng(seed)
    rng_5 = np.random.default_rng(seed + 101)

    # 3. tel_noise15 (15 dB SNR)
    noisy_15 = add_noise(tel_samples, 15.0, rng_15)
    noise15_out = output_base_dir / "tel_noise15" / f"{script_id}.wav"
    results["tel_noise15"] = write_wav(noise15_out, noisy_15, 8000)

    # 4. tel_noise5 (5 dB SNR)
    noisy_5 = add_noise(tel_samples, 5.0, rng_5)
    noise5_out = output_base_dir / "tel_noise5" / f"{script_id}.wav"
    results["tel_noise5"] = write_wav(noise5_out, noisy_5, 8000)

    return results
