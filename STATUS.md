# STATUS — during M0 (blocked at smoke test) — 2026-10-20 00:39 IST

## Done
- Section 0.1 machine check executed and recorded.
- `git init -b main` initialized; remote `origin` set to `https://github.com/Ppratik765/SAJAG`.
- First commit pushed with `SAJAG_SPEC.md`.
- `.gitignore` created and pushed.
- Python venv created at `api/.venv` using Python 3.13 (approved by human).
- Backend dependencies installed and pinned in `api/requirements.txt` and `api/requirements-lock.txt`.
- Minimal FastAPI backend created (`api/app/main.py`) with `/healthz` and CORS from `ALLOWED_ORIGINS`.
- Backend tests created (`api/tests/test_health.py`) testing `/healthz` and CORS behavior.
- Frontend scaffolded with Next.js 16.4.2, TypeScript, Tailwind CSS, App Router.
- Exact frontend dependencies pinned in `web/package.json`.
- Minimal frontend page (`web/src/app/page.tsx` and `web/src/app/api-health.tsx`) checking `/healthz`.
- Repository layout directories created with `.gitkeep`.
- Gnani live documentation fetched and re-verified against spec; findings documented in `docs/GNANI_API_NOTES.md`.
- Smoke test script created in `scripts/smoke.py` implementing TTS REST -> STT REST -> STT WebSocket streaming.
- `.env.example` created.
- Stub `README.md` created.
- Scaffold committed and pushed to `origin/main` (`m0: scaffold backend, frontend, docs, and smoke test`).
- Stopped at smoke test because `.env` with `GNANI_API_KEY` is not created yet.

## Evidence (real outputs, trimmed, key redacted)
- `git status`
  ```
  On branch main
  Your branch is up to date with 'origin/main'.
  nothing to commit, working tree clean
  ```
- `git log --oneline`
  ```
  848c450 m0: scaffold backend, frontend, docs, and smoke test
  374355b chore: add .gitignore
  57d16fa chore: add build spec
  ```
- `api\.venv\Scripts\python.exe -m pytest -q`
  ```
  ...                                                                      [100%]
  3 passed, 1 warning in 1.10s
  ```
- `npm --prefix web run build`
  ```
  ▲ Next.js 16.4.2 (Turbopack)
  ✓ Compiled successfully in 1286ms
  Finished TypeScript in 3.4s ...
  ✓ Generating static pages using 5 workers (4/4) in 1445ms
  Finalizing page optimization ...

  Route (app)
  ┌ ○ /
  └ ○ /_not-found
  ○  (Static)  prerendered as static content
  ```
- `npm --prefix web run lint`
  ```
  > web@0.1.0 lint
  > eslint
  ```
- `api\.venv\Scripts\python.exe scripts\smoke.py`
  ```
  BLOCKED: GNANI_API_KEY is missing. Create .env in the repo root (see .env.example).
  ```

## Tests
- pytest: 3 passed / 0 failed
- npm build: pass
- npm lint: pass

## Gnani usage this milestone
- STT seconds: 0.0   TTS characters: 0   (credit change reported by human: n/a)

## Deviations from the spec (and why)
- Used Python 3.13.11 instead of 3.11 or 3.12 (explicitly approved by human via choice prompt after machine check found 3.10 and 3.13 installed).
- Removed default `web/README.md` created by `create-next-app` to avoid confusion with the root `README.md`.

## Doc differences found (live docs vs spec)
- Detailed comparison table recorded in `docs/GNANI_API_NOTES.md`.
- Key findings: All core endpoints, auth headers, field names, frame sizes (1024 bytes), audio requirements (16 kHz mono), and voice catalogs match the spec.
- Noted minor inconsistencies in Gnani docs: STT REST max duration described as 30s in OpenAPI description but 60s in prose (our design safely uses <= 28s chunks); Timbre v3.0 voices catalog has 13 multilingual voices (not needed for v2.5).

## Dependencies added (name==version — reason)
Backend:
- `fastapi==0.149.0` — REST and WebSocket API framework
- `uvicorn[standard]==0.54.0` — ASGI server for FastAPI
- `httpx==0.28.1` — HTTP client for Gnani REST APIs and testing
- `websockets==17.3` — WebSocket client for Gnani STT streaming
- `pytest==9.1.1` — Test runner

Frontend:
- `next==16.4.2` — App framework
- `react==19.3.0` — UI runtime
- `react-dom==19.3.0` — DOM renderer
- `@tailwindcss/turbopack==4.3.3` — Tailwind Turbopack loader
- `tailwindcss==4.3.3` — CSS styling
- `typescript==5.9.3` — Type checking
- `eslint==9.39.5` — Linting
- `eslint-config-next==16.4.2` — Next.js ESLint configuration
- `@types/node==20.19.43`, `@types/react==19.3.0`, `@types/react-dom==19.3.0` — Type definitions

## Open questions for the human
1. **Blocking for M0 completion**: Please create `.env` in the repository root containing:
   ```
   GNANI_API_KEY=your_actual_key_here
   ```
   Once created, I will execute `scripts/smoke.py` to complete M0 acceptance and then proceed to M0.5.
2. Licence: which licence do you want for the repo (or none for now)?
3. Spec internal cross-reference: confirming that section 2 is the source of truth for Gnani API facts (rule 0.1 had a typo citing section 3).

## Ready for next milestone? no (blocked on .env for smoke test)
- All scaffolding, backend setup, frontend setup, documentation check, and test infrastructure are complete and pushed to origin/main.
- Awaiting `.env` with `GNANI_API_KEY` to run `scripts/smoke.py`.
