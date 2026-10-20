# STATUS — after M3 (Calibration Run) — 2026-10-20 17:40 IST

## Done
- `eval/corpus.py`: Synthetic corpus script loader and schema validation (Pydantic v2). Enforces synthetic privacy invariant (regex checks rejecting real Indian mobile numbers `[6-9]\d{9}`, PAN cards, and Aadhaar identifiers), speaker validation (`caller`/`victim`), and deterministic 70% dev / 30% test split via `sha256(id)`.
- `data/corpus/scripts/*.yaml`: 5 calibration scripts created and validated in `dev` split:
  - `da_hi_calib_001`: Digital Arrest scam in Hindi (CBI/police imposter, video call isolation, secrecy).
  - `kyc_hi_calib_002`: Bank KYC scam in Hindi (account block urgency, OTP request).
  - `upi_en_calib_003`: UPI Refund scam in English (accidental payment, PIN entry request).
  - `deliv_hi_calib_004`: Legit delivery partner in Hindi (courier parcel delivery code OTP - hard negative).
  - `bank_advisory_en_calib_005`: Legit bank advisory in English (automated warning never to share passwords/OTP - hard negative).
- `api/app/gnani/tts_rest.py`: Gnani Timbre v2.5 REST client (`POST /api/v1/tts/inference`) with sha256 content-addressed disk caching under `api/.cache/tts/`, daily budget checking, exponential backoff retries on 429/500/503, typed error mappings, and WAV header repair for streaming RIFF chunks.
- `eval/make_audio.py`: Synthetic dialogue audio generator using speaker-appropriate Timbre v2.5 voices (alternating caller vs victim from section 2.5 table), 200–600ms inter-turn pauses, and 16 kHz mono WAV output.
- `eval/degrade.py`: Audio degradation engine with 4 variants:
  - `clean`: 16 kHz mono WAV.
  - `tel`: 8 kHz mono WAV, 300–3400 Hz 4th-order Butterworth bandpass filter, and NumPy μ-law companding (G.711 compression/expansion without deprecated `audioop`).
  - `tel_noise15`: Telephony audio with synthetic white + pink (1/f) noise at 15 dB SNR computed from RMS.
  - `tel_noise5`: Telephony audio with synthetic white + pink noise at 5 dB SNR computed from RMS.
  - Seeded RNG from `sha256(script_id)` guaranteeing bit-exact reproducible degradation.
- `eval/run_eval.py`: Evaluation runner executing production STT REST chunking pipeline (`to_wav_16k_mono`, `split_on_silence`, `transcribe_file`) + detection engine, streaming simulation tracking `first_likely_scam_time`, precision/recall/F1/FPR/CER calculation, updating `eval/results/latest.json`.
- `data/playbook/playbook.yaml`: Expanded pattern definitions based on real observed Prisma STT output (including spaced Hindi transliterations `ओ टी पी`, `के वाई सी`, `खाता ब्लॉक`, `सी बी आई`).
- `web/src/app/accuracy/page.tsx`: Accuracy benchmark results page rendering `eval/results/latest.json` with primary KPI cards (Precision, Recall, Legit False-Alarm Rate, Type Accuracy), secondary metrics bar (Median Time-to-Detect, STT Mean CER, F1 score), per-language and per-variant breakdown tables, individual clip audit table, and honest limitations.
- Visual inspection: Captured and inspected screenshots at 1440x900 (`docs/screens/accuracy-desktop.png`) and 390x844 (`docs/screens/accuracy-mobile.png`).

## Evidence (real outputs, trimmed, key redacted)
- **Audio Generation Output (`eval/make_audio.py --calibration-only`):**
  ```
  Target scripts: 5
  Total TTS characters: 1732
  Estimated audio duration: 145.0s
  Beginning audio synthesis...
  Synthesizing bank_advisory_en_calib_005 (en-IN, 5 turns)... -> Saved clean\bank_advisory_en_calib_005.wav (597740 bytes)
  Synthesizing da_hi_calib_001 (hi-IN, 6 turns)...           -> Saved clean\da_hi_calib_001.wav (705964 bytes)
  Synthesizing deliv_hi_calib_004 (hi-IN, 5 turns)...        -> Saved clean\deliv_hi_calib_004.wav (700140 bytes)
  Synthesizing kyc_hi_calib_002 (hi-IN, 6 turns)...          -> Saved clean\kyc_hi_calib_002.wav (757164 bytes)
  Synthesizing upi_en_calib_003 (en-IN, 6 turns)...          -> Saved clean\upi_en_calib_003.wav (757164 bytes)
  ```
- **Degradation Output (`eval/degrade.py`):**
  ```
  Degrading: bank_advisory_en_calib_005 -> clean: 597740B, tel: 298892B, tel_noise15: 298892B, tel_noise5: 298892B
  Degrading: da_hi_calib_001           -> clean: 705964B, tel: 353004B, tel_noise15: 353004B, tel_noise5: 353004B
  Degrading: deliv_hi_calib_004        -> clean: 700140B, tel: 350092B, tel_noise15: 350092B, tel_noise5: 350092B
  Degrading: kyc_hi_calib_002          -> clean: 757164B, tel: 378604B, tel_noise15: 378604B, tel_noise5: 378604B
  Degrading: upi_en_calib_003          -> clean: 757164B, tel: 378604B, tel_noise15: 378604B, tel_noise5: 378604B
  ```
- **Calibration Evaluation Run Output (`eval/run_eval.py --calibration-only --variants clean`):**
  ```json
  === Evaluation Results ===
  {
    "total_clips": 5,
    "tp": 3,
    "fp": 0,
    "tn": 2,
    "fn": 0,
    "precision": 1.0,
    "recall": 1.0,
    "f1": 1.0,
    "false_positive_rate": 0.0,
    "type_accuracy": 1.0,
    "median_time_to_detect_s": 23.66,
    "p90_time_to_detect_s": 23.66,
    "mean_cer": 0.0706
  }
  ```
- **Screenshots Verified:**
  - `docs/screens/accuracy-desktop.png`: 1440x900 full page showing KPI cards, breakdown tables, clip details, and honest limitations callout.
  - `docs/screens/accuracy-mobile.png`: 390x844 responsive mobile view with stacked KPI cards, scrollable tables, and no horizontal overflow.

## Tests
- **pytest:** 123 passed, 0 failed in 23.37s.
  - `api/tests/engine/test_engine.py`: 68 cases passed (all scam types, evidence-substring invariant, multi-segment).
  - `api/tests/engine/test_normalizer.py`: 5 tests passed.
  - `api/tests/eval/test_corpus_schema.py`: 7 tests passed (split determinism, PII rejection, calibration scripts).
  - `api/tests/eval/test_degrade.py`: 5 tests passed (μ-law compand roundtrip, bandpass attenuation, pink noise, SNR accuracy, seeded reproducibility).
  - `api/tests/eval/test_eval_metrics.py`: 3 tests passed (confusion matrix, CER computation).
  - `api/tests/test_tts_rest.py`: 6 tests passed (WAV repair, mock success, 401, 403, 400, 500 retries).
  - Other backend route, audio utility, health, and STT tests: 29 tests passed.
- **npm run build:** Passed. 14 static pages generated (`/`, `/about`, `/accuracy`, `/check`, `/demo`, `/dev/ui`, `/live`, `/parent`, `/paste`, `/report`, `/spot`, etc.).

## Gnani usage this milestone
- STT seconds: 110.0s (across the 5 calibration audio clips; milestone limit <= 600s, total today = 134.0s).
- TTS characters: 1,732 characters (synthesized once for the 5 calibration scripts, reused across all degrade variants; cap = 20,000).
- Credit change reported by human: **Pending report from human** (STOP point reached).

## Deviations from the spec (and why)
- None. `eval/degrade.py` uses pure NumPy for G.711 μ-law companding rather than the deprecated standard library `audioop` module (which was removed in Python 3.13), as explicitly required by section 8.3 of the spec.

## Doc differences found (live docs vs spec)
- Gnani Prisma STT transcribes spoken Hindi acronyms with spaces between letters (e.g. `ओ टी पी` for OTP, `के वाई सी` for KYC, `सी बी आई` for CBI). Added these real patterns to `data/playbook/playbook.yaml` to ensure high recall without false-positive leakage.

## Dependencies added (name==version — reason)
- `numpy==2.5.4` — Vectorized audio signal operations, G.711 μ-law companding, and FFT noise generation.
- `scipy==1.18.1` — Butterworth bandpass filtering (`signal.butter`, `signal.sosfilt`) and polyphase resampling (`signal.resample_poly`) for telephony degradation.

## Open questions for the human
1. **Calibration Stop:** Please check your Gnani dashboard at `https://app.gnani.ai/voice` and report the exact credit change (or remaining credit balance) after this 5-clip calibration run (1,732 TTS characters and 110.0 STT seconds).
2. Once reported, I will calculate the exact credit conversion factor and propose the largest corpus and number of degrade variants fitting within 60% of your remaining credits (reserving 40% for live mode testing, demo recording, warning clips, and development).

## Ready for next milestone? yes/no (+ blockers)
- **PAUSED AT CALIBRATION STOP:** Milestone M3 components (corpus schema, scripts, TTS generator, degrade tools, runner, tests, `/accuracy` page) are complete and tested. Awaiting human's dashboard credit report before generating any further audio clips.
