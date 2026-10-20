# STATUS — during M0 (blocked on Gnani API key auth) — 2026-10-20 08:58 IST

## Done
- Fixed typo in `SAJAG_SPEC.md` rule 1: referenced section 2 (verified Gnani API reference) as the source of truth for Gnani API facts instead of section 3.
- Added MIT `LICENSE` file with copyright holder Priyanshu Pratik (2026).
- `.env` file was created by human with `GNANI_API_KEY`.
- Ran `scripts/smoke.py` to execute M0 acceptance tests (TTS REST -> STT REST -> STT WebSocket).
- Step (a) TTS REST failed with HTTP 401 Unauthorized (`INVALID_API_KEY`). Stopped immediately as instructed.

## Evidence (real outputs, trimmed, key redacted)
- `git diff SAJAG_SPEC.md`
  ```diff
  -1. **Source of truth order:** (a) this spec, section 3 for all Gnani API facts; (b) the live docs at `https://docs.gnani.ai` (every page is also available as markdown by appending `.md`; the index is `https://docs.gnani.ai/llms.txt`); (c) nothing else.
  +1. **Source of truth order:** (a) this spec, section 2 for all Gnani API facts; (b) the live docs at `https://docs.gnani.ai` (every page is also available as markdown by appending `.md`; the index is `https://docs.gnani.ai/llms.txt`); (c) nothing else.
  ```
- `api\.venv\Scripts\python.exe scripts\smoke.py`
  ```
  === (a) TTS REST ===

  FAILED: RuntimeError: TTS failed after 1.42s: HTTP 401: {"detail": {"error_code": "INVALID_API_KEY", "message": "Unauthorized", "status_code": 401}}

  Usage this run: STT seconds=0.00  TTS characters=61
  SMOKE FAILED
  ```

## Tests
- pytest: 3 passed / 0 failed
- npm build: pass
- npm lint: pass
- smoke test: failed at step (a) TTS REST (HTTP 401)

## Gnani usage this milestone
- STT seconds: 0.0   TTS characters: 0 (request was rejected at auth, zero credits consumed)   (credit change reported by human: n/a)

## Deviations from the spec (and why)
- Used Python 3.13.11 instead of 3.11 or 3.12 (explicitly approved by human).
- Fixed section reference in rule 1 of `SAJAG_SPEC.md` (section 3 -> section 2).

## Doc differences found (live docs vs spec)
- Detailed comparison table recorded in `docs/GNANI_API_NOTES.md`.

## Dependencies added (name==version — reason)
- No new dependencies added in this step.

## Open questions for the human
1. **BLOCKER for M0 smoke test:** The API key in `.env` was rejected by Gnani (`https://api.vachana.ai/api/v1/tts/inference`) with:
   ```json
   {"detail": {"error_code": "INVALID_API_KEY", "message": "Unauthorized", "status_code": 401}}
   ```
   Inspection shows the key currently in `.env` is 8 characters long. Please verify the API key generated from the Gnani Voice dashboard at `https://app.gnani.ai/voice`. Make sure the full key without surrounding quotes or placeholders is pasted into `.env`:
   ```
   GNANI_API_KEY=<full-key-from-app.gnani.ai>
   ```
   Once updated, let me know and I will re-run `scripts/smoke.py`.

## Ready for next milestone? no (blocked on valid GNANI_API_KEY)
- Blocked on step 3 of M0: `scripts/smoke.py` requires a valid key to verify TTS REST, STT REST, and STT WebSocket streaming. M0.5 will start immediately once the smoke test succeeds.
