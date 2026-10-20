"""Tests for corpus schema validation and deterministic splitting."""

from __future__ import annotations

import hashlib
import pytest
from pydantic import ValidationError

from eval.corpus import (
    Script,
    ScriptTurn,
    compute_split,
    load_all_scripts,
)


def test_compute_split_deterministic():
    """Verify deterministic 70/30 split logic."""
    val1 = compute_split("da_hi_calib_001")
    val2 = compute_split("da_hi_calib_001")
    assert val1 == val2
    assert val1 in ("dev", "test")

    # Check distribution over 100 sample IDs
    splits = [compute_split(f"test_id_{i:03d}") for i in range(100)]
    dev_count = sum(1 for s in splits if s == "dev")
    test_count = sum(1 for s in splits if s == "test")
    assert 60 <= dev_count <= 80
    assert 20 <= test_count <= 40


def test_calibration_scripts_load_and_validate():
    """Verify all 5 calibration scripts in data/corpus/scripts/ are valid."""
    scripts = load_all_scripts()
    calib_scripts = [s for s in scripts if "_calib_" in s.id]
    assert len(calib_scripts) >= 5

    for s in calib_scripts:
        assert s.split == "dev"
        assert len(s.turns) >= 4
        assert s.total_words > 20
        # No PII
        for turn in s.turns:
            assert len(turn.text) > 0


def test_reject_real_phone_numbers():
    """Verify Indian phone numbers are blocked in turns."""
    with pytest.raises(ValidationError):
        ScriptTurn(speaker="caller", text="Mera phone number 9876543210 hai.")


def test_reject_real_pan_identifier():
    """Verify PAN identifiers are blocked in turns."""
    with pytest.raises(ValidationError):
        ScriptTurn(speaker="caller", text="Apna PAN card ABCDE1234F share kijiye.")


def test_reject_real_aadhaar_identifier():
    """Verify Aadhaar numbers are blocked in turns."""
    with pytest.raises(ValidationError):
        ScriptTurn(speaker="caller", text="Aadhaar number 1234 5678 9012 update karna hai.")


def test_scam_cannot_have_legit_kind():
    """Scam scripts must have legit_kind=None."""
    sid = "da_hi_calib_001"
    split = compute_split(sid)
    with pytest.raises(ValidationError):
        Script(
            id=sid,
            language="hi-IN",
            label="digital_arrest",
            legit_kind="bank_advisory",
            turns=[
                ScriptTurn(speaker="caller", text="Sample call"),
                ScriptTurn(speaker="victim", text="Sample response"),
            ],
            split=split,
        )


def test_legit_must_have_legit_kind():
    """Legit scripts must specify legit_kind."""
    sid = "deliv_hi_calib_004"
    split = compute_split(sid)
    with pytest.raises(ValidationError):
        Script(
            id=sid,
            language="hi-IN",
            label="legit",
            legit_kind=None,
            turns=[
                ScriptTurn(speaker="caller", text="Sample call"),
                ScriptTurn(speaker="victim", text="Sample response"),
            ],
            split=split,
        )
