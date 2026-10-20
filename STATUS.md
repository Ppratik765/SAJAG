# STATUS — after M0 — 2026-10-20 09:12 IST

## Done
- Machine check executed: OS Windows 11 Home, git 2.52.0, node v25.7.0, npm 11.10.1, ffmpeg 9.0.2.
- Git repository initialized on `main` tracking remote `https://github.com/Ppratik765/SAJAG`.
- Added build specification (`SAJAG_SPEC.md`), fixed rule 1 typo referencing section 2 as API source of truth.
- Added MIT `LICENSE` file (copyright Priyanshu Pratik 2026).
- Python virtual environment created at `api/.venv` using Python 3.13.11.
- Backend dependencies installed and pinned in `api/requirements.txt` and `api/requirements-lock.txt`.
- Minimal FastAPI backend with `/healthz` and origin-validated CORS (`api/app/main.py`).
- Backend unit tests passing with pytest (`api/tests/test_health.py`).
- Frontend scaffolded with Next.js 16.4.2 (App Router, TypeScript, Tailwind CSS).
- Exact frontend dependencies pinned in `web/package.json`.
- Health check page created at `web/src/app/page.tsx` and `web/src/app/api-health.tsx`; `npm run build` and `npm run lint` passing.
- Gnani documentation re-verified against live Mintlify docs, differences recorded in `docs/GNANI_API_NOTES.md`.
- Full smoke test script (`scripts/smoke.py`) executed with human's `GNANI_API_KEY`:
  - TTS REST: synthesized 16 kHz mono WAV with Timbre v2.5 (`Chitra`, `hi-IN`).
  - STT REST: transcribed audio with Prisma v2.5 (`hi-IN`).
  - STT WebSocket: streamed raw PCM in 1,024-byte binary frames at 32 ms real-time cadence and received `connected`, `speech_start`, and `transcript` events.
- Observed API shapes, latencies, and behaviors recorded in `docs/GNANI_API_NOTES.md`.

## Evidence (real outputs, trimmed, key redacted)
- `api\.venv\Scripts\python.exe scripts\smoke.py`
  ```
  === (a) TTS REST ===
  status=200 latency=1.09s content-type=audio/wav bytes=122924
  wav: rate=16000 channels=1 sample_width=2 duration=3.84s -> scripts\out\smoke_tts_hi.wav

  === (b) STT REST ===
  status=200 latency=0.33s keys={'success': 'bool', 'request_id': 'str', 'transcript': 'str', 'model': 'str', 'processing_time': 'float', 'end_to_end_latency': 'float'}
  success=True model=gnani-prisma-v2.5 transcript='नमस्ते, यह सजग प्रणाली का परीक्षण है, कृपया सतर्क रहें।'

  === (c) STT WebSocket ===
  frames=167 (incl. 47 zero frames) streamed_audio=5.34s
    +  0.49s  {"type": "connected", "message": "STT service ready — VAD service connected", "request_id": "<redacted>", "config": {"sample_rate": 16000, "chunk_size": 512, "partials_enabled": false, "partial_interval_ms": 450, "partial_max_window_s": 15.0, "language_code": "hi-IN", "format": "verbatim"}, "timestamp": "2026-10-20T03:40:10.811545+00:00"}
    +  0.77s  {"type": "speech_start", "utterance_id": "ud1827e1b", "timestamp": "2026-10-20T03:40:11.095231+00:00"}
    +  4.86s  {"type": "transcript", "text": "नमस्ते, यह सजग प्रणाली का परीक्षण है, कृपया सतर्क रहें।", "audio_duration_ms": 4288.0, "segment_id": "<redacted>", "segment_index": 1, "utterance_id": "ud1827e1b", "is_final": true, "latency": 86, "timestamp": "2026-10-20T03:40:15.182238+00:00"}

  Usage this run: STT seconds=9.18  TTS characters=55
  SMOKE OK
  ```
- `api\.venv\Scripts\python.exe -m pytest -q`
  ```
  ...                                                                      [100%]
  3 passed, 1 warning in 1.10s
  ```
- `npm --prefix web run build`
  ```
  ✓ Compiled successfully in 1286ms
  Finished TypeScript in 3.4s ...
  ✓ Generating static pages using 5 workers (4/4) in 1445ms
  Finalizing page optimization ...

  Route (app)
  ┌ ○ /
  └ ○ /_not-found
  ○  (Static)  prerendered as static content
  ```

## Tests
- pytest: 3 passed / 0 failed
- npm build: pass
- npm lint: pass
- smoke test: pass on all 3 steps (TTS REST, STT REST, STT WebSocket)

## Gnani usage this milestone
- STT seconds: 9.18   TTS characters: 55   (credit change reported by human: pending human report)

## Deviations from the spec (and why)
- Used Python 3.13.11 instead of 3.11/3.12 (explicitly approved by human).
- Corrected rule 1 in `SAJAG_SPEC.md` from "section 3" to "section 2" as source of truth for Gnani API reference.
- Timbre WAV audio includes streaming `0xFFFFFFFF` placeholder header lengths; `scripts/smoke.py` patches sizes on save so standard WAV decoders correctly read `duration=3.84s`.

## Doc differences found (live docs vs spec)
- Detailed comparison table recorded in `docs/GNANI_API_NOTES.md`.
- STT REST returns additional fields: `"model": "gnani-prisma-v2.5"`, `"processing_time"`, and `"end_to_end_latency"`.
- STT WebSocket emits an intermediate `speech_start` event with `utterance_id` when speech begins.
- STT WebSocket `transcript` event includes `utterance_id` and `is_final: true`.

## Dependencies added (name==version — reason)
Backend:
- `fastapi==0.149.0` — REST and WebSocket web framework
- `uvicorn[standard]==0.54.0` — ASGI server
- `httpx==0.28.1` — HTTP client for Gnani REST endpoints
- `websockets==17.3` — WebSocket client for real-time STT streaming
- `pytest==9.1.1` — Test framework

Frontend:
- `next==16.4.2` — React web framework
- `react==19.3.0`, `react-dom==19.3.0` — UI runtime
- `@tailwindcss/turbopack==4.3.3`, `tailwindcss==4.3.3` — CSS styling
- `typescript==5.9.3` — Type checking
- `eslint==9.39.5`, `eslint-config-next==16.4.2` — Linting

## Open questions for the human
- None for M0. Ready to execute M0.5.

## Ready for next milestone? yes
- Milestone M0 is complete. Proceeding immediately to Milestone M0.5 (Design system and app shell).
