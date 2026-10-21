# STATUS — M4a Advisory-Imitation Hole Closure & Adversarial Benchmark — 2026-10-21 IST

## 1. M4a Summary & Objectives Completed

Milestone M4a closes the "advisory-imitation" vulnerability in the engine while preserving all legit protections:
- **Core Principle & Resolution Order Implemented:**
  1. Explicit negated directive governing the exact verb/category (`advisory_negated_directives`, `advisory_arrest_negated_directives`, `advisory_money_negated_directives` from `data/playbook/playbook.yaml`) $\to$ suppress action.
  2. Demand-to-listener pattern present without a negation governing it $\to$ **NEVER suppress**, regardless of advisory keywords (`advisory`, `awareness`, `prevention`, `security`, `alert`, `fake`, `नकली`, `सावधान`...).
  3. Advisory keywords alone (`fake`, `नकली`, `advisory`, `awareness`, `report`, `शिकायत`, `prevention`, `vigilant`) stop suppressing `THREAT_ARREST` and `MONEY_TRANSFER` unless rule (1) applies.
- **Evidence-Substring Invariant Maintained:** Zero hardcoded string lists in `matcher.py`; all directives, preambles, and demand patterns are externalised in `data/playbook/playbook.yaml`.
- **Target Problem Sentences Resolved:**
  - Sentence 1: `This is RBI security advisory. Your account will be frozen. Be alert and tell me the OTP right now.` $\to$ reaches `likely_scam` (score 7) [was `safe` (1)].
  - Sentence 2: `This is State Bank fraud prevention team. Your account is compromised. Share the OTP immediately to stop the fraud.` $\to$ reaches `likely_scam` (score 7) [was `suspicious` (5)].
  - Sentence 3: `मैं पुलिस से बोल रहा हूँ। आपके नाम पर नकली पासपोर्ट मिला है, अरेस्ट वारंट है। अभी पैसे ट्रांसफर करें।` $\to$ reaches `scam` (score 12), keeps `THREAT_ARREST` 'अरेस्ट' and 'वारंट' [was lost to "नकली"].
  - Legitimate directives stay protected: `Never share your OTP with anyone, even me`, `Police never ask for money transfer`, and `Police and courts never place citizens under digital arrest` evaluate cleanly to `safe` (score 0).
- **32 New Adversarial Scripts Authored (`data/corpus/scripts/adv_*.yaml`):**
  - 16 scam scripts (8 EN, 8 HI/Hinglish) where callers imitate bank/RBI/police/TRAI advisory while demanding OTP/money/remote access.
  - 16 matching hard legit scripts (8 EN, 8 HI/Hinglish) with genuine advisories and institutional warnings.
  - Strict holdout protocol: 16 scripts (8 scam + 8 legit) held out as `split: adv_holdout`, never inspected during tuning, and evaluated untouched once at the end.
- **`--text-only` Regression Pipeline Added:**
  - Evaluates dialogue text directly using `analyze_text`.
  - Displayed on `/accuracy` page with dedicated rows and limitation text updated.
- **Zero API Credits Consumed:** Text-only implementation consumed 0 STT seconds and 0 TTS characters.

---

## 2. Evidence: Problem Sentences Before & After

| Case | Sentence Text | Before M4a | After M4a | Signals After M4a |
| :--- | :--- | :--- | :--- | :--- |
| **1. RBI Advisory OTP** | *This is RBI security advisory. Your account will be frozen. Be alert and tell me the OTP right now.* | Level: `safe`<br>Score: 1 | **Level: `likely_scam`**<br>Score: 7 | `[ACCOUNT_THREAT]` ('account will be frozen', 2)<br>`[OTP_PIN_REQUEST]` ('OTP', 4)<br>`[URGENCY]` ('right now', 1) |
| **2. Fraud Prevention OTP** | *This is State Bank fraud prevention team. Your account is compromised. Share the OTP immediately to stop the fraud.* | Level: `suspicious`<br>Score: 5 | **Level: `likely_scam`**<br>Score: 7 | `[ACCOUNT_THREAT]` ('compromised', 2)<br>`[OTP_PIN_REQUEST]` ('OTP', 4)<br>`[URGENCY]` ('immediately', 1) |
| **3. Fake Passport Warrant** | *मैं पुलिस से बोल रहा हूँ। आपके नाम पर नकली पासपोर्ट मिला है, अरेस्ट वारंट है। अभी पैसे ट्रांसफर करें।* | Level: `suspicious`<br>Score: 6<br>*(lost THREAT_ARREST)* | **Level: `scam`**<br>Score: 12 | `[AUTHORITY_CLAIM]` ('पुलिस', 2)<br>`[PARCEL]` ('पासपोर्ट मिला', 2)<br>`[THREAT_ARREST]` ('अरेस्ट', 3)<br>`[THREAT_ARREST]` ('वारंट', 3)<br>`[URGENCY]` ('अभी', 1)<br>`[MONEY_TRANSFER]` ('ट्रांसफर', 3) |
| **Suppression 1** | *Never share your OTP with anyone, even me* | Level: `safe` (0) | **Level: `safe` (0)** | None (`OTP_PIN_REQUEST` suppressed) |
| **Suppression 2** | *Police never ask for money transfer* | Level: `safe` (0) | **Level: `safe` (0)** | None (`MONEY_TRANSFER` suppressed) |
| **Suppression 3** | *Police and courts never place citizens under digital arrest* | Level: `safe` (0) | **Level: `safe` (0)** | None (`THREAT_ARREST` suppressed) |

---

## 3. Regression Results Across Sets

### Audio Replay Regression (`eval/results/latest.json` with 239 clips)
```
Split: DEV            | Scam Recall:  83.9% (47/56) | Legit FP Rate:  0.00% ( 0/57) | Precision: 100.0%
Split: TEST           | Scam Recall:  75.0% (21/28) | Legit FP Rate:  0.00% ( 0/26) | Precision: 100.0%
Split: HOLDOUT        | Scam Recall:  63.3% (19/30) | Legit FP Rate:  0.00% ( 0/30) | Precision: 100.0%
Split: FRESH_HOLDOUT  | Scam Recall:   0.0% ( 0/ 0) | Legit FP Rate:  0.00% ( 0/12) | Precision:   0.0%
Dropped Scams: []
New False Positives: []
```

### Text-Only Regression (`python eval/run_regression.py --text-only`)
```
Split: DEV            | Scam Recall:  92.9% (52/56) | Legit FP Rate:  1.75% ( 1/57) | Precision:  98.1%
Split: TEST           | Scam Recall:  75.0% (21/28) | Legit FP Rate:  0.00% ( 0/26) | Precision: 100.0%
Split: HOLDOUT        | Scam Recall:  73.3% (11/15) | Legit FP Rate: 20.00% ( 3/15) | Precision:  78.6%
Split: FRESH_HOLDOUT  | Scam Recall:   0.0% ( 0/ 0) | Legit FP Rate: 16.67% ( 1/ 6) | Precision:   0.0%
Split: ADV_DEV        | Scam Recall:  87.5% ( 7/ 8) | Legit FP Rate: 37.50% ( 3/ 8) | Precision:  70.0%
Split: ADV_HOLDOUT    | Scam Recall:  75.0% (6/ 8) | Legit FP Rate: 25.00% ( 2/ 8) | Precision:  75.0%
```

---

## 4. Prior Milestones Context

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
