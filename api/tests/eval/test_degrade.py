"""Tests for degradation pipeline: bandpass filtering, mu-law companding, and noise."""

from __future__ import annotations

import numpy as np
import pytest

from eval.degrade import (
    add_noise,
    bandpass_filter,
    generate_pink_noise,
    make_seed,
    mulaw_compand,
    resample,
)


def test_mulaw_compand_roundtrip():
    """Verify numpy mu-law companding bounds and signal reconstruction."""
    t = np.linspace(0, 1, 16000, dtype=np.float32)
    clean = 0.8 * np.sin(2 * np.pi * 440 * t)

    companded = mulaw_compand(clean, mu=255.0)

    # Output bounded in [-1.0, 1.0]
    assert np.max(np.abs(companded)) <= 1.0
    # Quantization error is small (typical 8-bit SNR > 35 dB)
    err = np.max(np.abs(clean - companded))
    assert err < 0.05
    snr = 10 * np.log10(np.mean(clean ** 2) / np.mean((clean - companded) ** 2))
    assert snr > 30.0


def test_bandpass_filter_attenuates_out_of_band():
    """Verify 300-3400 Hz bandpass filter attenuates low and high frequencies."""
    fs = 16000
    t = np.linspace(0, 1, fs, endpoint=False, dtype=np.float32)

    # In-band signal: 1000 Hz
    s_mid = np.sin(2 * np.pi * 1000 * t)
    f_mid = bandpass_filter(s_mid, fs=fs, lowcut=300.0, highcut=3400.0)
    gain_mid = np.std(f_mid) / np.std(s_mid)
    assert 0.85 < gain_mid < 1.1  # passband preserved

    # Low out-of-band signal: 50 Hz
    s_low = np.sin(2 * np.pi * 50 * t)
    f_low = bandpass_filter(s_low, fs=fs, lowcut=300.0, highcut=3400.0)
    gain_low = np.std(f_low) / np.std(s_low)
    assert gain_low < 0.1  # strongly attenuated

    # High out-of-band signal: 6500 Hz
    s_high = np.sin(2 * np.pi * 6500 * t)
    f_high = bandpass_filter(s_high, fs=fs, lowcut=300.0, highcut=3400.0)
    gain_high = np.std(f_high) / np.std(s_high)
    assert gain_high < 0.1  # strongly attenuated


def test_pink_noise_generation():
    """Verify pink noise generates finite non-zero values with zero mean."""
    rng = np.random.default_rng(123)
    pink = generate_pink_noise(16000, rng)
    assert len(pink) == 16000
    assert abs(np.mean(pink)) < 0.05
    assert abs(np.std(pink) - 1.0) < 0.05


def test_add_noise_snr_accuracy():
    """Verify noise injection achieves target SNR within tolerance."""
    fs = 8000
    t = np.linspace(0, 2, 2 * fs, endpoint=False, dtype=np.float32)
    signal = 0.5 * np.sin(2 * np.pi * 400 * t)
    sig_rms = np.sqrt(np.mean(signal ** 2))

    rng = np.random.default_rng(42)
    noisy_15 = add_noise(signal, 15.0, rng)
    noise_part = noisy_15 - signal
    measured_noise_rms = np.sqrt(np.mean(noise_part ** 2))
    measured_snr_15 = 20 * np.log10(sig_rms / measured_noise_rms)

    # Check measured SNR is close to 15 dB (+/- 0.5 dB)
    assert abs(measured_snr_15 - 15.0) < 0.5


def test_deterministic_seeded_reproducibility():
    """Verify same script_id produces bit-exact identical degradation results."""
    fs = 8000
    signal = np.sin(np.linspace(0, 100, fs, dtype=np.float32))

    seed = make_seed("da_hi_calib_001")
    rng1 = np.random.default_rng(seed)
    noisy1 = add_noise(signal, 15.0, rng1)

    rng2 = np.random.default_rng(seed)
    noisy2 = add_noise(signal, 15.0, rng2)

    assert np.array_equal(noisy1, noisy2)
