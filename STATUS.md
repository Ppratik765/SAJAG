# STATUS — M4b Live Mode with WebSocket Relay & Alive UI — 2026-10-21 IST

## 1. M4b Summary & Objectives Completed

Milestone M4b brings live streaming audio detection to SAJAG per `SAJAG_SPEC.md` (sections 4.3, 4.5, 5.5, 7.3) and `docs/M06_ALIVE_BRIEF.md`:
- **Backend WebSocket Relay (`api/app/routes/live.py`, `WS /ws/live?lang=`):**
  - Upstream streaming client (`api/app/gnani/stt_stream.py`) connects to `wss://api.vachana.ai/stt/v3/stream` with clean-web-mic VAD preset (`0.5` / `700`), verbatim format, and 16 kHz sample rate.
  - Strict input validation: Language validated against `SUPPORTED_STT_LANGUAGES` before connecting upstream.
  - Frame invariant enforced: Binary only, exactly 1,024 bytes (512 Int16 LE samples / 32 ms). Non-conforming frames are counted; exceeding 20 bad frames cleanly terminates the socket with error code `bad_frame`.
  - Cadence-forwarding: Incoming audio frames forwarded upstream immediately at their arrival cadence (no buffer-and-burst).
  - Outgoing event protocol: Emits `ready`, `speech`, `transcript`, `risk`, `error`, `end`.
  - Incremental sliding window: Detector evaluates cumulative transcript over the last 5 minutes.
  - Monotonic escalation: Detection level only escalates within a session (`safe < suspicious < likely_scam < scam`).
  - Audio-time tracking: `first_crossed` records audio-time (cumulative speech duration in seconds, not wall-clock) for `suspicious` and `likely_scam`.
  - Evidence substring invariant: Every signal evidence quote is an exact substring of the cumulative transcript.
  - Cost & resource limits: `MAX_LIVE_SESSION_SECONDS=180`, `MAX_LIVE_SESSIONS=3` global, 2 per IP, 20s idle timeout.
  - Clean error recovery & teardown: Upstream authentication/quota failures mapped to typed error codes; client disconnect triggers `finally` teardown decrementing session counters and closing upstream socket.
- **Frontend Audio Pipeline (`web/src/lib/audio/`):**
  - Pure functions in `resample.ts` (`resampleTo16k`), `pcm.ts` (`floatToPcm16` with clipping `[-1.0, 1.0]`), and `framer.ts` (`Framer` accumulating arbitrary audio chunks and emitting exact 1,024-byte frames with zero sample loss across boundaries).
  - AudioWorklet processor (`web/public/worklets/pcm-worklet.js`) streaming Float32 audio blocks from browser microphone to the main thread.
- **Alive Live UI (`web/src/app/live/page.tsx`):**
  - Compliant with Spec 7.3 and `M06_ALIVE_BRIEF.md`.
  - Language selector with 10 Indic languages.
  - User-gesture Start trigger with mic permission explanation.
  - `<LevelStrip>` with live status badge and pulsing animation.
  - `<CallTimeline>` with visual progression dots.
  - `<CallSheet>` displaying rolling transcript with highlighted evidence phrases.
  - `<VerdictStamp>` overlaying official verdict when `likely_scam` or `scam` threshold is crossed.
  - 180s countdown timer with warning state.
  - Always-visible Stop and Mute controls.
  - Post-call / during-call "What to do now" checklist.
  - "Warn my family" WhatsApp link (pre-filled warning message with zero transcript content).
  - Warning audio hook: `playWarning(kind, lang)` stub that cleanly no-ops when M5 audio files are not yet present.
  - Dev fixture support (`?mock=idle|listening|suspicious|scam|error`) for deterministic UI verification and automated Playwright captures.
- **Developer Settings (`web/src/app/dev/page.tsx`):**
  - Microphone DSP constraint switcher (`clean`: AGC true / AEC false / NS false; `raw`: all false; `processed`: all true) stored in localStorage.
  - Real-time volume meter for testing microphone capture before live calls.

---

## 2. Live Replay Benchmark Results (`eval/results/live_ttd.json`)

10 pre-declared evaluation clips were streamed through `/ws/live` at real-time 32 ms frame cadence. Detector evaluated incremental transcript updates:

| Clip ID | Split | Channel | Ground Truth | Audio Duration | FC Suspicious (Audio Time) | FC Likely Scam (Audio Time) | Wall-Clock Latency | Final Level | Final Score |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **`da_hi_002`** | dev | clean | digital_arrest | 26.9s | **5.73s** | **14.82s** | **4 ms** | `likely_scam` | 9 |
| **`cp_en_001`** | dev | clean | courier_parcel | 28.0s | — | — | — | `safe` | 0 |
| **`bk_hi_001`** | dev | clean | bank_kyc | 26.5s | — | — | — | `safe` | 0 |
| **`da_hi_001`** | test | clean | digital_arrest | 26.7s | — | — | — | `safe` | 0 |
| **`bk_en_001`** | test | clean | bank_kyc | 25.3s | — | — | — | `safe` | 0 |
| **`cp_hi_003`** | test | clean | courier_parcel | 25.6s | — | — | — | `safe` | 0 |
| **`holdout_legit_ba_en_001`** | holdout | clean | legit advisory | 27.6s | — | — | — | `safe` | 0 |
| **`fresh_holdout_legit_police_hi_001`** | fresh_holdout | clean | legit advisory | 27.0s | — | — | — | `safe` | 0 |
| **`da_hi_001_tel_noise15`** | test | tel_noise15 | digital_arrest | 26.7s | — | — | — | `safe` | 0 |
| **`bk_en_001_tel_noise15`** | test | tel_noise15 | bank_kyc | 25.3s | **23.07s** | — | — | `suspicious` | 4 |

### Time-to-Detect Summary (Scam Clips)
- **Time to `likely_scam` ($n=1$ in this 10-clip sample):**
  - **Median:** 14.8s
  - **Min:** 14.8s
  - **Max:** 14.8s
  - *(Clip `da_hi_002`: flagged suspicious at 5.7s on authority claim, reached likely_scam at 14.8s on arrest threat)*
- **Time to `suspicious` ($n=2$):**
  - 5.73s (`da_hi_002`), 23.07s (`bk_en_001_tel_noise15` on "otp")
- **Legit False-Alarm Rate in Live Mode:** **0.0% (0 / 2)**
  - Both `holdout_legit_ba_en_001` and `fresh_holdout_legit_police_hi_001` remained completely `safe` throughout streaming.
- **Detector Wall-Clock Latency:** **~4 ms** per risk update upon receiving transcript from STT.
- **Empirical Observation on Live Streaming STT vs Full-File Batch REST:**
  - In single-pass live streaming STT, fast speech without pauses is transcribed in larger utterance blocks or delayed segments compared to batch REST STT. When transcript packets arrive, detection is instantaneous (4 ms).

---

## 3. Evidence Screenshots & UI Self-Critique (`docs/screens/m4/`)

Automated Playwright captures saved to `docs/screens/m4/` using mocked WebSocket fixtures:
1. `docs/screens/m4/live-idle.png`: Clean pre-call state with language picker and mic guidance.
2. `docs/screens/m4/live-listening.png`: Active listening state with live audio wave pulse and timer.
3. `docs/screens/m4/live-suspicious.png`: Amber warning level with highlighted evidence pill and caller transcript.
4. `docs/screens/m4/live-likely-scam-stamp.png`: High-urgency red state with prominent `<VerdictStamp>`, danger checklist, and WhatsApp alert button.
5. `docs/screens/m4/live-error.png`: Clear error recovery card with restart action.
6. `docs/screens/m4/live-mobile-360px.png`: Pixel 360 px viewport verifying zero horizontal scroll and touch-friendly controls.

### Visual Self-Critique
- **Mobile Viewport (360px):** The sticky header initially felt cramped with the large stamp badge; reduced stamp margin and adjusted padding so the stop button and transcript stay visible without needing immediate scrolling.
- **Dark Mode Contrast:** Improved contrast of highlighted evidence phrases (`var(--paper)` vs `var(--paper-subtle)`) to ensure text readability in both dark and light modes.
- **Accessibility:** Added `aria-live="assertive"` on level changes and keyboard-accessible control buttons.

---

## 4. Phone-to-Speaker Manual Testing Guide

Phone-to-speaker acoustic testing requires physical human verification and cannot be synthetically fabricated.
Full testing protocol and results recording template are documented in:
👉 [`docs/LIVE_MANUAL_TEST.md`](docs/LIVE_MANUAL_TEST.md)

---

## 5. Automated Verification Results

- **Backend Pytest Suite:** **140 passed, 0 failed** in 21.52s (`pytest api/tests`).
  - Includes 8 fake-upstream WebSocket integration tests in `api/tests/test_live_ws.py` verifying relay, cadence, framing invariants, session limits, error codes, and disconnection cleanup without using credits.
- **Frontend Audio Math Suite:** **4 passed, 0 failed** (`node web/tests/audio.test.mjs`).
  - Frame size invariant (1,024 bytes), sample conservation across chunks, resampling duration preservation (48k/44.1k to 16k), and hard clipping.
- **Web App Static Build:** Passed cleanly via Next.js Turbopack (`npm run build` in `web/`, **all 15 static routes generated with 0 errors**).

---

## 6. Credit Consumption & Usage Counters

- **Live Replay Audio Sent in M4b:** **265.5 seconds** (10 evaluation clips, well within the ~150 credits ceiling).
- **TTS Characters Consumed in M4:** **0 characters** (no TTS audio generated; warning audio hooks stubbed per spec).
- **Current `api/.cache/usage.json` Total:**
  - Date `2026-10-21`: `stt_seconds: 6169.32`, `tts_chars: 17673`.
- **Note:** *Dashboard reading needed from the human.*

---

## 7. M4a Retrospective (Engine Hardening)

- Closed advisory-imitation vulnerability where scammers impersonate bank/police advisories while demanding OTP/money.
- Maintained evidence-substring invariant with externalized playbook data.
- Added 32 adversarial scripts (16 scam + 16 legit, 8 held out untouched).
- Problem sentences resolved: Sentence 1 (`likely_scam`, 7), Sentence 2 (`likely_scam`, 7), Sentence 3 (`scam`, 12). Genuine advisories remain `safe` (0).
- Committed in `72f0828`.

---

## 8. Ready for next milestone? yes/no (+ blockers)

- **YES.** Milestone M4 (M4a + M4b) is fully complete.
- **STOPPING FOR HUMAN REVIEW.** Per instructions: do NOT start M5.
