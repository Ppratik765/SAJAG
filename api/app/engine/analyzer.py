import uuid
from typing import List, Optional
from app.models.analysis import (
    AnalysisResult,
    Segment,
    Signal,
)
from app.engine.normalizer import normalize_text
from app.engine.matcher import Matcher, load_playbook
from app.engine.scorer import score_signals

_MATCHER_INSTANCE: Optional[Matcher] = None


def get_matcher() -> Matcher:
    global _MATCHER_INSTANCE
    if _MATCHER_INSTANCE is None:
        _MATCHER_INSTANCE = Matcher()
    return _MATCHER_INSTANCE


def analyze_text(
    text: str, language_code: str = "hi-IN", segment_index: int = 0
) -> AnalysisResult:
    """
    Analyzes a single block of text (e.g. from /paste route or text input).
    """
    matcher = get_matcher()
    norm = normalize_text(text)
    signals, _ = matcher.match_text(norm, segment_index=segment_index)

    # Invariant enforcement: Every signal's evidence must be an exact substring of raw text
    for sig in signals:
        if sig.evidence not in text:
            raise ValueError(
                f"Evidence invariant violation: '{sig.evidence}' is not an exact substring of input text"
            )

    score, level, primary_type, type_matches, advice_keys = score_signals(
        signals, matcher.types_config, matcher.categories_config
    )

    segment = Segment(
        index=0,
        text=text,
        offset_s=0.0,
        duration_s=0.0,
    )

    return AnalysisResult(
        analysis_id=str(uuid.uuid4()),
        language_code=language_code,
        transcript=text,
        segments=[segment] if text else [],
        level=level,
        score=score,
        primary_type=primary_type,
        types=type_matches,
        signals=signals,
        advice_keys=advice_keys,
        disclaimer_key="not_a_guarantee",
        duration_seconds=0.0,
    )


def analyze_segments(
    segments: List[Segment], language_code: str = "hi-IN", total_duration: float = 0.0
) -> AnalysisResult:
    """
    Analyzes multi-segment transcripts (e.g. from chunked audio STT in /api/analyze/audio).
    Runs matcher across each segment, accumulates signals, and scores the combined session.
    """
    matcher = get_matcher()
    all_signals: List[Signal] = []
    full_transcript_parts = []

    for seg in segments:
        full_transcript_parts.append(seg.text)
        norm = normalize_text(seg.text)
        seg_signals, _ = matcher.match_text(norm, segment_index=seg.index)

        # Invariant enforcement
        for sig in seg_signals:
            if sig.evidence not in seg.text:
                raise ValueError(
                    f"Evidence invariant violation: '{sig.evidence}' not in segment {seg.index} text"
                )
        all_signals.extend(seg_signals)

    full_transcript = " ".join(full_transcript_parts)

    score, level, primary_type, type_matches, advice_keys = score_signals(
        all_signals, matcher.types_config, matcher.categories_config
    )

    return AnalysisResult(
        analysis_id=str(uuid.uuid4()),
        language_code=language_code,
        transcript=full_transcript,
        segments=segments,
        level=level,
        score=score,
        primary_type=primary_type,
        types=type_matches,
        signals=all_signals,
        advice_keys=advice_keys,
        disclaimer_key="not_a_guarantee",
        duration_seconds=total_duration,
    )
