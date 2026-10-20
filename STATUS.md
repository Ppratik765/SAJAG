# STATUS — after M2 — 2026-10-20 15:20 IST

## Done
- **Deterministic Detection Engine** (`api/app/engine/`):
  - `normalizer.py`: NFC normalization, lowercase Latin, zero-width char stripping, punctuation & danda replacement, sentence boundary index tracking on tokens, exact raw offset mapping guaranteeing the evidence-substring invariant.
  - `matcher.py`: Space-delimited token sequences without Indic `\b`, context rules:
    - Negation / warning suppression: checks tokens strictly outside pattern within the same sentence (suppressing false alarms on genuine bank/police advisories).
    - Excluded negation combos: phrases like `mat batana` (secrecy) and `mat kaatna` (isolation) are protected from self-suppression.
    - Delivery context: downgrades `OTP_PIN_REQUEST` weight to 1 if delivery context is present and it is the sole hard category.
    - Request context (`needs_request_context`): verifies presence of request verbs within 6 tokens; if absent, reduces weight to 1.
    - Exact evidence substring extraction from raw text.
  - `scorer.py`: Category aggregation with repeat bonus (+1 up to +2), playbook type satisfaction (all_of, any_of, also_any_of), risk levels (`safe`, `suspicious`, `likely_scam`, `scam`), intelligent tie-breaking prioritizing specific categories, unreviewed pattern cap, and actionable advice keys generation.
  - `analyzer.py`: Orchestrator with `analyze_text` and `analyze_segments`, asserting the evidence-substring invariant on every single emitted signal.
- **Playbook v1** (`data/playbook/playbook.yaml`):
  - 13 categories configured with weights and hard flags (`AUTHORITY_CLAIM`, `THREAT_ARREST`, `ISOLATION`, `SECRECY`, `OTP_PIN_REQUEST`, `MONEY_TRANSFER`, `REMOTE_ACCESS_APP`, `ACCOUNT_THREAT`, `URGENCY`, `PRIZE_REFUND`, `FAMILY_EMERGENCY`, `PARCEL`, `INVESTMENT`).
  - 9 scam types defined (`digital_arrest`, `bank_kyc`, `courier_parcel`, `lottery_prize`, `upi_refund`, `utility_disconnect`, `tech_support_remote`, `family_emergency`, `investment_task`).
  - Seed phrases in English, Hindi (Devanagari), and Hinglish (Roman).
- **API Routes Attached** (`api/app/routes/`):
  - `POST /api/analyze/text`: Analyzes raw text transcripts or pasted messages with zero speech credit cost.
  - `POST /api/analyze/audio`: Now runs `analyze_segments` on reassembled audio chunks and attaches full `AnalysisResult` (level, score, primary_type, types, signals, advice_keys).
  - `GET /api/meta`: `engine_attached: True`.
- **Frontend /paste Page & Components** (`web/src/app/paste/page.tsx`):
  - Reuses `CallSheet`, `Mark`, `MarginNote`, `LevelStrip`, `VerdictStamp`.
  - Input card with 5 quick verified sample message chips.
  - Marked up call sheet with hand-drawn SVG ink ellipses, pulse highlights, and plain-language handwritten margin notes (no category jargon like `AUTHORITY_CLAIM` or `THREAT_ARREST`).
  - Result summary card with `VerdictStamp` and recommended actions.
  - Fallback client for offline deterministic preview.

## Evidence (real outputs, trimmed, key redacted)

### Test Suite (`api/.venv/Scripts/pytest -v`)
```
============================= test session starts =============================
platform win32 -- Python 3.13.11, pytest-9.1.1, pluggy-1.7.0 -- C:\Users\ppmak\SAJAG\api\.venv\Scripts\python.exe
cachedir: .pytest_cache
rootdir: C:\Users\ppmak\SAJAG\api
configfile: pytest.ini
testpaths: tests
plugins: anyio-4.15.1, asyncio-1.4.0, respx-0.23.1
collecting ... collected 102 items

tests/engine/test_engine.py (68 table-driven cases covering all 9 scam types in Hindi, Hinglish, English; negation suppression; delivery OTP; genuine family calls; genuine bank advisories; edge cases) ... ALL PASSED
tests/engine/test_engine.py::test_evidence_substring_invariant_across_all_cases PASSED
tests/engine/test_engine.py::test_multi_segment_analysis PASSED
tests/engine/test_engine.py::test_unreviewed_pattern_cap PASSED
tests/engine/test_normalizer.py (5 tests: NFC, lowercase, Indic preservation, zero-width chars, raw offset mapping) ... ALL PASSED
tests/test_analyze_route.py (7 tests: healthz, meta engine_attached=True, usage auth, analyze audio, analyze text, invalid lang, maintenance mode) ... ALL PASSED
tests/test_audio.py (6 tests) ... ALL PASSED
tests/test_health.py (3 tests) ... ALL PASSED
tests/test_stt_rest.py (6 tests) ... ALL PASSED
tests/test_usage.py (1 test) ... ALL PASSED

======================= 102 passed, 1 warning in 11.36s =======================
```

### Visual Inspection Evidence
- `docs/screens/paste-desktop.png`: 1440x900 viewport showing Threat Gauge with needle in `Likely scam`, Call Sheet with exact hand-drawn ink ellipses around `"police"`, `"warrant"`, and `"digital arrest"`, handwritten Kalam margin notes in plain language (`claims official authority`, `threatens police arrest`, `demands you stay on call`), result card, and rubber VerdictStamp.
- `docs/screens/paste-mobile.png`: 390x844 mobile viewport showing identical visual identity, clean single-column stacking, plain-language notes, and 0px horizontal scroll.

## Tests
- **pytest**: 102 passed, 0 failed in 11.36s (`api/.venv/Scripts/pytest -v`)
- **npm run build**: 14/14 static pages generated with 0 errors (`next build`).
- **web unit tests**: 3 passed (`npm --prefix web run test`).

## Gnani usage this milestone
- STT seconds: 0s   TTS characters: 0   (credit change reported by human: not yet reported)
- Note: M2 is deterministic rule-based evaluation and used zero speech credits.

## Deviations from the spec (and why)
- None. Fully implemented per section 5 and 10. `engine_attached` flipped to `True`.

## Doc differences found (live docs vs spec)
- None.

## Dependencies added (name==version — reason)
- None.

## Open questions for the human
- None.

## Ready for next milestone? yes (+ blockers)
- Ready for M3 (corpus generation & calibration run).
