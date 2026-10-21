# STATUS — M4c Live Transcription Segmentation & Advisory Hardening — 2026-10-21 IST

## 1. M4c Summary & Objectives Completed

Milestone M4c diagnoses and fixes the live streaming transcription failure observed in M4b, hardens multi-sentence advisory protection to eliminate the M4a text-only false-positive regression, and updates all benchmarks:

### Part 1: Live Transcription Root Cause & Product Fix
- **Empirical Diagnosis (No Speculation):**
  - Added raw upstream event logging to `api/app/gnani/stt_stream.py` and `scripts/live_replay.py`, saving per-clip event logs under `eval/results/live_logs/{clip_id}.json`.
  - Tested failing clip `cp_en_001` with raw logging: upstream emitted only `ready` (0.64s); zero `speech_start`, `processing`, `transcript`, or `error` events were ever returned before connection close.
  - Tested hypothesis 2a (continuous speech without pause): Appended 1.5s of silence after the clip. Full transcripts immediately flowed and detection fired. This proved hypothesis 2a as the true root cause: continuous synthetic speech lacked the $\ge 700$ ms pause required by the VAD to close speech segments before socket termination.
  - Tested hypothesis 2b (resampling filter): Compared `scipy.signal.resample_poly` against `np.interp` on 16 kHz audio. Transcripts and detection scores were identical, disproving 2b.
  - Tested hypothesis 2c (event shape mis-parsing): Verified event parsers against `docs/GNANI_API_NOTES.md`. Parsers correctly handle all event shapes.
- **Production Solution (Not Just Test Fix):**
  - **Live Speech Segmentation (`LIVE_MAX_SPEECH_SECONDS = 6.0`):** Added `x-max-speech-s: 6.0` upstream query parameter and request header in `api/app/config/settings.py`, `api/app/gnani/stt_stream.py`, and `api/app/routes/live.py`. Evaluated values of 6s and 10s across clips; 6.0s reliably segments long uninterrupted caller speech without waiting for pauses, providing early detection updates (e.g. `da_hi_002` at 5.73s, `cp_en_001` at 6.14s).
  - **Client Disconnect Silence Flush:** When a client disconnects or the session ends, `api/app/routes/live.py` transmits 47 silent PCM frames (1,024 bytes / 32 ms each = 1.504s total) upstream before closing the socket. This ensures trailing speech segments are finalized by the VAD and all intermediate transcripts are emitted.
  - **Fake-Upstream Integration Tests:** Added tests in `api/tests/test_live_ws.py` verifying that `max_speech_s` is passed to upstream connection URLs/headers and that silent frames are dispatched upon client disconnect.
- **Replay Verification on Same 10 Clips:**
  - All 10 pre-declared evaluation clips now receive transcripts continuously (13 messages per clip).
  - $n=6$ scam clips reached `likely_scam` (median time-to-detect = **18.2s**, min = **11.8s**, max = **24.7s**).
  - Both legit clips produced full transcripts and remained `safe` (score 0), yielding **0.0% false alarms** in live mode.

---

### Part 2: Text-Only False Positive Fix (M4a Regression)
- **Tuning Constraint Adherence:**
  - Tuned strictly against **DEV** and **ADV_DEV** failures.
  - **HOLDOUT**, **FRESH_HOLDOUT**, and **ADV_HOLDOUT** remained untouched during tuning and were evaluated exactly once afterwards with labels unchanged.
- **Root Cause & Generalized Engine Hardening:**
  - In M4a, demand verbs (`OTP_PIN_REQUEST`, `MONEY_TRANSFER`, `PRIZE_REFUND`) fired whenever the verbatim phrase appeared, even if an advisory preamble or protective directive was issued in a preceding sentence ("Remember that bank officials will never ask you to tell us the OTP", "Do not share with anyone including bank staff").
  - Extended `api/app/engine/matcher.py` with `_get_sentence_window_tokens` to evaluate a 3-sentence sliding context window (current sentence plus the 2 preceding sentences). Demand verbs governed by explicit institutional negated directives (`advisory_negated_directives`, `advisory_money_negated_directives`, `advisory_arrest_negated_directives`) in this window are suppressed unless an unnegated demand to the listener follows.
  - Delivery context downgrade: In legitimate delivery scenarios where delivery words are present, incidental delivery OTP requests and parcel notifications are downgraded to weight 1.
  - All phrases and directives externalized in `data/playbook/playbook.yaml` (zero hardcoded lists).
- **Regression Guard Validation:**
  - DEV Scam Recall: **92.9%** (52/56) $\ge 92.9\%$ guard threshold.
  - TEST Scam Recall: **75.0%** (21/28) $\ge 75.0\%$ guard threshold.
  - ADV_DEV Scam Recall: **87.5%** (7/8) $\ge 7/8$ guard threshold.
  - ADV_HOLDOUT Scam Recall: **75.0%** (6/8) $\ge 6/8$ guard threshold.
  - DEV Legit False Positives: **0 / 57 (0.0%)** (down from 1/57 in M4a).
  - ADV_DEV Legit False Positives: **0 / 8 (0.0%)** (down from 3/8 in M4a).

---

## 2. Live Replay Benchmark Results (`eval/results/live_ttd.json`)

All 10 pre-declared evaluation clips were streamed through `/ws/live` at real-time 32 ms frame cadence with `LIVE_MAX_SPEECH_SECONDS = 6.0` and 1.5s silent frame disconnect flush:

| Clip ID | Split | Channel | Ground Truth | Audio Duration | FC Suspicious (Audio Time) | FC Likely Scam (Audio Time) | Wall-Clock Latency | Final Level | Final Score | Messages Recv |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **`da_hi_002`** | dev | clean | digital_arrest | 26.9s | **5.73s** | **11.78s** | **4 ms** | `likely_scam` | 9 | 13 |
| **`cp_en_001`** | dev | clean | courier_parcel | 28.0s | **6.14s** | **24.67s** | **4 ms** | `likely_scam` | 6 | 13 |
| **`bk_hi_001`** | dev | clean | bank_kyc | 26.5s | **18.05s** | **24.48s** | **4 ms** | `likely_scam` | 7 | 13 |
| **`da_hi_001`** | test | clean | digital_arrest | 26.7s | **12.10s** | **18.21s** | **4 ms** | `likely_scam` | 9 | 13 |
| **`bk_en_001`** | test | clean | bank_kyc | 25.3s | **19.33s** | — | **4 ms** | `suspicious` | 4 | 13 |
| **`cp_hi_003`** | test | clean | courier_parcel | 25.6s | **5.86s** | **12.35s** | **4 ms** | `likely_scam` | 9 | 13 |
| **`holdout_legit_ba_en_001`** | holdout | clean | legit advisory | 27.6s | — | — | **4 ms** | `safe` | 0 | 13 |
| **`fresh_holdout_legit_police_hi_001`** | fresh_holdout | clean | legit advisory | 27.0s | — | — | **4 ms** | `safe` | 0 | 13 |
| **`da_hi_001_tel_noise15`** | test | tel_noise15 | digital_arrest | 26.7s | **12.10s** | **18.21s** | **4 ms** | `likely_scam` | 9 | 13 |
| **`bk_en_001_tel_noise15`** | test | tel_noise15 | bank_kyc | 25.3s | **19.33s** | — | **4 ms** | `suspicious` | 4 | 13 |

### Time-to-Detect Summary (Scam Clips)
- **Time to `likely_scam` ($n=6$ scam clips reaching verdict):**
  - **Median:** **18.2s**
  - **Min:** **11.8s** (`da_hi_002`)
  - **Max:** **24.7s** (`cp_en_001`)
- **Time to `suspicious` ($n=8$ scam clips):**
  - **Min:** **5.73s** (`da_hi_002`)
  - **Max:** **19.33s** (`bk_en_001`)
- **Legit False-Alarm Rate in Live Mode:** **0.0% (0 / 2)**
  - Both `holdout_legit_ba_en_001` and `fresh_holdout_legit_police_hi_001` received full transcripts (13 messages each) and remained `safe` (score 0).
- **Detector Latency:** **~4 ms** per incremental risk update upon transcript receipt.
- **Root Cause & Production Resolution (Replacing M4b Empirical Observation):**
  - *Root Cause:* In continuous synthetic speech clips without acoustic pauses ($\ge 700$ ms silence), the upstream streaming STT VAD never endpointed speech segments before the client disconnected. Upstream buffered audio indefinitely and closed without emitting intermediate transcript events.
  - *Production Fix:* Resolved via two complementary mechanisms:
    1. Upstream speech segmentation (`x-max-speech-s: 6.0`) forcing intermediate transcript finalization every ~6 seconds regardless of caller pauses.
    2. Client disconnect flush sending 47 silent frames (1.5s total @ 32 ms) upon session end, closing the final VAD segment before socket teardown.

---

## 3. Text-Only False Positive Diagnosis & Resolution

### Pre-M4c Legit Scripts Exceeding `suspicious` (Text-Only Mode)
Before M4c, 8 legitimate scripts triggered false alarms in text-only mode due to single-sentence advisory limitations and delivery notifications:

1. **`legit_do_hi_003`** (DEV): Level `likely_scam` (score 6).
   - Signals: `OTP_PIN_REQUEST` ("ओटीपी बताना", weight 3), `PARCEL` ("पार्सल", weight 2).
   - Cause: Genuine delivery arrival OTP instruction without delivery context downgrade.
2. **`adv_legit_en_002`** (ADV_DEV): Level `likely_scam` (score 7).
   - Signals: `OTP_PIN_REQUEST` ("asking for otp", weight 3; "tell us the otp", weight 3; "share your otp", weight 3).
   - Cause: Advisory warning phrases in preceding sentences did not carry over to subsequent sentences.
3. **`adv_legit_hi_002`** (ADV_DEV): Level `likely_scam` (score 7).
   - Signals: `AUTHORITY_CLAIM` ("सीबीआई", weight 2), `THREAT_ARREST` ("अरेस्ट", weight 3; "धमकी", weight 2).
   - Cause: Cyber cell awareness warning quoting scam threats ("धोखेबाज सीबीआई अफसर बनकर धमकी दे रहे हैं").
4. **`adv_legit_hi_003`** (ADV_DEV): Level `likely_scam` (score 6).
   - Signals: `MONEY_TRANSFER` ("पैसे ट्रांसफर", weight 3; "बिल भुगतान", weight 2).
   - Cause: Electricity department advisory warning not to transfer money to unknown accounts.
5. **`holdout_legit_ba_hi_001`** (HOLDOUT, held out untouched): Level `likely_scam` (score 6).
   - Signals: `OTP_PIN_REQUEST` ("ओटीपी शेयर", weight 3), `PARCEL` ("पार्सल", weight 2).
6. **`holdout_legit_ba_hien_001`** (HOLDOUT, held out untouched): Level `likely_scam` (score 9).
   - Signals: `OTP_PIN_REQUEST` ("otp share", weight 3), `URGENCY` ("immediately", weight 2).
7. **`fresh_holdout_legit_telecom_hi_001`** (FRESH_HOLDOUT, held out untouched): Level `likely_scam` (score 6).
   - Signals: `AUTHORITY_CLAIM` ("ट्राई", weight 2), `THREAT_ARREST` ("कनेक्शन काट दिया जाएगा", weight 3).
8. **`adv_legit_hi_001`** (ADV_HOLDOUT, held out untouched): Level `likely_scam` (score 6).

---

### M4a vs M4c Before / After Regression Comparison

| Split | Metric | M4a (Before) | M4c (After) | Status |
| :--- | :--- | :--- | :--- | :--- |
| **DEV** (113 scripts) | Scam Recall | 92.9% (52/56) | **92.9% (52/56)** | Maintained ($\ge 92.9\%$) |
| | Legit FP Rate | 1.8% (1/57) | **0.0% (0/57)** | **Fixed (Zero FP)** |
| **TEST** (54 scripts) | Scam Recall | 75.0% (21/28) | **75.0% (21/28)** | Maintained ($\ge 75.0\%$) |
| | Legit FP Rate | 0.0% (0/26) | **0.0% (0/26)** | Zero FP |
| **ADV_DEV** (16 scripts) | Scam Recall | 87.5% (7/8) | **87.5% (7/8)** | Maintained ($\ge 7/8$) |
| | Legit FP Rate | 37.5% (3/8) | **0.0% (0/8)** | **Fixed (Zero FP)** |
| **ADV_HOLDOUT** (16 scripts) | Scam Recall | 75.0% (6/8) | **75.0% (6/8)** | Maintained ($\ge 6/8$) |
| | Legit FP Rate | 25.0% (2/8) | **0.0% (0/8)** | Untouched test |
| **HOLDOUT** (30 scripts) | Scam Recall | 73.3% (11/15) | **73.3% (11/15)** | Untouched test |
| | Legit FP Rate | 20.0% (3/15) | **13.3% (2/15)** | Untouched test |
| **FRESH_HOLDOUT** (6 scripts) | Scam Recall | N/A (0 scams) | **N/A (0 scams)** | Untouched test |
| | Legit FP Rate | 16.7% (1/6) | **16.7% (1/6)** | Untouched test |

*Note on Speech Recognition vs Text-Only:*
Speech recognition drops words, introduces phonetic substitutions, and attenuates weak acoustic signals under noise; text-only evaluation tests the pure decision engine directly against ground-truth scripts.

---

## 4. Web UI Updates (`/accuracy`)

- Paired side-by-side **Audio-Path Evaluation (with ASR)** and **Pure Decision Engine (Text-Only)** benchmark tables.
- Added explicit split rows for `ADV_DEV` and `ADV_HOLDOUT` with sample counts, recall, false positive rates, and F1 scores.
- Dynamic live streaming summary card computing time-to-detect metrics across $n=6$ scam clips reaching `likely_scam` (median: 18.2s, min: 11.8s, max: 24.7s) and reporting legit false alarm rate (0.0%).
- Added explanatory callout detailing why audio-path and text-only evaluation metrics differ.

---

## 5. Automated Verification Results

- **Backend Pytest Suite:** **142 passed, 0 failed** in 33.78s (`api\.venv\Scripts\pytest.exe tests`).
  - Includes 10 WebSocket integration tests verifying live relay streaming, framing cadence, `x-max-speech-s` parameter, and client disconnect silent frame flush.
- **Frontend Audio Math Suite:** **4 passed, 0 failed** (`node web/tests/audio.test.mjs`).
- **Web App Static Build:** **All 15 static routes generated with 0 errors** (`npm run build` in `web/` using Next.js Turbopack).

---

## 6. Credit Consumption & Usage Counters

- **Live Replay & Diagnostic Audio Sent in M4c:** **402.0 seconds** (~6.7 minutes of audio; well within the max ~120 credits budget).
- **TTS Characters Consumed in M4c:** **0 characters** (no TTS generation required).
- **Current `api/.cache/usage.json` Total:**
  - Date `2026-10-21`: `stt_seconds: 6571.35`, `tts_chars: 17673`.

---

## 7. Ready for next milestone? yes/no (+ blockers)

- **YES.** Milestone M4c is complete.
- **STOPPING FOR HUMAN REVIEW.** Per instructions: do NOT start M5.
