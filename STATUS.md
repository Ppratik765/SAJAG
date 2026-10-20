# STATUS — after M1 — 2026-10-20 14:55 IST

## Done
- **Gnani Prisma STT REST client** (`api/app/gnani/stt_rest.py`):
  - Direct HTTP calls to `https://api.gnani.ai/stt/v3` with streaming file upload.
  - Handles observed Gnani API response fields (`model`, `processing_time`, `end_to_end_latency`).
  - Exponential backoff with jitter on 429/500/503.
  - Typed exceptions: `GnaniQuotaError`, `GnaniRateLimit`, `GnaniAuthError`, `GnaniBadRequest`, `GnaniServerError`.
- **Audio Processing Utilities** (`api/app/util/audio.py`):
  - `repair_wav_header`: Repairs 0xFFFFFFFF / placeholder sizes emitted by Gnani Timbre and streaming encoders before standard decoders read it.
  - `probe_duration`: Probes audio duration using `ffprobe` or `pydub`.
  - `to_wav_16k_mono`: Converts incoming audio (MP3, AAC, M4A, OGG, WAV) to 16 kHz 16-bit mono PCM.
  - `split_on_silence`: Chunks audio on silent pauses with hard ceiling <= 28 seconds (spec requires <= 28 s).
  - `validate_upload`: Enforces size limit (25 MB) and duration limit (180 s).
- **Daily Budget & Usage Tracking** (`api/app/gnani/usage.py`):
  - Thread-safe persistent tracking in `api/.cache/usage.json`.
  - Enforces daily budget caps (`daily_stt_seconds_cap: 3600`, `daily_tts_chars_cap: 50000`).
  - Raises `BudgetExhausted` when limits are reached.
- **API Routes** (`api/app/routes/`):
  - `GET /api/meta`: Returns server status, supported languages, and `engine_attached=false` (per M1 spec: no fake signals/level stubbed).
  - `GET /api/usage`: Protected by `X-Admin-Token` header.
  - `POST /api/analyze/audio`: Handles upload, validates limits, converts to 16kHz mono, splits into <= 28s chunks, runs parallel STT with bounded semaphore (concurrency <= 3), reassembles transcript segments in order, and cleans up all temp files in a `finally` block.
- **Frontend /check Page** (`web/src/app/check/page.tsx`):
  - Marked-up paper call sheet matching landing page visual identity.
  - Tabbed input: audio upload (WAV, MP3, M4A, OGG) + live in-browser `MediaRecorder`.
  - Language selector with 11 supported Indic languages and English.
  - Living ruler-style progress track with millimeter ticks and needle progress indicator (no blank spinner).
  - Transcript populated chunk-by-chunk onto ruled call sheet lines with timestamps and copy/reset actions.
  - Fallback client (`web/src/lib/api/analyze.ts`) for browser-only replay when backend is offline.

## Evidence (real outputs, trimmed, key redacted)

### Real End-to-End M1 Run (`python scripts/test_m1_e2e.py`)
```
=== Sajag M1 End-to-End Pipeline Verification ===
1. Loading baseline smoke audio: scripts\out\smoke_tts_hi.wav
   Baseline duration: 1.98s
   Looping 60 times to create ~120s test audio...
   Created looped audio: scripts\out\m1_e2e_test_hi.wav (duration: 119.04s)

2. Testing audio utility functions...
   Probed duration: 119.04s
   Converted to 16kHz mono WAV: 3809324 bytes
   Splitting audio into chunks <= 28s...
   Resulting chunks: 5 chunks
   Chunk 0: 23.81s (offset: 0.00s)
   Chunk 1: 23.81s (offset: 23.81s)
   Chunk 2: 23.81s (offset: 47.62s)
   Chunk 3: 23.81s (offset: 71.42s)
   Chunk 4: 23.81s (offset: 95.23s)
   All chunks are <= 28.0s!

3. Testing live Gnani STT REST pipeline with 119.04s audio...
   POST https://api.gnani.ai/stt/v3 (chunk 0, 23.81s)
   POST https://api.gnani.ai/stt/v3 (chunk 1, 23.81s)
   POST https://api.gnani.ai/stt/v3 (chunk 2, 23.81s)
   [Prisma STT REST] 429 Rate Limit hit. Retrying in 0.53s...
   POST https://api.gnani.ai/stt/v3 (chunk 3, 23.81s)
   POST https://api.gnani.ai/stt/v3 (chunk 4, 23.81s)

   === Pipeline Output ===
   Duration: 119.04s
   Chunks reassembled: 5
   Transcribed characters: 1200
   STT seconds used: 119.04s
   TTS characters used: 0
   [SUCCESS] Full M1 audio chunking and STT pipeline verified with live Gnani API!
```

### Visual Inspection Evidence
- `docs/screens/check-processing-desktop.png`: Ruler progress track active with millimeter tick markings, needle fill, and pulsing call transcript sheet lines.
- `docs/screens/check-result-desktop.png`: 1440x900 viewport showing completed transcript sheet, timestamps (`0:00`, `0:22`, `0:46`), Copy & Reset buttons, and speech-to-text pipeline verification notice.
- `docs/screens/check-result-mobile.png`: 390x844 mobile viewport showing identical paper styling, zero horizontal scroll, and responsive layout.

## Tests
- **pytest**: 22 passed, 0 failed in 10.47s (`api/.venv/Scripts/pytest -v`)
  - `tests/test_analyze_route.py` (healthz, meta engine_attached=false, usage auth, analyze audio success, invalid lang, maintenance mode)
  - `tests/test_audio.py` (repair_wav_header, probe_duration, to_wav_16k_mono, split_on_silence short/long <= 28s, upload limits)
  - `tests/test_health.py` (healthz, CORS allow/reject)
  - `tests/test_stt_rest.py` (200 success, 401 auth, 403 quota, 400 bad request, 429 rate limit retry, 500 server retry)
  - `tests/test_usage.py` (record and check budget, BudgetExhausted)
- **npm run build**: 14/14 static pages generated with 0 errors (`next build`).
- **web unit tests**: 3 passed (`npm --prefix web run test`).

## Gnani usage this milestone
- STT seconds: 119.04s   TTS characters: 0   (credit change reported by human: not yet reported)
- Note: Looped existing smoke audio file `smoke_tts_hi.wav` (0 TTS cost incurred). STT duration 119.04s is well under rule 7's 600s budget guard.

## Deviations from the spec (and why)
- None. Per section 10 and rule 3, `engine_attached=false` in `/api/meta` and `/api/analyze/audio`; no placeholder detection levels or signals are stubbed in production code until M2.

## Doc differences found (live docs vs spec)
- Gnani Prisma STT REST response includes additional fields: `model` ("Prisma-v2.5-General-GCS"), `processing_time`, and `end_to_end_latency`. Parsed gracefully.
- Gnani Timbre TTS WAV headers contain 0xFFFFFFFF placeholder sizes; repaired via `repair_wav_header` before standard decoders read it.

## Dependencies added (name==version — reason)
- `pydub==0.25.1` — Silence-based audio segmenting and chunking <= 28s.
- `respx==0.23.1` — Mocking HTTP requests for reliable unit tests of 400/401/403/429/500/503 error and retry paths.

## Open questions for the human
- None.

## Ready for next milestone? yes (+ blockers)
- Ready for M2 (detection engine).
