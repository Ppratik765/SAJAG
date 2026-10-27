# STATUS — Milestone M5 In Progress (Part 0 Complete) — 2026-10-27 IST

## 1. M5 Part 0 Summary & Objectives Completed

Milestone M5 begins with Part 0 (M4 cleanup, replay pacing fix, wall-clock alert times, holdout hygiene, and final holdout script creation):

### Part 0.1: Replay Pacing Fix & Cadence Measurement
- **Absolute Deadline Pacing:** Fixed `scripts/live_replay.py` to pace frame delivery strictly using absolute timestamps (`loop.time() >= t0 + n * 0.032`), replacing naive relative `sleep(0.032)`.
- **Measured Replay Pacing:**
  - `send_duration / audio_duration` ratio: **0.9988 – 0.9991** across all clips (flawless 1.0x real-time pacing).
  - Max frame lateness: **18.1 ms – 45.4 ms** (at most 0 to 2 frames per ~800 frames experienced OS scheduling delays $\ge 32$ ms).
- **Browser AudioWorklet Pacing Measurement:**
  - Inspected `web/public/worklets/pcm-worklet.js` and `web/src/app/live/page.tsx`.
  - The browser microphone stream is driven directly by Web Audio API hardware clock callbacks (`process()` invoked every 128 samples at 16 kHz = 8.0 ms).
  - The `Framer` batches 4 callbacks into 512 samples (1,024-byte PCM16) every 32.0 ms audio time. Because this is locked to the audio DAC/ADC hardware clock, hardware frame timing has **zero drift** over time.

### Part 0.2: Wall-Clock Alert Delay Decomposition & Upstream STT Latency
- **User-Felt Alert Delay:** Detection updates occur once per speech segment (~6.0 seconds of audio per segment). The wall-clock alert delay experienced by the user is:
  $$\text{Wall Alert Delay} = \text{Speech Segment Duration (~6.0s)} + \text{Upstream STT Latency (~146 ms)} + \text{Detector Engine Latency (~4 ms)}$$
- **Measured Latencies:**
  - Upstream STT latency: Mean **~146 ms** (range **73 ms – 185 ms**, recorded from upstream `transcript` event metadata).
  - Local engine latency: **~4 ms** per incremental update on packet arrival.
- **Alert Times Across Scam Clips Reaching Verdict ($n=6$):**
  - **First-Crossed Likely Scam (Wall-Clock):** Median **18.8s** (min 12.6s, max 28.9s).
  - **First-Crossed Likely Scam (Audio Time):** Median **18.2s** (min 11.8s, max 24.7s).
  - **First-Crossed Suspicious (Wall-Clock):** Min **6.3s**, max **27.1s**.
  - **First-Crossed Suspicious (Audio Time):** Min **5.7s**, max **12.5s**.

### Part 0.3: Live Replay Table (Re-run on 10 Clips)

| Clip ID | Split | Channel | Ground Truth | Audio Dur | Audio Susp / Scam | Wall Susp / Scam | Final Level | Score | STT Latency | Pacing Ratio |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **`da_hi_002`** | dev | clean | digital_arrest | 26.9s | 5.7s / 11.8s | **6.3s / 14.1s** | `scam` | 16 | 134 ms | 0.9991 |
| **`cp_en_001`** | dev | clean | courier_parcel | 28.0s | 6.1s / 24.7s | **6.6s / 25.8s** | `likely_scam` | 10 | 145 ms | 0.9990 |
| **`bk_hi_001`** | dev | clean | bank_kyc | 26.5s | 12.5s / 24.5s | **27.1s / 28.9s** | `likely_scam` | 10 | 178 ms | 0.9988 |
| **`da_hi_001`** | test | clean | digital_arrest | 26.7s | 6.2s / 18.2s | **12.1s / 18.6s** | `scam` | 16 | 158 ms | 0.9991 |
| **`bk_en_001`** | test | clean | bank_kyc | 25.3s | — / — | **— / —** | `safe` | 0 | 148 ms | 0.9991 |
| **`cp_hi_003`** | test | clean | courier_parcel | 25.6s | 6.2s / 12.3s | **7.1s / 12.6s** | `scam` | 16 | 142 ms | 0.9991 |
| **`holdout_legit_ba_en_001`** | holdout | clean | legit advisory | 27.6s | — / — | **— / —** | `safe` | 0 | 155 ms | 0.9990 |
| **`fresh_holdout_legit_police_hi_001`** | fresh_holdout | clean | legit advisory | 27.0s | — / — | **— / —** | `safe` | 0 | 138 ms | 0.9991 |
| **`da_hi_001_tel_noise15`** | test | tel_noise15 | digital_arrest | 26.7s | 6.2s / 18.2s | **6.6s / 18.9s** | `scam` | 16 | 144 ms | 0.9991 |
| **`bk_en_001_tel_noise15`** | test | tel_noise15 | bank_kyc | 25.3s | — / — | **— / —** | `safe` | 0 | 128 ms | 0.9991 |

- **Legit False Alarm Rate (Live):** **0.0% (0 / 2)**.
- **Credits for Part 0 Replay Run:** `stt_seconds = 353.36 s`, `tts_chars = 0`.

### Part 0.4: Holdout Hygiene
- During M4c tuning, failed signals in `adv_holdout`, `holdout`, and `fresh_holdout` were inspected.
- `adv_holdout` is officially relabeled across the codebase, documentation, and UI as:
  **`adv_holdout (contaminated after M4c)`**
- Clean M4a numbers are preserved as the definitive uncorrupted evaluation:
  - Recall: **75.0% (6/8)**
  - False Positives: **25.0% (2/8)**
  - F1: **0.750**
- The post-M4c 0/8 FP rate is explicitly documented as non-independent.
- Untouched holdout splits (`holdout` 2/15 FP, `fresh_holdout` 1/6 FP) remain visible and reported.

### Part 0.5: Fresh Final Holdout Test Set (Untouched Until Part 5)
Created 10 new ground-truth evaluation scripts in `data/corpus/scripts/`:
1. `final_holdout_scam_hi_001.yaml` (Hindi, courier parcel scam disguised as official customs query)
2. `final_holdout_scam_en_001.yaml` (English, bank KYC scam disguised as security verification)
3. `final_holdout_scam_hien_001.yaml` (Hinglish, digital arrest scam with court order threats)
4. `final_holdout_scam_hi_002.yaml` (Hindi, electricity utility disconnect scam demanding immediate bill app download)
5. `final_holdout_scam_en_002.yaml` (English, UPI refund scam claiming wrong payment reversal)
6. `final_holdout_legit_hi_001.yaml` (Hindi, genuine police cyber cell advisory warning)
7. `final_holdout_legit_hi_002.yaml` (Hindi, genuine bank security team security advisory)
8. `final_holdout_legit_en_001.yaml` (English, genuine courier parcel tracking delay notification)
9. `final_holdout_legit_en_002.yaml` (English, genuine electricity board scheduled maintenance update)
10. `final_holdout_legit_hien_001.yaml` (Hinglish, genuine university examination fee deadline alert)

All 10 scripts are labeled `split: final_holdout`. They are **completely unrun and untouched** and will remain so until the engine is frozen in Part 5.

---

## 2. M5 Part 1 Summary & Objectives Completed

Milestone M5 Part 1 implements warning templates, voices, `/api/tts/warning`, audio baking, and review documentation:

### Part 1.1: Warning Templates & Voices
- Created `api/app/config/warnings.yaml` per spec 4.6:
  - Both `hi-IN` and `en-IN` set to `reviewed: false` until human review.
  - Verbatim seed texts used for `alert_scam` and `alert_suspicious`.
  - Added 1 `explain` line per scam type in `playbook.yaml` (9 types total: `digital_arrest`, `bank_kyc`, `courier_parcel`, `lottery_prize`, `upi_refund`, `utility_disconnect`, `tech_support_remote`, `family_emergency`, `investment_task`).
  - No digits in spoken text: helpline spelled as words ("one nine three zero" / "एक नौ तीन शून्य").
- Voices configured in `api/app/config/voices.py`: hi-IN `Chitra`, en-IN `Kaveri`.

### Part 1.2: `POST /api/tts/warning` Endpoint & Validation Tests
- Implemented in `api/app/routes/tts.py` and mounted to FastAPI `app` in `api/app/main.py`:
  - Body `{kind, scam_type, language_code}`.
  - Strictly rejects free text and extra fields with HTTP 400 (`extra_fields_forbidden`).
  - Rejects invalid kinds, unknown scam types, and unsupported languages with HTTP 400.
  - In-memory per-IP sliding window rate limiter: 5 requests per 60 seconds (HTTP 429 when exceeded).
  - Enforces daily TTS budget check (HTTP 503 `budget_exhausted` when cap reached).
  - Content-addressed disk cache (`api/.cache/tts/{hash}.mp3`): cache hits return `X-Cache: HIT` with 0 credits consumed.
- Pytest suite in `api/tests/test_warning_tts.py`: **7 passed, 0 failed**.

### Part 1.3: Audio Baking & Human Review Catalog
- Implemented `scripts/bake_warnings.py` and executed once:
  - Total files generated: **22 files** (11 in `web/public/audio/warnings/hi-IN/`, 11 in `.../en-IN/`).
  - Total audio payload size: **1,140.0 KB** (1,167,360 bytes).
  - TTS characters consumed: **2,594 characters** (exact match with projection; well under the 8,000 char cap).
- Created `docs/WARNING_REVIEW.md` cataloging all 22 audio files with exact spoken text, duration, size, and human verdict review column.

### Claims for the Human to Verify
1. **Digital Arrest (`digital_arrest`):** Real police, CBI, or court officials never conduct arrests, trials, or demand money/verification fees over video calls.
2. **Helpline Number:** The national cyber-crime helpline is one nine three zero (`1930` / एक नौ तीन शून्य).
3. **Banking & KYC (`bank_kyc`):** Genuine bank officials never call to ask for OTPs, ATM PINs, UPI PINs, or passwords to update KYC records or prevent account closure.
4. **UPI Refunds (`upi_refund`):** Users never need to enter a UPI PIN or scan a QR code to receive money or refunds; PIN is solely required for outgoing payments.
5. **Remote Access Apps (`tech_support_remote`):** Legitimate customer support teams never ask users to install third-party remote screen-sharing tools like AnyDesk to resolve billing or delivery issues.
6. **Utility Bills (`utility_disconnect`):** Electricity or water supply departments never threaten immediate same-day line disconnection demanding immediate app downloads or direct transfers to personal numbers.
7. **Lottery & Prizes (`lottery_prize`):** Legitimate lotteries or gift schemes do not require advance tax or processing fees to release winnings.

---

## 3. Automated Verification Results
- **Backend Pytest Suite:** **149 passed, 0 failed** in 7.42s (including 7 new `/api/tts/warning` tests).
- **Web App Static Build:** All 15 static routes compiled cleanly with 0 errors via `npm run build` (Next.js Turbopack).

---

## 4. Cumulative Credit Usage
- **M5 Part 0 STT Seconds Consumed:** **353.36 s** (Replay run across 10 clips).
- **M5 Part 0 TTS Characters Consumed:** **0 characters**.
- **M5 Part 1 TTS Characters Consumed:** **2,594 characters** (Projected: 2,594 characters; Hard cap: 8,000 characters).
- **api/.cache/usage.json Snapshot (2026-10-27):**
  - `stt_seconds: 402.92`
  - `tts_chars: 2662`
