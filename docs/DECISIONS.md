# Architectural & Model Decisions

This document records key engineering and configuration decisions backed by data from the Sajag evaluation corpus, implementing Section 8.5 of `SAJAG_SPEC.md`.

---

## Decision 1: Hinglish STT Language (`hi-IN` vs `en-IN`)

- **Context:** Hinglish (`hi-en`) is widely spoken across urban India, code-switching between Hindi grammar and English loan words. Gnani Prisma STT requires specifying either `hi-IN` or `en-IN` (it returns HTTP 400 if `hi-en` is passed directly).
- **Hypothesis:** Transcribing Hinglish audio as `en-IN` captures English technical/financial vocabulary (e.g. *AnyDesk*, *KYC*, *Google Pay*, *refund*, *registration*) in Latin script matching our English rules, whereas `hi-IN` forces phonetic Devanagari transliteration.
- **Evaluation Set:** 34 dev Hinglish scripts (20 scam, 14 legit).
- **Results:**

| Configuration | Recall | Precision | F1 Score | False Positive Rate | STT Mean CER | Notes |
| :--- | :---: | :---: | :---: | :---: | :---: | :--- |
| **`hi-IN`** | 55.0% (11/20) | 100.0% | 0.7097 | 0.0% (0/14) | Not Comparable | Devanagari output vs Latin script reference |
| **`en-IN`** | **80.0% (16/20)** | **100.0%** | **0.8889** | **0.0% (0/14)** | **8.57%** | Latin script output directly comparable |

- **Decision:** **Adopt `en-IN` as default STT language for Hinglish (`hi-en`) calls.**
  - `en-IN` yields **+25.0% higher scam recall** (80.0% vs 55.0%) and higher F1 (0.8889 vs 0.7097).
  - Both modes maintain **0.0% false positive rate** on legit Hinglish calls.
  - Character error rate is a remarkably low **8.57%** under `en-IN`.

---

## Decision 2: STT Formatting Mode (`verbatim` vs `transcribe`)

- **Context:** Gnani Prisma STT supports two formatting options:
  - `verbatim`: preserves exact spoken word tokens, raw pauses, and hesitations without forced formatting.
  - `transcribe`: applies automatic punctuation, capitalization, and converts spoken numbers to digits.
- **Hypothesis:** `verbatim` preserves raw speech sequences that rule engines match against, while `transcribe` might cause unexpected token boundary shifts.
- **Evaluation Set:** 30 dev scripts (15 scam across 9 scam types, 15 legit across 6 kinds including hard negatives).
- **Results:**

| Mode | Recall | Precision | F1 Score | False Positive Rate | Type Accuracy | Mean CER |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| **`verbatim`** | **100.0% (15/15)** | **100.0%** | **1.0000** | **0.0% (0/15)** | **86.67%** | **7.81%** |
| **`transcribe`** | **100.0% (15/15)** | **100.0%** | **1.0000** | **0.0% (0/15)** | **86.67%** | **9.41%** |

- **Decision:** **Retain `verbatim` as the production standard.**
  - Both achieved 100% recall and 0.0% FPR.
  - `verbatim` achieved lower character error rate (**7.81%** vs **9.41%**), avoiding aggressive number rewriting that can alter spoken digit sequences.

---

## Decision 3: Word Boosting (`bias_list` OFF vs ON)

- **Context:** Gnani Prisma supports biasing STT recognition towards specific critical keywords via `bias_list` and `bias_score` (0.0 to 2.0).
- **Hypothesis:** Word boosting might improve acronym recognition (*OTP*, *KYC*, *CBI*, *UPI*, *AnyDesk*), but Section 8.5 mandates checking whether boosting **invents trigger words** and increases false positive rate on legitimate calls.
- **Bias List Tested:** `["OTP", "KYC", "CBI", "UPI", "AnyDesk", "TeamViewer", "arrest", "ओटीपी", "केवाईसी", "सीबीआई", "यूपीआई", "एनीडेस्क", "पार्सल"]` with `bias_score = 1.0`.
- **Evaluation Set:** 30 dev scripts (15 scam, 15 legit including bank advisory and delivery OTP hard negatives).
- **Results:**

| Configuration | Recall | Precision | F1 Score | False Positive Rate | Type Accuracy | Mean CER | Change in FPR |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **Boosting OFF (`score=0.0`)** | 100.0% | 100.0% | 1.0000 | 0.0% (0/15) | **86.67%** | 7.81% | Baseline |
| **Boosting ON (`score=1.0`)** | 100.0% | 100.0% | 1.0000 | 0.0% (0/15) | 80.00% | 7.56% | **0.0% (No change)** |

- **Decision:** **Keep word boosting OFF (`score=0.0`) by default, keeping it available as an optional flag.**
  - Word boosting did not introduce false alarms on our hard negative set ($\Delta \text{FPR} = 0.0\%$), and reduced CER slightly (7.56% vs 7.81%).
  - However, baseline unboosted `verbatim` STT already detects 100% of scams with higher type accuracy (86.67% vs 80.00%). Avoiding default biasing prevents potential keyword hallucination on unconstrained live speech.

---

## Summary of Production Defaults

1. **Hinglish STT Language:** `en-IN` (maps to `en-IN` on Gnani API).
2. **STT Formatting:** `verbatim`.
3. **Word Boosting:** OFF (`bias_score=0.0`).
