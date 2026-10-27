# M7 — Hardening, honest demo, deploy kit (final milestone)

Read first: `SAJAG_SPEC.md` sections 1.1 (honest limits), 7.6 (demo replay), 9 (security), M7 acceptance; `STATUS.md` section 0 (the M5 review block and its known gaps); `docs/DECISIONS.md`; `docs/GNANI_API_NOTES.md`. Rules 1 to 7 of the spec still apply: no invented API facts, every claim needs evidence you produced in this milestone, budget guard. Commit after each part with `M7<letter>: ...`. Update `STATUS.md` at the end of each part. Deadline context: the public beta is due about Nov 1 and the final submission Nov 10, so finish things; do not polish forever.

**Engine freeze.** `api/app/engine/` and `data/playbook/` are frozen. Known weakness, to be documented and not fixed: genuine advisories or notifications that mention OTP, SIM block or refund can still false-alarm (final holdout: 2 of 5 legit scripts, text only). Do not tune against `final_holdout`, `holdout`, `fresh_holdout` or `adv_holdout`. The only allowed engine edit is a security bug (for example a crash on hostile input), and it must be described in STATUS.

**Credits.** Max ~100 credits in this milestone (demo fixture and clip baking). Print STT seconds and TTS characters used. Cache everything.

---

## PART A: close the known gaps from the M5 review (small)

1. **Real tests for the warning logic.** `web/tests/warning_audio.test.mjs` tests a copy of the logic written inside the test file. Extract the logic into `web/src/lib/warnings/policy.ts` (pure, no React): language resolution, 60-second cooldown per alert kind, never let a "suspicious" alert block a later "scam" alert, stop a playing suspicious clip when the scam alert starts, mute, and "start the cooldown only if play() succeeded". Use it from `/live` and `/parent`, and make the test import the real module (`await import("../src/lib/warnings/policy.ts")`, no parameter properties, because Node strips types only). Delete the replica.
2. **Reviewed gating.** The UI must read `reviewed_warning_languages` from `/api/meta` and play spoken warnings only for languages marked reviewed in `api/app/config/warnings.yaml`. If none is reviewed, show a small visible note ("Spoken warnings are off until the voices have been reviewed") and never fail silently. Leave `reviewed: false` in the yaml; the human flips it after listening to every clip in `docs/WARNING_REVIEW.md`.
3. **Missing clip.** Add `explain_unknown_suspicious` handling: the yaml already has the text; bake the two missing clips with `scripts/bake_warnings.py` (about 200 characters), add them to `docs/WARNING_REVIEW.md`, and make the Listen button work for that type.
4. **Do not claim safety.** Search the whole UI (English and Hindi strings, i18n files, stamps, Parent mode, OG, landing page) for wording that says a call is "safe" or "secure" ("सुरक्षित", "safe", "no scam"). The safe state must read "No warning signs found yet" and carry "Still do not share codes, PINs or money with unknown callers". Provide a table in STATUS of every string you changed.
5. Fix the lint error `react-hooks/set-state-in-effect` in `web/src/app/parent/page.tsx` (mock-param handling) and the unused variables; `npm run lint` must be clean or the remaining findings listed.

## PART B: hardening (spec section 9)

1. **`/api/usage` must be closed by default.** Right now it is open when `ADMIN_TOKEN` is unset (see `api/app/routes/meta.py`). Make it return 403 unless a token is configured and sent. Test both.
2. **WebSocket origin.** `/ws/live` allows connections with no `Origin` header. Keep that only when `ALLOW_NO_ORIGIN=true` (default false in production env, true in dev). Test with the fake-upstream suite.
3. **Rate limits.** Per-IP token buckets on `/api/analyze/audio` (10/min), `/api/analyze/text` (30/min), `/api/tts/warning` (already 5/min), plus `MAX_LIVE_SESSIONS` and 2 per IP (already). Behind a proxy the client IP is in `X-Forwarded-For`: use it only when `TRUST_PROXY=true` and take the first hop. Document that limits are in-memory and per instance.
4. **Maintenance mode.** `MAINTENANCE_MODE=true` makes every Gnani-calling endpoint and `/ws/live` answer a clear 503 `maintenance`, and the frontend shows a plain notice. The text engine (`/api/analyze/text`) keeps working. Test it.
5. **Hostile input.** Property-style tests: empty text, 8,000+ characters, only emoji, 100,000 combining marks, null bytes, a zip renamed to .wav, a 0-byte file, an audio file over `MAX_UPLOAD_SECONDS`, a WAV with a lying header. Nothing may crash, hang or return a stack trace.
6. **Privacy.** Confirm and test: uploaded audio is deleted in a `finally`; no transcripts or audio are written to disk or logs (grep the logging calls and list them); logs contain no API key. The `/about` page states exactly this.
7. **Secrets.** Run a history search for the key prefix and anything that looks like a key (`git log -p` or `git grep` over all commits) and paste the (empty) result. `.env` must be ignored. Add `.env.example` with every variable and a one-line meaning. Add `SECURITY.md` (how to report a problem, no personal data in the repo).
8. **Headers.** Frontend security headers in `next.config.ts` (CSP that allows our API and websocket origins, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy` allowing microphone only for self). Verify `/live` still gets mic permission and that `/api/og` still works.

## PART C: demo replay and fixtures (spec 7.6)

1. `scripts/make_demo_fixture.py`: take **one** dev-split synthetic scam clip (pick a clip that reached `likely_scam` in `eval/results/live_ttd.json`; say which and why), stream it through the **real live pipeline once at real-time pace**, and record, per transcript segment, the audio time and the wall-clock offset at which it arrived. Save `web/public/demo/fixture.json` and the audio file `web/public/demo/call.mp3` (synthetic, made with Timbre in earlier milestones; do not generate new TTS unless the existing audio is not usable, and print the characters if you do).
2. `/demo` page: plays the audio and replays the fixture through the **same engine and components** as live mode so the sheet marks and the stamp land in sync. Banner exactly: "Synthetic demo call, pre-recorded. Transcripts were captured earlier from Prisma on this audio. Use Live mode to run on your own audio." It must never look like a live result. The "flagged after N seconds" line may appear only if computed from the fixture; show both audio-time and the time the user would actually have seen it.
3. Replace the labelled static hero example on `/` only if the demo player can be shown there with the same label; otherwise leave the static one.

## PART D: deploy kit (the agent cannot deploy; prepare everything)

1. `api/Dockerfile` (python 3.13 slim, ffmpeg installed, non-root user, `uvicorn` with `--proxy-headers`, healthcheck on `/healthz`), `.dockerignore`, and `docker-compose.yml` for local full-stack testing. Build the image and run `/healthz` if Docker is available; if not, say so and run the same commands without Docker.
2. `docs/DEPLOY.md`, step by step and honest about hosting: frontend on Vercel (root directory `web`, env `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_API_WS_URL`, `NEXT_PUBLIC_SITE_URL`); backend on any host that keeps long-lived WebSockets (Render, Fly.io or Railway; say which free tiers sleep and that a sleeping backend makes the first live call fail), all env variables with safe production values (`ALLOWED_ORIGINS`, `ADMIN_TOKEN`, `DAILY_STT_SECONDS_CAP`, `DAILY_TTS_CHARS_CAP`, `MAX_LIVE_SESSION_SECONDS`, `TRUST_PROXY`, `ALLOW_NO_ORIGIN=false`, `MAINTENANCE_MODE`). Include a post-deploy checklist the human can run in 10 minutes (open URL on a phone, `/healthz`, one live call, one paste, `/api/usage` returns 403 without token, share link opens with a preview).
3. `GET /api/meta` must also expose `maintenance` and `build_commit` (short git hash from an env var) so the human can verify what is deployed.
4. **Credit protection for launch.** Document recommended caps for the Gnani credits that remain after launch (ask the human for the dashboard reading in STATUS), and add a daily live-session cap so a viral spike cannot burn everything: when the cap is reached the site says so plainly and keeps text analysis and the demo working.

## PART E: private real-audio evaluation tool (the YouTube idea, done safely)

The human may test with publicly available scam-call or scam-awareness videos. Those recordings must **never** enter the repo, the site, the demo or the posts (copyright, victim privacy, the spec rule against real recorded calls in the project or demo). They are for private testing only.

1. `scripts/eval_real_audio.py <folder>`: for every audio file in a local folder (`data/private_audio/`, already git-ignored; verify and add to `.gitignore` if not), convert with ffmpeg to 16 kHz mono, stream through the real `/ws/live` pipeline at real-time pace (reuse `scripts/live_replay.py` pacing), and write **aggregate-only** results to `eval/results/real_audio_summary.json`: file index (not the name), duration, language used, final level, time to `suspicious` and `likely_scam` in audio time and wall-clock, number of transcript segments, number of signals, and the signal **categories** (not evidence text, not transcripts). Never store transcripts or evidence quotes from these files.
2. Print a budget projection first (total seconds) and refuse to run above 600 seconds without `--yes`.
3. Add a section to `docs/LIVE_MANUAL_TEST.md` for the human: how to prepare files (trim to the call part, single speaker per file is fine), what language to pick, how to read the summary, and what may be said publicly ("tested on N public recordings, results aggregated, recordings not redistributed") and what may not.
4. On `/accuracy`, add a row "Real recordings (private)" only if `real_audio_summary.json` exists, showing n, how many reached likely_scam, and the median time; otherwise show nothing. Never present them as part of the corpus.

## PART F: honest docs, accessibility, evidence

1. `README.md`: what it is in one paragraph (rule-based detection, no generative model, Gnani Prisma for speech to text and Timbre for voice), screenshots, the architecture diagram (a text or SVG diagram), how to run locally (exact commands, tested by you from a clean clone: write what you ran and what happened), the honest limits from spec 1.1, the evaluation table copied from `eval/results/latest.json` and `real`/`final_holdout` results **by script, not by hand**, the known weakness above, credits to Gnani, license, and the security and privacy summary. Every number in the README must be generated by `scripts/readme_numbers.py` from the JSON files, and the script fails if README text differs.
2. `/about`: how it works, what is and is not stored, limits, credits to Gnani models used, and the sentence "Sajag is a helper, not a guarantee."
3. Accessibility pass on `/`, `/live`, `/parent`, `/check`, `/paste`, `/report`, `/demo`, `/accuracy`, `/about`: keyboard walkthrough, visible focus, `aria-live` on level changes, text contrast in light and dark, `prefers-reduced-motion`, 360 px width with no horizontal scroll. Run Lighthouse (mobile) on those pages and record the real scores in STATUS (accessibility, performance, best practices); fix anything under 90 on accessibility.
4. Refresh screenshots for every page at desktop and 360 px into `docs/screens/m7/`, with real data wherever the page shows data (demo fixture, accuracy). Label mocked ones as mocked. Self-critique: what you changed after looking.
5. i18n: list every Hindi string that has not been read by a native speaker in `docs/HINDI_REVIEW.md` (key, string, where it appears) for the human to review. Do not call Hindi text verified.

## Acceptance for M7

- `pytest`, `npm run lint`, `npm run build` and node tests pass; paste counts and note anything environment-specific.
- `/api/usage` returns 403 without a token and with `ADMIN_TOKEN` unset; `/ws/live` without Origin is refused in production mode; maintenance mode works; hostile-input tests pass.
- `git log -p` secret search is empty (paste the command and result).
- `/demo` is labelled and driven by a fixture produced once through the live pipeline; any "N seconds" shown is computed from it.
- README numbers are generated and match the JSON files.
- `STATUS.md` rewritten using the spec section 12 template, with: done, evidence, tests, credits used (STT seconds, TTS characters), deviations, a list of **things only the human can do before launch** (listen to all clips and flip `reviewed`, review Hindi strings, deploy per `docs/DEPLOY.md`, test on a real Android phone, run the real-audio test privately, give the dashboard credit reading), and "dashboard reading needed from the human".
- Do not claim anything that is not backed by a file or command output from this milestone.

Commit and push. Stop for human review.
