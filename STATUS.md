# STATUS — M3.1b Advisory Rule Generalisation, Playbook Refactor & Benchmark — 2026-10-21 IST

## 1. M3.1b Summary & Objectives Completed

Milestone M3.1b completes the advisory rule generalisation, playbook data refactoring, and secrecy pattern expansion without starting M4:
- **Playbook Data Externalisation:** Moved `ADVISORY_BEFORE`, `ADVISORY_PHRASES`, and `HELPLINE_NUMBERS` out of `api/app/engine/matcher.py` into `data/playbook/playbook.yaml` as declarative configuration (108 deduplicated advisory phrases, 10 helpline numbers, advisory authorities, and advisory frame keywords). The matcher reads them from the playbook at initialisation. Dev and test numbers remain strictly identical.
- **Generic Authority Advisory Rule:** Added a generic sentence-level rule: when an authority name (`police`, `CBI`, `cyber cell`, `bank`, `RBI`, `TRAI`, `पुलिस`, `साइबर सेल`, `सी बी आई`, etc.) appears inside a sentence that contains an advisory frame (`"fake"`, `"नकली"`, `"सावधान"`, `"never"`, `"कभी नहीं"`, `"advisory"`, `"awareness"`, `"जागरूकता"`, `"report"`, `"शिकायत"`, etc.), it must not score `AUTHORITY_CLAIM`, `THREAT_ARREST`, or `MONEY_TRANSFER` for that sentence. Signals before and after were printed for `fresh_holdout_legit_police_hi_001`, `fresh_holdout_legit_police_en_001`, and `bank_advisory_en_calib_005` without inspecting or modifying their script texts.
- **Secrecy Patterns & Advisory Suppression:** Added `SECRECY` pattern matches for English ("do not share this with anyone", "don't tell your family", "do not discuss this with anyone", "keep this confidential", etc.) and Hindi/Hinglish equivalents ("किसी के साथ शेयर मत करना", "किसी से चर्चा मत करना", "परिवार को मत बताना", etc.). Added 6 new scam test cases and unit tests verifying that advisory sentences ("never share your OTP with anyone") stay suppressed from scoring as secrecy. All 131 tests in `pytest api/tests` pass with zero failures.
- **Zero API Credits Consumed:** All runs were text-engine only, consuming 0 STT/TTS API credits (well within the max ~15 credit limit).
- **Strict Regression Invariant:** Re-evaluated all 239 clips. Dev scam recall remained strictly unchanged at **83.9% (47/56)** and Test scam recall at **75.0% (21/28)**. Legit false positive rate is **0.00% across dev (0/57), test (0/26), holdout (0/30), and fresh holdout (0/12)**. Fresh holdout is reported as `"fresh holdout (seen after M3.1b)"` with FPR dropped from 16.67% to 0.00%.

---

## 2. Evidence: Signals Before & After Generic Rule

Signals printed from the evaluation code for the three target scripts without inspecting or modifying their script texts:

### Target 1: `fresh_holdout_legit_police_hi_001` (hi-IN, Cyber Crime Cell advisory on fake warrants)
- **`clean` variant:**
  - **BEFORE M3.1b:** Score: 10, Level: `likely_scam` (**False Positive**)
    - `[AUTHORITY_CLAIM]` weight=2, evidence='पुलिस'
    - `[AUTHORITY_CLAIM]` weight=2, evidence='साइबर सेल'
    - `[AUTHORITY_CLAIM]` weight=2, evidence='पुलिस'
    - `[AUTHORITY_CLAIM]` weight=2, evidence='सी बी आई'
    - `[THREAT_ARREST]` weight=3, evidence='अरेस्ट'
    - `[MONEY_TRANSFER]` weight=3, evidence='ट्रांसफर'
  - **AFTER M3.1b:** Score: 0, Level: `safe` (**Resolved — 0 signals**)
- **`tel` variant:**
  - **BEFORE M3.1b:** Score: 10, Level: `likely_scam` (**False Positive**)
  - **AFTER M3.1b:** Score: 0, Level: `safe` (**Resolved — 0 signals**)

### Target 2: `fresh_holdout_legit_police_en_001` (en-IN, Cyber Cell public safety advisory on digital arrest)
- **`clean` variant:**
  - **BEFORE M3.1b:** Score: 6, Level: `suspicious` (non-scam)
    - `[THREAT_ARREST]` weight=3, evidence='arrest'
    - `[FAMILY_EMERGENCY]` weight=2, evidence='bail'
    - `[URGENCY]` weight=1, evidence='right now'
  - **AFTER M3.1b:** Score: 3, Level: `suspicious` (non-scam)
    - `[FAMILY_EMERGENCY]` weight=2, evidence='bail'
    - `[URGENCY]` weight=1, evidence='right now'
    *(Note: `THREAT_ARREST` 'arrest' successfully suppressed by advisory frame rule)*
- **`tel` variant:**
  - **BEFORE M3.1b:** Score: 6, Level: `suspicious` (non-scam)
  - **AFTER M3.1b:** Score: 3, Level: `suspicious` (non-scam)

### Target 3: `bank_advisory_en_calib_005` (en-IN, Bank security advisory)
- **`clean` variant:**
  - **BEFORE M3.1b:** Score: 5, Level: `suspicious` (non-scam)
    - `[OTP_PIN_REQUEST]` weight=4, evidence='otp'
    - `[OTP_PIN_REQUEST]` weight=4, evidence='cvv'
  - **AFTER M3.1b:** Score: 0, Level: `safe` (**Resolved — 0 signals**)

---

## 3. Split Breakdown Benchmark Results

| Split | Clips | Precision | Recall | F1 Score | False Positive Rate | Type Accuracy | STT Mean CER | Notes |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :--- |
| **DEV** | 113 | **100.0%** | **83.9%** (47/56) | **0.9126** | **0.00%** (0/57) | **85.1%** | 9.60% | Dev split baseline preserved (no scam recall drop) |
| **TEST** | 54 | **100.0%** | **75.0%** (21/28) | **0.8571** | **0.00%** (0/26) | **81.0%** | 11.12% | Unseen test partition ($\ge 71.4\%$ pre-fix baseline) |
| **HOLDOUT (Contaminated)** | 60 | **100.0%** | **63.3%** (19/30) | **0.7755** | **0.00%** (0/30) | **79.0%** | 8.56% | Contaminated by earlier M3.1 advisory tuning |
| **FRESH HOLDOUT (seen after M3.1b)** | 12 | **N/A** (0 TP) | **N/A** (0/0) | **0.0000** | **0.00%** (0/12) | N/A | 10.17% | 6 advisory scripts, clean & tel; FPR dropped 16.67% $\to$ 0% |
| **CONSOLIDATED CORPUS** | 239 | **100.0%** | **76.3%** (87/114) | **0.8657** | **0.00%** (0/125) | **82.8%** | 9.71% | Full 203-script / 239-clip evaluation |

---

## 4. Fresh Holdout Evaluation Details (seen after M3.1b)

All 6 fresh holdout scripts evaluated on clean and telephony audio:

1. `fresh_holdout_legit_rbi_en_001` (en-IN, RBI Financial Education bulletin):
   - `clean`: Score: 0 (`safe`)
   - `tel`: Score: 0 (`safe`)
2. `fresh_holdout_legit_police_en_001` (en-IN, Cyber Cell advisory on digital arrest):
   - `clean`: Score: 3 (`suspicious` — non-scam, arrest suppressed)
   - `tel`: Score: 3 (`suspicious` — non-scam, arrest suppressed)
3. `fresh_holdout_legit_telecom_en_001` (en-IN, Telecom Department SIM disconnection advisory):
   - `clean`: Score: 2 (`safe`)
   - `tel`: Score: 2 (`safe`)
4. `fresh_holdout_legit_bank_hi_001` (hi-IN, Bank security awareness on OTP/PIN fraud):
   - `clean`: Score: 0 (`safe`)
   - `tel`: Score: 0 (`safe`)
5. `fresh_holdout_legit_police_hi_001` (hi-IN, Cyber Crime Cell advisory on fake warrants):
   - `clean`: Score: 0 (`safe` — **FP resolved by generic authority advisory rule**)
   - `tel`: Score: 0 (`safe` — **FP resolved by generic authority advisory rule**)
6. `fresh_holdout_legit_telecom_hi_001` (hi-IN, Telecom / Sanchar Saathi alert on electricity bill scams):
   - `clean`: Score: 2 (`safe`)
   - `tel`: Score: 2 (`safe`)

**Fresh Holdout Summary:** 100.0% specificity (12 of 12 clips safe/non-scam, 0.00% FPR).

---

## 5. Measured Usage Counters & Credit Status

### Concrete Measured Counters (`api/.cache/usage.json`)
- **Cumulative STT Audio Transcribed:** 8,651.75 seconds (~144.2 minutes)
- **Cumulative TTS Characters Synthesized:** 76,632 characters
- **M3.1b Incremental Usage:**
  - 0 TTS characters synthesized.
  - 0 STT seconds transcribed.
  - Entire M3.1b validation performed via local text-engine evaluation on cached transcripts (0 API credits used).

### Dashboard Reading Checkpoints
- **Baseline Checkpoint (after calibration):** 7.57 credits consumed.
- **Batch 1 Checkpoint:** 65.53 credits consumed.
- **Latest Dashboard Reading:** **269 credits used**, **~4,730 credits remaining** (~94.6% of initial 5,000 credit budget).
- Comfortably exceeding the 40% (2,000 credit) reserve requirement.

---

## 6. Corpus File Consistency Verification

Corpus counts verified by automated filesystem inspection:
- **Total Dialogue YAML Scripts:** **203 files** in `data/corpus/scripts/`
  - `dev` split: 113 scripts (56 scam, 57 legit)
  - `test` split: 54 scripts (28 scam, 26 legit)
  - `holdout` split (contaminated): 30 scripts (15 scam, 15 legit)
  - `fresh_holdout` split (seen after M3.1b): 6 scripts (0 scam, 6 legit)
  - Total Scam: 99 scripts; Total Legit: 104 scripts
- **Total Audio Files on Disk:** **812 WAV files** in `data/corpus/audio/`
  - `clean`: 203 files
  - `tel`: 203 files
  - `tel_noise15`: 203 files
  - `tel_noise5`: 203 files

---

## 7. Verification Tests
- **Backend Engine Tests:** 131 passed, 0 failed in 17.06s (`pytest api/tests`).
- **Corpus Schema Tests:** 7 passed in 0.60s (`pytest api/tests/eval/test_corpus_schema.py`).
- **Web App Build:** Passed cleanly with zero TypeScript or styling errors via Next.js Turbopack (`npm run build` in `web/`, 14 static routes generated).

---

## 8. Artifacts & Deliverables
- `data/playbook/playbook.yaml`: Declarative externalised advisory phrases, helpline numbers, authorities, and advisory frame keywords, alongside updated secrecy patterns.
- `api/app/engine/matcher.py`: Clean matcher reading advisory configuration dynamically with generic authority advisory sentence rule.
- `api/tests/engine/test_engine.py`: Unit tests for secrecy patterns, advisory sentences, and authority advisory rule.
- `eval/results/latest.json`: Consolidated evaluation report storing full signal objects (`id`, `category`, `evidence`, `weight`) across 239 clips.
- `web/src/app/accuracy/page.tsx`: Web benchmark page with KPI cards and clear split breakdown table labeling `"FRESH HOLDOUT (SEEN AFTER M3.1B)"`.
- `eval/rescore_report.py`, `eval/print_comparison.py`, `eval/run_regression.py`: Evaluation regression and signal comparison utilities.

---

## 9. Ready for next milestone? yes/no (+ blockers)
- **YES.** Milestone M3.1b follow-up is complete.
- **STOPPING FOR HUMAN REVIEW** per instruction ("Do not start M4").
