from pydantic import BaseModel, Field
from typing import List, Optional, Literal

RiskLevel = Literal["safe", "suspicious", "likely_scam", "scam"]

PrimaryType = Literal[
    "digital_arrest",
    "bank_kyc",
    "upi_refund",
    "utility_disconnect",
    "courier_parcel",
    "tech_support_remote",
    "family_emergency",
    "lottery_prize",
    "investment_task",
    "unknown_suspicious",
    "none",
]

ConfidenceLevel = Literal["low", "medium", "high"]


class Segment(BaseModel):
    index: int
    text: str
    offset_s: float = 0.0
    duration_s: float = 0.0


class Signal(BaseModel):
    id: str
    category: str
    weight: int
    evidence: str
    segment_index: int = 0
    start_char: int = 0
    end_char: int = 0
    reviewed: bool = True


class ScamTypeMatch(BaseModel):
    type: str
    confidence: ConfidenceLevel
    matched_categories: List[str]


class AnalysisResult(BaseModel):
    analysis_id: str
    language_code: str
    transcript: str
    segments: List[Segment]
    level: RiskLevel
    score: int
    primary_type: PrimaryType
    types: List[ScamTypeMatch] = Field(default_factory=list)
    signals: List[Signal] = Field(default_factory=list)
    advice_keys: List[str] = Field(default_factory=list)
    disclaimer_key: str = "not_a_guarantee"
    duration_seconds: float = 0.0


class TextAnalysisRequest(BaseModel):
    text: str
    language_code: str = "hi-IN"
