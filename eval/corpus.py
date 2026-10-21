"""Synthetic corpus schema, loading, and validation for evaluation.

Implements section 8.1 of SAJAG_SPEC.md:
- Deterministic 70/30 dev/test split via sha256(id)
- Validation of dialogue turns, speakers, languages, scam types
- Enforces synthetic privacy invariant: no real phone numbers, Aadhaar, or PAN
"""

from __future__ import annotations

import hashlib
import re
import sys
from pathlib import Path
from typing import Literal

REPO_ROOT = Path(__file__).resolve().parents[1]
if str(REPO_ROOT / "api") not in sys.path:
    sys.path.insert(0, str(REPO_ROOT / "api"))

import yaml
from pydantic import BaseModel, Field, field_validator, model_validator

from app.config.settings import REPO_ROOT

CORPUS_SCRIPTS_DIR = REPO_ROOT / "data" / "corpus" / "scripts"

VALID_SCAM_TYPES = {
    "digital_arrest",
    "bank_kyc",
    "upi_refund",
    "utility_disconnect",
    "courier_parcel",
    "tech_support_remote",
    "family_emergency",
    "lottery_prize",
    "investment_task",
}

VALID_LEGIT_KINDS = {
    "bank_advisory",
    "delivery_otp",
    "family_money",
    "customer_care",
    "appointment",
    "chitchat",
}

VALID_SPEAKERS = {"caller", "victim"}
VALID_DIFFICULTIES = {"easy", "medium", "hard"}

# Indian mobile: 10 digits starting with 6-9
RE_PHONE = re.compile(r"\b[6-9]\d{9}\b")
# PAN card: 5 uppercase letters, 4 digits, 1 uppercase letter
RE_PAN = re.compile(r"\b[A-Z]{5}\d{4}[A-Z]\b")
# Aadhaar card: 12 consecutive digits
RE_AADHAAR = re.compile(r"\b\d{4}\s?\d{4}\s?\d{4}\b")


def compute_split(script_id: str) -> Literal["dev", "test", "holdout"]:
    """Deterministically assign 70% dev / 30% test based on sha256(id), or holdout for holdout scripts."""
    if script_id.startswith("holdout_"):
        return "holdout"
    h = int(hashlib.sha256(script_id.encode("utf-8")).hexdigest(), 16)
    return "dev" if (h % 100) < 70 else "test"


class ScriptTurn(BaseModel):
    speaker: Literal["caller", "victim"]
    text: str

    @field_validator("text")
    @classmethod
    def validate_text(cls, v: str) -> str:
        s = v.strip()
        if not s:
            raise ValueError("Turn text cannot be empty.")
        if RE_PHONE.search(s):
            raise ValueError(f"Turn text contains potential real phone number: {s}")
        if RE_PAN.search(s):
            raise ValueError(f"Turn text contains potential PAN identifier: {s}")
        if RE_AADHAAR.search(s):
            raise ValueError(f"Turn text contains potential Aadhaar identifier: {s}")
        return s


class Script(BaseModel):
    id: str = Field(pattern=r"^[a-z0-9_]+$")
    language: str
    label: str
    legit_kind: str | None = None
    difficulty: Literal["easy", "medium", "hard"] = "medium"
    turns: list[ScriptTurn] = Field(min_length=2)
    split: Literal["dev", "test", "holdout"]

    @model_validator(mode="after")
    def validate_script_rules(self) -> Script:
        # Check label
        if self.label != "legit" and self.label not in VALID_SCAM_TYPES:
            raise ValueError(f"Invalid label {self.label!r}. Must be 'legit' or one of {VALID_SCAM_TYPES}")

        # Legit kind rules
        if self.label == "legit":
            if not self.legit_kind or self.legit_kind not in VALID_LEGIT_KINDS:
                raise ValueError(
                    f"Legit script must have legit_kind in {VALID_LEGIT_KINDS}, got {self.legit_kind!r}"
                )
        else:
            if self.legit_kind is not None:
                raise ValueError(f"Scam script must have legit_kind=None, got {self.legit_kind!r}")

        # Deterministic split check
        expected_split = compute_split(self.id)
        if self.split != expected_split:
            raise ValueError(
                f"Split mismatch for {self.id}: declared {self.split!r}, but sha256 requires {expected_split!r}"
            )

        return self

    @property
    def full_text(self) -> str:
        """Concatenated dialogue text with turn breaks."""
        return " ".join(t.text for t in self.turns)

    @property
    def total_words(self) -> int:
        return sum(len(t.text.split()) for t in self.turns)


def load_script(path: Path) -> Script:
    """Load and validate a single YAML script file."""
    raw = yaml.safe_load(path.read_text(encoding="utf-8"))
    return Script.model_validate(raw)


def load_all_scripts(scripts_dir: Path = CORPUS_SCRIPTS_DIR) -> list[Script]:
    """Load and validate all .yaml / .yml scripts in directory."""
    if not scripts_dir.is_dir():
        return []

    scripts: list[Script] = []
    for file_path in sorted(scripts_dir.glob("*.yaml")) + sorted(scripts_dir.glob("*.yml")):
        scripts.append(load_script(file_path))
    return scripts


def filter_scripts(
    scripts: list[Script],
    *,
    split: str | None = None,
    language: str | None = None,
    label: str | None = None,
) -> list[Script]:
    """Filter script collection by split, language, or label."""
    res = scripts
    if split:
        res = [s for s in res if s.split == split]
    if language:
        res = [s for s in res if s.language == language]
    if label:
        res = [s for s in res if s.label == label]
    return res
