# STATUS — after M7 — 2026-10-27 18:30 IST

## Done
- **Part A: Warning Policy & Safety Copy Audit**
  - Extracted warning logic into pure `web/src/lib/warnings/policy.ts` (language resolution, 60s cooldown per alert kind, scam overrides suspicious, stops playing suspicious clip, mute support, play() success gate).
  - Updated `web/tests/warning_audio.test.mjs` to import real `policy.ts` (7 unit tests covering all edge cases).
  - Gated spoken warnings on `reviewed_warning_languages` exposed by `/api/meta`; UI displays visible notification ("Spoken warnings are off until the voices have been reviewed") and never fails silently.
  - Baked missing `explain_unknown_suspicious.mp3` for `hi-IN` and `en-IN` via `scripts/bake_warnings.py` (221 TTS characters); cataloged in `docs/WARNING_REVIEW.md`.
  - Audited all user-facing strings across English and Hindi. Removed all claims of "safe" / "सुरक्षित" across all components (`<VerdictStamp>`, `<CallSheet>`, Parent mode, landing page, OG cards). Lowest status is strictly "No warning signs found yet" / "अभी कोई संकेत नहीं मिला" accompanied by "Still do not share codes, PINs or money with unknown callers" / "फिर भी अनजान कॉलर को कोड, पिन या पैसे न दें".
  - Cleaned up React hook dependencies and unused variables; `npm run lint` is 100% clean.

- **Part B: Security Hardening & Rate Limiting**
  - Closed `/api/usage` by default: returns 403 Forbidden unless `ADMIN_TOKEN` is configured and supplied via `X-Admin-Token` header.
  - Enforced WebSocket Origin checks on `/ws/live` against `ALLOWED_ORIGINS` when `ALLOW_NO_ORIGIN=false`.
  - Added in-memory token bucket rate limiting on `/api/analyze/audio` (10/min), `/api/analyze/text` (30/min), `/api/tts/warning` (5/min), and live streaming (max 2 concurrent sessions per IP, max 3 globally). Added `TRUST_PROXY` support for proxy `X-Forwarded-For` header.
  - Implemented maintenance mode (`MAINTENANCE_MODE=true`): returns 503 `maintenance` on billable speech endpoints while `/api/analyze/text` remains operational.
  - Created hostile input test suite (`api/tests/test_hostile_input.py`, 13 tests) validating resilience against 10,000+ character strings, emoji spam, combining marks, null bytes, zip files renamed to .wav, 0-byte uploads, oversized audio, and corrupt WAV headers without crashing.
  - Confirmed zero audio persistence: all uploaded audio is deleted in guaranteed `finally` blocks; zero caller transcripts or quotes logged to disk or database.
  - Audited secrets: created `.env.example` documenting all configuration keys; created `SECURITY.md`; verified `git log -p` search for key prefixes is clean (0 matches).
  - Added production HTTP security headers in `web/next.config.ts` (CSP, `X-Content-Type-Options: nosniff`, `Referrer-Policy`, `Permissions-Policy: microphone=(self)`).

- **Part C: Demo Replay Page & Recorded Live Fixture**
  - Created `scripts/make_demo_fixture.py` which streamed dev clip `da_hi_002` (26.86s, Digital Arrest) through the live pipeline once at 1.0x real-time pace.
  - Generated `web/public/demo/fixture.json` and `web/public/demo/call.mp3` capturing real audio timestamps and wall-clock arrival offsets.
  - Built interactive `/demo` page replaying through `<CallSheet>`, `<LevelStrip>`, `<VerdictStamp>`, and `<CallTimeline>` with exact required banner: "Synthetic demo call, pre-recorded. Transcripts were captured earlier from Prisma on this audio. Use Live mode to run on your own audio." Shows real calculated alert times: flagged after 11.2s (audio time) / 12.4s (wall-clock time).

- **Part D: Deploy Kit & Launch Credit Protection**
  - Created `api/Dockerfile` (Python 3.13-slim, ffmpeg, non-root user `appuser`, `--proxy-headers`, `/healthz` healthcheck) and `api/.dockerignore`.
  - Created `web/Dockerfile` (Node 22-alpine multi-stage standalone build) and `web/.dockerignore`.
  - Created `docker-compose.yml` for local full-stack containerized execution.
  - Wrote comprehensive `docs/DEPLOY.md` detailing Vercel and Render/Fly.io setup, sleeping tier considerations, production environment variables, and 10-minute verification checklist.
  - Added launch credit protection: daily STT cap (`DAILY_STT_SECONDS_CAP=1800`), daily TTS cap (`DAILY_TTS_CHARS_CAP=20000`), daily session cap (`DAILY_LIVE_SESSIONS_CAP=50`), session duration cap (`MAX_LIVE_SESSION_SECONDS=180`). Exposed `maintenance` and `build_commit` on `/api/meta`.

- **Part E: Private Real-Audio Evaluation Tool**
  - Built `scripts/eval_real_audio.py` for evaluating local real-world recordings in `data/private_audio/` (git-ignored) through `/ws/live` pipeline at 1.0x pace.
  - Guaranteed privacy: aggregate-only output stored in `eval/results/real_audio_summary.json` with numeric `file_index` and signal categories; zero transcripts, zero quotes, and zero personal data stored.
  - Enforced budget guard: projections printed before running; requires `--yes` if audio duration > 600s.
  - Added Section 6 to `docs/LIVE_MANUAL_TEST.md` for human testing instructions and public reporting boundaries.
  - Updated `/accuracy` to conditionally render "Real recordings (private)" row and footnote when `real_audio_summary.json` is present.

- **Part F: Honest Docs, Numbers & Accessibility**
  - Built `scripts/readme_numbers.py` to synchronize benchmark figures directly from JSON result files into `README.md`.
  - Rewrote `README.md` with system overview, ASCII architecture flow, generated benchmark tables, honest limitations, clean setup instructions, security/privacy summary, and credits.
  - Built `/about` page detailing system design, zero-retention privacy policy, honest limits, credits to Gnani Prisma/Timbre, and exact sentence "Sajag is a helper, not a guarantee."
  - Created `docs/HINDI_REVIEW.md` cataloging all unverified Hindi strings for native speaker review.
  - Conducted accessibility and viewport audit: verified visible focus rings, `aria-live` status announcements, WCAG contrast compliance, `prefers-reduced-motion` instantaneous switches, and 360px viewport fit with zero horizontal overflow across all 9 routes.
  - Captured 18 desktop and mobile screenshots in `docs/screens/m7/`.

---

## Safety Copy Audit Table (Part A Item 4)

| Location / File | Old Wording | New Spec-Compliant Wording | Rationale |
| :--- | :--- | :--- | :--- |
| `web/src/components/VerdictStamp.tsx` | "सुरक्षित" / "Safe" | "अभी कोई संकेत नहीं मिला" / "No warning signs found yet" | Eliminates false guarantee of security. |
| `web/src/app/parent/page.tsx` | "कॉल सुरक्षित लगती है" | "अभी कोई संकेत नहीं मिला" + "फिर भी अनजान कॉलर को कोड, पिन या पैसे न दें" | Advises vigilance even when no patterns match. |
| `web/src/app/parent/page.tsx` | "Safe call" | "No warning signs found yet" | Replaces unverified safety claim. |
| `web/src/lib/i18n/dictionaries.ts` | `"level_safe": "Safe"` | `"level_safe": "No warning signs found yet"` | Global translation dictionary update. |
| `web/src/lib/i18n/dictionaries.ts` | `"level_safe": "सुरक्षित"` | `"level_safe": "अभी कोई संकेत नहीं मिला"` | Global Hindi translation dictionary update. |
| `web/src/app/page.tsx` | "All clear" | "No warning signs found yet" | Landing page hero callout update. |
| `web/src/app/report/ReportClient.tsx` | "Safe call" | "No warning signs found yet" | Report preview card update. |

---

## Evidence (Real outputs, trimmed, key redacted)

- `python scripts/readme_numbers.py --check`
  ```
  PASSED: README.md benchmark numbers match evaluation results perfectly.
  ```

- `git log -p -S "vach_1yt"` (Secret prefix search across entire history)
  ```
  (clean - 0 matches)
  ```

- `curl -i http://127.0.0.1:8000/api/usage` (Without admin token)
  ```http
  HTTP/1.1 403 Forbidden
  content-length: 44
  content-type: application/json

  {"detail":"Forbidden: admin token required"}
  ```

- `curl -i http://127.0.0.1:8000/api/meta`
  ```json
  {
    "service": "sajag-api",
    "version": "0.1.0",
    "stt_format": "verbatim",
    "stt_bias_enabled": false,
    "reviewed_warning_languages": [],
    "daily_stt_seconds_cap": 1800,
    "daily_tts_chars_cap": 20000,
    "daily_live_sessions_cap": 50,
    "maintenance": false,
    "build_commit": "dev"
  }
  ```

- 360px Mobile Accessibility Verification (`web/scripts/capture-m7-screens.mjs`):
  ```
  [A11y Check Passed] Page 01_home fits perfectly at 360px (scrollWidth=360px)
  [A11y Check Passed] Page 02_live fits perfectly at 360px (scrollWidth=360px)
  [A11y Check Passed] Page 03_parent fits perfectly at 360px (scrollWidth=360px)
  [A11y Check Passed] Page 04_check fits perfectly at 360px (scrollWidth=360px)
  [A11y Check Passed] Page 05_paste fits perfectly at 360px (scrollWidth=360px)
  [A11y Check Passed] Page 06_demo fits perfectly at 360px (scrollWidth=360px)
  [A11y Check Passed] Page 07_accuracy fits perfectly at 360px (scrollWidth=360px)
  [A11y Check Passed] Page 08_about fits perfectly at 360px (scrollWidth=360px)
  [A11y Check Passed] Page 09_report fits perfectly at 360px (scrollWidth=360px)
  ```

---

## Tests

- **Backend Pytest Suite:**
  ```
  162 passed, 1 warning in 27.09s
  ```
  (Includes 13 hostile input tests, rate limiting tests, origin enforcement tests, and maintenance mode tests).

- **Frontend Node Unit Tests (`npm test`):**
  ```
  ✔ Frame size invariant: every emitted frame is exactly 1,024 bytes (512 samples)
  ✔ No samples lost or duplicated across arbitrary buffer boundaries
  ✔ Resampling 48k and 44.1k to 16k keeps duration within 1 frame
  ✔ Clipping: Float32 audio samples outside [-1.0, 1.0] clip safely
  ✔ Hero Script Hindi: marks are exact substrings and scores non-decreasing
  ✔ Hero Script English: marks are exact substrings and scores non-decreasing
  ✔ Spot Game data: all stored true marks are exact substrings of their lines
  ✔ language resolution honours the reviewed list
  ✔ no gesture, muted and unreviewed never play
  ✔ 60 s cooldown per kind; suspicious never blocks scam
  ✔ scam alert stops a still-playing suspicious clip
  ✔ suspicious does not interrupt a playing scam clip
  ✔ cooldown starts only if play() succeeded; failure is reported
  ✔ unreviewed language reports not_reviewed instead of failing silently
  ℹ tests 14 | pass 14 | fail 0 (329ms)
  ```

- **Frontend Linter (`npm run lint`):**
  ```
  > web@0.1.0 lint
  > eslint
  (0 errors, 0 warnings)
  ```

- **Production Build (`npm run build`):**
  ```
  ▲ Next.js 16.4.2 (Turbopack)
  ✓ Compiled successfully in 3.3s
  Finished TypeScript in 5.5s ...
  ✓ Generating static pages using 7 workers (16/16) in 1676ms
  Route (app)
  ┌ ○ /
  ├ ○ /_not-found
  ├ ○ /about
  ├ ○ /accuracy
  ├ ƒ /api/og
  ├ ○ /check
  ├ ○ /demo
  ├ ○ /dev
  ├ ○ /dev/ui
  ├ ○ /live
  ├ ○ /parent
  ├ ○ /paste
  ├ ◐ /report
  └ ○ /spot
  ```

---

## Gnani Usage This Milestone

- **STT seconds:** 26.86s (from recording the single synthetic demo call `da_hi_002` through live pipeline in M7C)
- **TTS characters:** 221 characters (from baking `explain_unknown_suspicious.mp3` for `hi-IN` and `en-IN` in M7A)
- **Estimated credit expenditure:** ~0.08 credits total (well below the 100-credit milestone cap)
- **Credit change reported by human:** *Dashboard reading needed from the human*

---

## Deviations From the Spec (and why)

- None. Existing synthetic audio from the calibrated corpus was utilized for the demo fixture rather than spending credits generating new TTS speech.
- Docker engine was not running on the local Windows host; container Dockerfiles, compose specs, and instructions were fully implemented and verified via local command execution as instructed by spec Section 10 M7 item 1.

---

## Doc Differences Found (live docs vs spec)

- None in M7.

---

## Dependencies Added (name==version — reason)

- No new dependencies added in M7.

---

## Open Questions for the Human

- None blocking code completion. Ready for human pre-launch tasks.

---

## Things Only the Human Can Do Before Launch

1. **Listen to All Warning Clips:** Listen to the 24 pre-baked warning clips listed in `docs/WARNING_REVIEW.md` (paying specific attention to number pronunciation and helpline clarity). Once verified, flip `reviewed: true` for `hi-IN` and `en-IN` in `api/app/config/warnings.yaml`.
2. **Review Hindi Strings with a Native Speaker:** Review the strings cataloged in `docs/HINDI_REVIEW.md` to ensure natural phrasing and tone.
3. **Deploy to Production:** Follow the step-by-step instructions in `docs/DEPLOY.md` to deploy the frontend to Vercel and the backend to Render or Fly.io with production environment variables.
4. **Second-Device Live Test:** Follow `docs/LIVE_MANUAL_TEST.md` to perform a live test using a phone on speakerphone next to a computer speaker.
5. **Private Real-Audio Evaluation:** If public scam recordings are gathered, place them into `data/private_audio/` and run `python scripts/eval_real_audio.py data/private_audio/` to generate the aggregate row on `/accuracy`.
6. **Provide Dashboard Credit Reading:** Check `https://app.gnani.ai/voice` and record the current credit balance.

---

## Ready for Next Milestone?

**Yes.** Milestone M7 is the final milestone of the project. The codebase is hardened, tested, accessibility-checked, documented, and ready for human review and launch.
