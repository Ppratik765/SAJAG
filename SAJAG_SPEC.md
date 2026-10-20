# SAJAG — Build Specification (v1.0, written 2026-10-19)

> "Sajag" (सजग = alert, vigilant) is a **working name**. Repo/package names may be changed by the human later; do not rename on your own.

This file is the single source of truth for the build. It is written for a coding agent (Antigravity). Read **all** of it before writing any code. Then execute **only the milestone the human tells you to run** (start with M0).

---

## 0. Rules for the coding agent (non-negotiable)

These rules exist because the cost of a hallucinated API call or a fake "it works" is a failed submission.

1. **Source of truth order:** (a) this spec, section 2 for all Gnani API facts; (b) the live docs at `https://docs.gnani.ai` (every page is also available as markdown by appending `.md`; the index is `https://docs.gnani.ai/llms.txt`); (c) nothing else. If (a) and (b) disagree, believe the live docs, write the difference into `docs/GNANI_API_NOTES.md`, and mention it in `STATUS.md`.
2. **Never invent** endpoints, request fields, header names, model names, voice names, language codes, response fields, package names, or CLI flags. If something is not in section 3 or the live docs, **stop and ask** by writing the question into `STATUS.md` under "Open questions". Do not guess, do not "assume the obvious".
3. **No fake success.** Never mark something done unless you ran it and saw it work. Paste the real command and the real (trimmed) output into `STATUS.md`. Mocks/fakes are allowed **only inside tests**, must be named `Fake*` / `mock_*`, and must never be reachable from production code paths or the UI.
4. **No placeholder data presented as real.** No lorem ipsum, no fabricated statistics, no fabricated accuracy numbers, no made-up testimonials, no invented news/incident figures anywhere in the app or README. Every number shown in the UI/README must come from a script in this repo (the eval harness) or be marked "example".
5. **Secrets:** the Gnani key lives only in `.env` (git-ignored) as `GNANI_API_KEY`. Never print it, log it, commit it, or send it to the browser. Commit `.env.example` only.
6. **Dependencies:** pin versions. Prefer the standard library. List every dependency you add, with a one-line reason, in `STATUS.md`. Do **not** use the `gnani-vachana` SDK or the `transformers` pipeline; call the documented HTTP/WebSocket endpoints directly (section 3). Do **not** use Python's `audioop` (removed in Python 3.13). Use Python 3.11 or 3.12.
7. **Budget guard:** Gnani credits are limited (5,000 programme credits; the unit-to-seconds/characters conversion is **unknown** to us). Never run a batch that would send more than **600 seconds of audio to STT** or **20,000 characters to TTS** in one run without first writing the projected totals to `STATUS.md` and waiting for the human to approve. Every script that calls Gnani must print how many STT-seconds and TTS-characters it used.
8. **Scope discipline:** do only the requested milestone. No extra features, no refactors outside the milestone, no "while I was there" changes. If you think the spec is wrong, say so in `STATUS.md` instead of silently deviating.
9. **Git:** work on `main`. One commit per logical step, message style `m1: add chunked STT upload`. At the end of each milestone: all tests pass, `git push`, then write/update `STATUS.md` (template in section 12) and stop.
10. **When blocked** (missing key, quota error, ambiguous docs): stop, write what you tried and the exact error (key redacted) into `STATUS.md`, and wait.

### 0.1 Starting state: an empty folder and an empty remote repo (you set everything up)

The human has **an empty local folder and an empty GitHub repository. Nothing is initialised.** The human has placed `SAJAG_SPEC.md` in the folder root (if it is missing, stop and say so). You create the entire project from scratch, inside the current working directory only; never create files outside it. As the very first part of M0:

1. **Check the machine, report, do not guess.** Print OS, and versions of `git`, `python` (need 3.11 or 3.12), `node` and `npm` (check Next.js's current minimum Node version from its own docs/`npm view next engines` rather than assuming), `ffmpeg`, `ffprobe`. If something is missing or too old: **do not silently install system packages and do not use `sudo`.** Write the exact install command for the detected OS into `STATUS.md` and stop. (Tools installable in user space — pip packages, npm packages, a Python venv — you may install.)
2. **Git.** Run `git init -b main`. Check `git config user.name` and `user.email`; if unset, ask the human — **never invent an identity**. Check `git remote -v`. If no `origin` exists and the human's kickoff prompt gave a URL, run `git remote add origin <URL>`; if no URL was given, ask. Verify access with `git ls-remote origin` (an empty repo returns nothing and exit code 0). If authentication fails, report the error; do not try to work around it with tokens.
3. **First commit = the spec itself** (`chore: add build spec`), then `.gitignore`, then the scaffold. Push with `git push -u origin main`. If the remote turns out **not** to be empty (existing README/LICENSE/commits), **stop and ask** — never force-push, never rewrite remote history.
4. Do not add a licence file on your own; ask the human which licence they want (put the question in `STATUS.md`).
5. **Python:** create `api/.venv` (git-ignored), install pinned dependencies from the pinned file. **Web:** scaffold with `create-next-app`; run it with `--help` first and use only flags that exist in the installed version; pick the Next.js version with `npm view next version` and pin it. Commit lockfiles.
6. **Cross-platform commands:** provide `npm`/`python -m` entry points that work on the detected OS. Add a `Makefile` only if the OS is macOS/Linux. README "Run locally" must list the exact commands you actually ran.
7. Create `README.md` as a short stub now (no badges, no emojis); the full README is written in M7.

---

## 1. What we are building

**Sajag is a scam-call shield for Indian families.** It listens to (or reads a recording of) a suspicious call in Hindi, Hinglish, English or other Indian languages, recognises scam patterns (digital arrest, fake KYC, UPI refund, electricity-bill, courier/customs, remote-access tech support, family-emergency voice scams, lottery/prize, investment/tasks), marks the warning signs on a live call sheet with **evidence quotes from the call** and a verdict stamp (section 7.1), and **speaks a warning aloud in the user's language** so non-readers and elders get it too. A one-tap button lets the user warn a family member via WhatsApp.

Why it uses Gnani models genuinely:
- **Prisma v2.5 (STT)** transcribes noisy, telephony-grade, code-mixed Indian speech. Core to the product.
- **Timbre (TTS, beta)** speaks the warnings and explanations in the user's language. Core to the product.
- **Evon is deliberately out of scope (decision by the human, 2026-10-20).** Evon v3.3 is not on Gnani's API platform and would need self-hosting. This project uses **API-only Gnani models: Prisma (STT) and Timbre (TTS)**. The challenge requires at least one Gnani model or API, so this is allowed. Do not add any LLM, any language-model dependency, or any extra model call. Scam detection is the deterministic rules engine in section 5, and the README must say so plainly (rule-based detection, no generative model).

### 1.1 Honest product limits (must appear in the UI "About" page and README)
- **Same-phone live listening is NOT supported.** While a cellular/VoIP call is active, phone operating systems generally restrict other apps from using the microphone. Supported modes are:
  1. **Live (second device):** a second device (laptop/phone/tablet of a family member) sits near the speakerphone and listens.
  2. **Check a recording / voice note:** upload or record audio (≤ 3 minutes) after the call or from WhatsApp.
  3. **Paste text:** paste a message or transcript (no Gnani call; works offline of the API).
  4. **Demo replay:** a clearly-labelled pre-recorded synthetic call (section 8.6).
- Sajag gives a **risk assessment, not a guarantee**. It can be wrong in both directions. Say so plainly.
- Never claim it "blocks" scams. Never claim legal/official authority.

### 1.2 Targets (challenge context)
- Challenge: "Great Indian AI Internship Challenge" by Gnani AI. Deadline **2026-11-10 23:59 IST**. Today is 2026-10-19.
- The shortlist depends on **verified engagement on the public demo post**, so the product must be shareable and the public launch must happen early (target: public beta by **2026-11-01**, posts live by **2026-11-02**).
- Award categories we aim at: Mixed Vibes (code-mixed voice), Noise Canceller (noisy telephony), Real Deal (real-world impact), Demo Day Drop (60-second video), Crowd Favourite (public votes).
- **Rules to respect:** no real phone numbers, account numbers, Aadhaar, PAN or recorded real calls in the project or demo — **all test data and demo data must be synthetic or staged by consenting people**. No bought engagement. No misleading demos (the demo video must show the live pipeline; the replay mode must be labelled).

---

## 2. Verified Gnani API reference (source of truth)

Verified from `docs.gnani.ai` on **2026-10-19**. Re-verify during M0 and record differences in `docs/GNANI_API_NOTES.md`.

### 2.1 Base URL and auth
- Base URL: `https://api.vachana.ai`
- REST auth header: `X-API-Key-ID: <api key>`
- WebSocket auth header: `x-api-key-id: <api key>` (header names are case-insensitive over HTTP)
- Keys are created at `https://app.gnani.ai/voice`. Missing/invalid key → `401`. Exhausted credits/permission → `403`.
- **Browsers cannot set custom headers on a WebSocket.** All Gnani calls therefore go **server-side**; the browser talks only to our backend.

### 2.2 Speech-to-text — REST (Prisma v2.5)
- `POST https://api.vachana.ai/stt/v3`, `Content-Type: multipart/form-data`
- Fields:
  - `audio_file` (file, required) — WAV, MP3, OGG, FLAC, AAC, M4A. **Max 60 s, ideal ≤ 30 s.** (One docs page says 30 s in prose; the OpenAPI block says 60. We always send **≤ 28 s** chunks.)
  - `language_code` (string, required) — one of `bn-IN`, `en-IN`, `gu-IN`, `hi-IN`, `kn-IN`, `ml-IN`, `mr-IN`, `pa-IN`, `ta-IN`, `te-IN`.
  - `format` — `verbatim` (default, raw spoken form) or `transcribe` (inverse text normalisation: digits, ₹, dates…).
  - `itn_native_numerals` (bool, default false; only with `format=transcribe`).
  - `bias_list` (string) — word boosting. JSON array (`["OTP","KYC"]`) or comma-separated. Up to 100 words. **Each entry must be a single word, letters only** (Latin or Indic script letters; no digits, spaces, punctuation). Requires `bias_score`. Use with `format=verbatim`. **Invalid input silently disables boosting and still returns 200.**
  - `bias_score` — one of `0.0`, `0.5`, `1.0`, `1.5`, `2.0` (`0.0`/omitted = off). Docs advise starting at `1.0`; stronger boosting can make the model favour a listed word that was not spoken (a false-positive risk for us — see section 9.5).
  - `enable_substitution`, `substitution_map` — post-transcription find/replace (max 10 rules). **We do not use these.**
- Success `200`:
  ```json
  {"success": true, "request_id": "req_abc123", "timestamp": "20251226_143052.123", "transcript": "..."}
  ```
  (The quick-start page shows an extra `"model"` field. Treat unknown fields as optional; never fail on extra fields.)
- Errors: JSON `{"success": false, "error": {"type": "...", "message": "..."}}` with HTTP `400` (bad params/audio/too long), `403` (permission or credits), `429` (rate limit), `500`, `503`. Retry policy: `429`/`500`/`503` → up to 3 attempts, exponential backoff with jitter (0.5 s, 1.5 s, 4 s). Never retry `400`/`401`/`403`.
- Audio is converted by the server to 16 kHz mono.

### 2.3 Speech-to-text — realtime WebSocket (Prisma v2.5)
- URL: `wss://api.vachana.ai/stt/v3/stream`
- All configuration is sent as **upgrade headers** at connect time:
  - `x-api-key-id` (required), `lang_code` (required, e.g. `hi-IN`)
  - `x-sample-rate` — one of `8000`, `16000`, `44100`, `48000` (default `16000`). **Must match the real audio.**
  - `x-format` — `verbatim` | `transcribe`.
  - `x-bias-list`, `x-bias-score` — word boosting (same rules as REST). Indic words in a header: send a JSON array with `\uXXXX` escapes (Python `json.dumps(list)` already does this).
  - VAD tuning (optional, fixed for the session): `x-vad-threshold` (0.0–1.0, default 0.7), `x-min-silence-ms` (100–2000, default 500), `x-min-speech-ms` (50–2000, default 100; 200 at 8 kHz), `x-min-segment-ms` (100–1000, default 120), `x-max-speech-s` (5.0–120.0, disabled by default).
  - Docs presets: clean web mic → `x-vad-threshold: 0.5`, `x-min-silence-ms: 700`; telephony 8 kHz → `x-vad-threshold: 0.7`, `x-min-speech-ms: 200`, `x-min-silence-ms: 500`.
- **Audio frames:** raw PCM, signed 16-bit little-endian, mono, **every binary frame exactly 1,024 bytes (512 samples)**. Cadence must be real-time: one frame every **32 ms at 16 kHz** (64 ms at 8 kHz). Do not buffer-and-burst. No container (no WAV header) mid-stream.
- Server → client JSON text frames (each has `type` and ISO-8601 `timestamp`):
  - `connected` (with `config.sample_rate`, `config.chunk_size`)
  - `processing` (VAD closed a segment)
  - `transcript` — fields: `text`, `audio_duration_ms`, `segment_id`, `segment_index` (starts at 0), `latency` (ms)
  - `error` — field `message` (may be recoverable)
  - `settings_updated` (only after `update_settings`, which we do not use)
- Transcripts arrive **per VAD segment** (utterance), not per word. Session hard cap is 15 minutes. The undocumented-here `x-partials` / `partial_transcript` option exists; **do not use it**.
- **Our design choice:** the browser downsamples the microphone to **16 kHz mono PCM16** and sends exactly 1,024-byte frames; we connect upstream with `x-sample-rate: 16000`.

### 2.4 Text-to-speech — REST (Timbre)
- `POST https://api.vachana.ai/api/v1/tts/inference`, `Content-Type: application/json`, header `X-API-Key-ID`.
- Body:
  ```json
  {
    "text": "...",
    "model": "timbre-v2.5",
    "voice": "Chitra",
    "language": "hi-IN",
    "speed": 1.0,
    "audio_config": {"sample_rate": 24000, "num_channels": 1, "sample_width": 2, "encoding": "linear_pcm", "container": "wav"}
  }
  ```
  - `model`: `timbre-v2.5` or `timbre-v3.0` (v2.0 is deprecated). **The challenge page lists Timbre v2.5 (beta); default to `timbre-v2.5`**, selectable via env `GNANI_TTS_MODEL`. Voices are **not interchangeable** between models (wrong voice → `400`, the error lists valid voices).
  - `language`: `auto`, `hi-IN`, `en-IN`, `hi-en` (Hinglish), `ta-IN`, `te-IN`, `kn-IN`, `ml-IN`, `mr-IN`, `pa-IN`, `bn-IN`, `gu-IN`.
  - `speed`: 0.85–1.15 (or `"slow"`=0.85, `"medium"`=1.0, `"fast"`=1.15).
  - `audio_config.sample_rate`: 8000, 16000, 22050, 24000, 44100, 48000. `container`: `wav`, `raw`, `mp3`, `ogg`, `mulaw`, `alaw` (`mulaw`/`alaw` force 8000 Hz). `mp3` also accepts `bitrate` (`32k`…`192k`) and does not need `encoding`.
  - Text rule: **pass numbers/IDs/currency as spoken words**, not raw digits (mispronunciation otherwise). Guide: `https://docs.gnani.ai/api/TTS/tts-input-formating.md`.
- Response `200`: **raw binary audio** in the requested container. Errors as in 2.2 (`400/403/429/500/503`).
- Timbre v3.0 additionally supports inline audio tags such as `<pauses>`; with v2.5 tags are stripped. **We do not use tags.**
- Streaming TTS exists (`POST /api/v1/tts/sse`, WebSocket `wss://api.vachana.ai/api/v1/tts`). **Not needed in v1.**

### 2.5 Timbre v2.5 voices (each has one preferred language — always pass the matching `language`)
| Language | `language` | Voices |
|---|---|---|
| English | `en-IN` | Kaveri, Trupti, Devika, Pranav, Shlok, Girish |
| Hindi | `hi-IN` | Nalini, Bhavna, Yashvi, Urmila, Jwala, Chitra, Ambuja, Deepak, Roopesh, Vikrant, Hemraj, Jalaj, Omkar |
| Hinglish | `hi-en` | Poorvi |
| Tamil | `ta-IN` | Asmita, Trisha, Brinda, Vedika, Noopur |
| Telugu | `te-IN` | Suhana, Lehara, Lavanya, Yukti, Varuni |
| Kannada | `kn-IN` | Saanvi, Kavin |
| Malayalam | `ml-IN` | Reshma, Riyaan |
| Marathi | `mr-IN` | Zahira, Ishaan |
| Bengali | `bn-IN` | Kirra, Dhruva |
| Gujarati | `gu-IN` | Falak (F), Veera (M) |
| Punjabi | `pa-IN` | Mehuli, Zayan |

Default **warning voice per language** (calm, clear; all exist in the table above): hi-IN `Chitra`, en-IN `Kaveri`, hi-en `Poorvi`, gu-IN `Falak`, mr-IN `Ishaan`, ta-IN `Brinda`, te-IN `Lavanya`, kn-IN `Kavin`, ml-IN `Reshma`, bn-IN `Kirra`, pa-IN `Zayan`. Store this map in `api/app/config/voices.py`; do not add voices that are not listed here.

### 2.6 Known doc inconsistencies (log them, don't resolve by guessing)
- STT REST max duration: 30 s vs 60 s in different places. We use ≤ 28 s chunks.
- Timbre version naming differs across pages (v2.0 on the Hugging Face card, v2.5 recommended in the API docs, v3.0 announced on the marketing site). We use `timbre-v2.5` unless the human changes `GNANI_TTS_MODEL`.
- Hugging Face card mentions "auto language detection" for STT; the REST/WS docs require an explicit `language_code`. **We always send an explicit code.**

### 2.7 Evon: out of scope
Not used, not referenced in code, not mentioned in the UI. Do not download weights, write serving code, add an LLM client, or add LLM environment variables.

---

## 3. Architecture, stack, repository layout

```
Browser (Next.js PWA-style web app)
  ├─ REST  → FastAPI backend  → Gnani STT REST / TTS REST
  └─ WS    → FastAPI backend  ⇄ Gnani STT WebSocket (server-side headers, key never in browser)
```

### 3.1 Stack (decided — do not re-litigate)
- **Backend:** Python 3.11/3.12, FastAPI, uvicorn, `httpx`, `websockets`, `pydantic` v2, `pyyaml`, `pytest`, `pytest-asyncio`, `respx` (test-only HTTP mocking). System dependency: `ffmpeg` (decode/chunk/convert).
- **Frontend:** Next.js (App Router) + TypeScript + Tailwind CSS, npm. Share-card images via `next/og` (`ImageResponse`). Simple JSON i18n (no heavy i18n library). Fonts via `next/font/google` (self-hosted at build). Allowed UI libraries, pinned: `framer-motion` (the only animation library) and `lucide-react` (icons). **No component kits** (no MUI, Chakra, Mantine, shadcn-default look). Dev-only: `playwright` for screenshots. Verify every package exists on npm (`npm view <pkg> version`) before adding it.
- **Deploy (decided in M7, keep options open now):** frontend on Vercel; backend in a Docker container (ffmpeg included) on any host that supports long-lived WebSockets. Vercel serverless functions **cannot** hold the WebSocket proxy, so the WebSocket must live in the backend service.

### 3.2 Repo layout
```
sajag/
  SAJAG_SPEC.md            # this file (copy in unchanged)
  STATUS.md                # rewritten at end of every milestone
  README.md
  .env.example
  docs/GNANI_API_NOTES.md  # verified + observed API shapes
  api/
    app/{main.py, config/, gnani/, engine/, routes/, util/}
    tests/
    Dockerfile
    pyproject.toml (or requirements.txt, pinned)
  web/
    src/app/...            # pages (section 8)
    src/lib/{audio/, api/, i18n/}
    public/audio/warnings/ # pre-baked Timbre clips (M5)
  data/
    playbook/playbook.yaml # scam types + signals (section 6)
    corpus/scripts/*.yaml  # synthetic call scripts (section 9)
    corpus/audio/          # generated audio (git-ignored except the demo clip)
    demo/                  # demo replay fixtures (M7)
  eval/                    # harness + degrade tools + results/
  scripts/smoke.py         # M0 smoke test
```

### 3.3 Environment variables (`.env.example`; real values only in `.env`)
```
GNANI_API_KEY=
GNANI_TTS_MODEL=timbre-v2.5
STT_FORMAT=verbatim            # verbatim | transcribe
STT_BIAS_ENABLED=false         # decided by eval (section 9.5)
STT_BIAS_SCORE=1.0
ALLOWED_ORIGINS=http://localhost:3000
DAILY_STT_SECONDS_CAP=1800
DAILY_TTS_CHARS_CAP=20000
MAX_LIVE_SESSIONS=5
MAX_LIVE_SESSION_SECONDS=300
MAX_UPLOAD_SECONDS=180
ADMIN_TOKEN=                   # protects /api/usage
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_API_WS_URL=ws://localhost:8000
```

---

## 4. Backend spec

### 4.1 Gnani client module (`api/app/gnani/`)
- `stt_rest.py`: `async transcribe_file(path_or_bytes, language_code, *, fmt, bias_list, bias_score) -> SttResult(transcript, request_id)`; multipart to `/stt/v3`; retry policy from 2.2; typed errors (`GnaniAuthError`, `GnaniQuotaError` for 403, `GnaniRateLimit`, `GnaniBadRequest`, `GnaniServerError`).
- `stt_stream.py`: async upstream WebSocket client using `websockets` with the headers in 2.3. Yields typed events (`Connected`, `Processing`, `Transcript`, `Error`). Validates outgoing frames are exactly 1,024 bytes.
- `tts_rest.py`: `async synthesize(text, language, voice, *, model, speed=1.0, container="mp3", sample_rate=24000, bitrate="64k") -> bytes`. Content-addressed disk cache under `api/.cache/tts/` keyed by sha256 of all inputs. Cache hit = zero credits.
- `usage.py`: counters for STT seconds and TTS characters (day-bucketed, persisted best-effort to `api/.cache/usage.json`). When a daily cap is reached, the Gnani-calling code raises `BudgetExhausted`; routes map it to HTTP `503` with a friendly code `budget_exhausted`.
- Every call logs `request_id` and duration. **Never log audio, transcripts, or the API key.**

### 4.2 Audio utilities (`api/app/util/audio.py`)
- `probe_duration(path)` (ffprobe), `to_wav_16k_mono(path) -> path`.
- `split_on_silence(wav, target=25.0, max=28.0)`: cut near the 25 s mark at the quietest point within ±5 s using ffmpeg `silencedetect` (or sample-RMS scan); hard-cut at 28 s if no silence found. Return ordered chunk paths.
- Reject uploads longer than `MAX_UPLOAD_SECONDS` with `400 audio_too_long`. Reject files > 25 MB.

### 4.3 Endpoints
All JSON unless stated. All responses include no raw audio except where noted.

- `GET /healthz` → `{"ok": true}`.
- `POST /api/analyze/audio` (multipart: `file`, `language_code`) → split → transcribe chunks (concurrency ≤ 3, results reassembled in order) → run the detection engine on the full transcript → return **AnalysisResult** (4.4). Temp files deleted in a `finally`.
- `POST /api/analyze/text` (JSON: `{"text": str, "language_code": str}`) → engine only (no Gnani). Max 8,000 chars.
- `WS /ws/live?lang=hi-IN` — protocol:
  - Client → server: **binary frames only**, each exactly 1,024 bytes (16 kHz mono PCM16 LE). Anything else is ignored and counted; > 20 bad frames closes the socket.
  - Server → client JSON: `{"type":"ready"}` after upstream `connected`; `{"type":"transcript","index":n,"text":"..."}`; `{"type":"risk", ...RiskUpdate}` after each transcript (4.5); `{"type":"error","code":"...","message":"..."}`; `{"type":"end","reason":"client_closed|time_limit|upstream_closed|budget_exhausted"}`.
  - Limits: `MAX_LIVE_SESSION_SECONDS`, `MAX_LIVE_SESSIONS` global, 2 per IP. STT-seconds counted from `audio_duration_ms` of received transcripts **and** wall-clock session time (use the larger, conservative).
  - VAD headers upstream: use the docs' "clean web microphone" preset by default (`x-vad-threshold: 0.5`, `x-min-silence-ms: 700`) because the browser sends 16 kHz mic audio; expose them via env later only if eval shows a need.
- `POST /api/tts/warning` (JSON: `{"kind": "alert_suspicious|alert_scam|explain", "scam_type": str|null, "language_code": str}`) → audio bytes (`audio/mpeg`). **The server composes the text from reviewed templates (section 4.6). The endpoint never accepts arbitrary text** (prevents using our credits as a free TTS service).
- `GET /api/usage` (header `X-Admin-Token`) → today's STT seconds / TTS chars / caps.
- `GET /api/meta` → supported STT languages, which warning languages are `reviewed`, and `engine_attached` (boolean).

CORS: allow only `ALLOWED_ORIGINS`. Rate limiting: in-memory per-IP token bucket (e.g. 10 analyze requests/min, 5 tts/min); document that it resets on restart and is per-instance.

### 4.4 AnalysisResult schema (pydantic; also generate TypeScript types from it or mirror by hand)
```json
{
  "analysis_id": "uuid4",
  "language_code": "hi-IN",
  "transcript": "full text",
  "segments": [{"index": 0, "text": "..."}],
  "level": "safe | suspicious | likely_scam | scam",
  "score": 0,
  "primary_type": "digital_arrest | bank_kyc | upi_refund | utility_disconnect | courier_parcel | tech_support_remote | family_emergency | lottery_prize | investment_task | unknown_suspicious | none",
  "types": [{"type": "digital_arrest", "confidence": "low|medium|high", "matched_categories": ["AUTHORITY_CLAIM","ISOLATION"]}],
  "signals": [{"id": "sig_001", "category": "OTP_PIN_REQUEST", "weight": 4, "evidence": "exact substring of the transcript", "segment_index": 2}],
  "advice_keys": ["hang_up", "never_share_otp", "call_1930"],
  "disclaimer_key": "not_a_guarantee"
}
```
**Hard rule:** every `signals[].evidence` must be an exact substring of the (normalised or raw — pick one, document it) transcript. A unit test enforces this.

### 4.5 RiskUpdate (live)
`{"level","score","primary_type","new_signals":[...], "elapsed_s": float, "first_crossed": {"suspicious": float|null, "likely_scam": float|null}}` — `first_crossed` records the audio-time at which each level was first reached (used for time-to-detect in eval and for the "caught in N seconds" claim, which may only be shown if computed).

### 4.6 Warning templates (`api/app/config/warnings.yaml`)
Per language: `reviewed: true|false`, and text for `alert_suspicious`, `alert_scam`, and one `explain` line per scam type. **No digits in spoken text** — spell numbers as words (e.g. the helpline "1930" is spoken digit-by-digit as words in that language; check the input-formatting guide).
Seed texts (the agent may translate others, but must mark them `reviewed: false`):
- `hi-IN / alert_scam`: "सावधान! यह कॉल ठगी जैसी लगती है। कोई भी कोड या पिन न बताएं, और पैसे न भेजें। अभी फोन काट दें।"
- `hi-IN / alert_suspicious`: "सावधान रहें। इस कॉल में ठगी के कुछ संकेत हैं। कोई भी कोड, पिन या पैसे न दें।"
- `en-IN / alert_scam`: "Warning. This call looks like a scam. Do not share any code or PIN, and do not send money. Hang up now."
- `en-IN / alert_suspicious`: "Be careful. This call has some signs of a scam. Do not share any code or PIN, and do not send money."
- `explain` lines must be one or two short sentences stating *why* in plain words (e.g. for `digital_arrest`: that no real police or court officer demands money or asks you to stay on a video call to be "verified"). Mark India-specific official claims for human verification (section 13).
Only languages with `reviewed: true` are offered for spoken warnings in the UI; others fall back to Hindi/English. `/api/meta` reports this.

---

## 5. Detection engine spec (`api/app/engine/`) — the core of the product

Deterministic, fast, explainable, unit-tested. No network. Works on raw transcript text in any supported script.

### 5.1 Normalisation
NFC normalise; lowercase (Latin); strip zero-width chars; replace punctuation/danda (`।`) with spaces; collapse whitespace. Keep Devanagari and other Indic scripts intact. Maintain a mapping from normalised offsets back to raw offsets so evidence can be quoted from the raw text.
**Do NOT use regex `\b` for Indic text** (Python's `\w` does not treat combining vowel signs as word characters). Match phrases as space-delimited token sequences: pad text and pattern with spaces (`" " + text + " "`, `" " + pattern + " "`) and use substring search, or match token n-grams.

### 5.2 Signal categories (initial weights; tune only on the dev split, section 9)
| Category | Weight | Meaning |
|---|---|---|
| AUTHORITY_CLAIM | 2 | claims to be police, CBI, customs, TRAI, RBI, bank officer, court, cyber cell… |
| THREAT_ARREST | 3 | arrest, warrant, case registered, money laundering, jail |
| ISOLATION | 3 | "stay on the call / video call", "don't disconnect", "digital arrest" |
| SECRECY | 3 | "don't tell anyone", "keep this confidential" |
| OTP_PIN_REQUEST | 4 | asks for OTP, UPI PIN, CVV, card number, password |
| MONEY_TRANSFER | 3 | transfer/send money, "safe account", "verification amount", scan this QR, processing fee |
| REMOTE_ACCESS_APP | 4 | install/open AnyDesk, TeamViewer, QuickSupport, "download this APK" |
| ACCOUNT_THREAT | 2 | account/SIM/electricity will be blocked/cut tonight, KYC expired |
| URGENCY | 1 | right now, within 30 minutes, last warning |
| PRIZE_REFUND | 2 | lottery, prize, refund, cashback, wrong payment sent to you |
| FAMILY_EMERGENCY | 2 | "I'm in an accident/hospital/police station", "this is my new number" |
| PARCEL | 2 | courier/parcel/customs/contraband |
| INVESTMENT | 2 | guaranteed returns, trading group, online tasks for pay |

### 5.3 Playbook file (`data/playbook/playbook.yaml`)
Schema (example, abbreviated; the agent expands it):
```yaml
version: 1
categories:
  OTP_PIN_REQUEST:
    weight: 4
    hard: true
    patterns:
      - {text: "otp", lang: any, reviewed: true}
      - {text: "ओटीपी", lang: hi, reviewed: true}
      - {text: "upi pin", lang: any, reviewed: true}
      - {text: "यूपीआई पिन", lang: hi, reviewed: true}
      - {text: "cvv", lang: any, reviewed: true}
    needs_request_context: true     # see 5.4
  ISOLATION:
    weight: 3
    hard: true
    patterns:
      - {text: "digital arrest", lang: any, reviewed: true}
      - {text: "डिजिटल अरेस्ट", lang: hi, reviewed: true}
      - {text: "video call पर रहिए", lang: hi, reviewed: true}
      - {text: "call mat kaatna", lang: hinglish, reviewed: true}
types:
  digital_arrest:
    all_of: [AUTHORITY_CLAIM]
    any_of: [THREAT_ARREST, PARCEL]
    also_any_of: [ISOLATION, SECRECY, MONEY_TRANSFER]
  bank_kyc:
    all_of: [ACCOUNT_THREAT]
    any_of: [OTP_PIN_REQUEST, REMOTE_ACCESS_APP]
  upi_refund:
    all_of: [PRIZE_REFUND]
    any_of: [OTP_PIN_REQUEST, MONEY_TRANSFER, REMOTE_ACCESS_APP]
  utility_disconnect:
    all_of: [ACCOUNT_THREAT, URGENCY]
    any_of: [MONEY_TRANSFER, REMOTE_ACCESS_APP]
  courier_parcel:
    all_of: [PARCEL, AUTHORITY_CLAIM]
    any_of: [MONEY_TRANSFER, THREAT_ARREST]
  tech_support_remote:
    all_of: [REMOTE_ACCESS_APP]
    any_of: [ACCOUNT_THREAT, PRIZE_REFUND, URGENCY]
  family_emergency:
    all_of: [FAMILY_EMERGENCY, MONEY_TRANSFER]
    any_of: [SECRECY, URGENCY]
  lottery_prize:
    all_of: [PRIZE_REFUND, MONEY_TRANSFER]
  investment_task:
    all_of: [INVESTMENT]
    any_of: [MONEY_TRANSFER, PRIZE_REFUND]
```
Seed phrases per category (agent must expand in English, Hindi-Devanagari, Hinglish-Roman; **expand using real Prisma outputs in M3**, not guesses):
- AUTHORITY_CLAIM: cbi/सीबीआई, police/पुलिस, crime branch/क्राइम ब्रांच, narcotics, customs/कस्टम, trai/ट्राई, rbi/आरबीआई, cyber cell/साइबर सेल, court/कोर्ट, officer/ऑफिसर
- THREAT_ARREST: arrest/अरेस्ट/गिरफ्तार, warrant/वारंट, money laundering/मनी लॉन्ड्रिंग, case/केस दर्ज
- ISOLATION: stay on the call, don't disconnect, video call, digital arrest/डिजिटल अरेस्ट, फोन मत काटना
- SECRECY: don't tell anyone, किसी को मत बताना, kisi ko mat batana, confidential/गोपनीय
- OTP_PIN_REQUEST: otp/ओटीपी, upi pin/यूपीआई पिन, cvv, card number, पिन बताइए
- MONEY_TRANSFER: transfer/ट्रांसफर, पैसे भेजिए, safe account/सेफ अकाउंट, verification amount, qr scan, processing fee
- REMOTE_ACCESS_APP: anydesk/एनीडेस्क, teamviewer/टीमव्यूअर, quicksupport, apk, ऐप इंस्टॉल
- ACCOUNT_THREAT: account block/अकाउंट बंद, kyc/केवाईसी, sim block, बिजली कनेक्शन कट
- URGENCY: right now, immediately, तुरंत, अभी, आज रात
- PRIZE_REFUND: lottery/लॉटरी, prize/इनाम, refund/रिफंड, cashback, kbc
- FAMILY_EMERGENCY: accident/एक्सीडेंट, hospital/अस्पताल, पुलिस स्टेशन में हूँ, नया नंबर, bail/ज़मानत
- PARCEL: courier/कूरियर, fedex, parcel/पार्सल, customs, drugs/ड्रग्स
- INVESTMENT: guaranteed returns, double your money, trading group, telegram task, part-time task
Patterns for languages other than Hindi/Hinglish/English (Gujarati, Marathi, Tamil, …) may be added by the agent but **must be marked `reviewed: false`**; unreviewed patterns are loaded but their signals are flagged `unreviewed` in the result and **never alone push the level above `suspicious`**.

### 5.4 Context rules (these prevent embarrassing false positives)
1. **Negation / warning suppression:** if a negation token appears within 4 tokens before or after an OTP_PIN_REQUEST/MONEY_TRANSFER/SECRECY match, the match is suppressed. Negation tokens include: `mat`, `मत`, `न`, `नहीं`, `kabhi`, `कभी`, `never`, `do not`, `don't`, `not`. (A genuine bank saying "never share your OTP with anyone" must not look like a scammer asking for it.) Needs tests in Hindi, Hinglish and English.
2. **Delivery context:** if DELIVERY words (delivery, डिलीवरी, order, zomato, swiggy, amazon, blinkit, "at your gate") are present and OTP_PIN_REQUEST is the *only* hard category, reduce its weight to 1.
3. **`needs_request_context`:** OTP_PIN_REQUEST counts fully only if a request verb is within 6 tokens (bataiye, batao, share, send, bhejiye, dijiye, बताइए, दीजिए, बोलिए…), otherwise weight 1.
4. **Each category counts once** at its max weight; repeated mentions add +1 up to +2 per category.
5. Each signal records exact evidence text and the segment index.

### 5.5 Scoring and levels (initial values; tune on dev only)
- `score = Σ category scores`.
- `suspicious`: score ≥ 3.
- `likely_scam`: score ≥ 7 **or** any playbook type's requirement is satisfied.
- `scam`: score ≥ 11 **or** (type satisfied **and** ≥ 2 `hard` categories matched).
- `primary_type`: the satisfied type with most matched categories; if none but score ≥ 3 → `unknown_suspicious`; else `none`.
- **Streaming:** the live endpoint re-runs the engine on the cumulative transcript (last 5 minutes max) after every transcript segment. Level may only **escalate** within a session (never silently drop), except via an explicit "reset" from the client.

### 5.6 Tests (`api/tests/engine/`)
≥ 60 table-driven cases covering: every scam type positive in Hindi (Devanagari), Hinglish (Roman), English; negation cases; delivery-OTP; a genuine bank advisory; a genuine family call asking for money for recharge (must not exceed `suspicious`); empty/garbage text; extremely long text; evidence-substring invariant; unreviewed-pattern cap.

---

## 6. (Removed)
This section previously described an optional LLM second-opinion tier. It was removed by decision of the human on 2026-10-20. Section numbers are unchanged so cross-references still work. Do not implement anything here.

---

## 7. Frontend spec (`web/`)

### 7.1 Principles
- Mobile-first (design at 360 px wide), usable by non-technical elders. No jargon on the main screens.
- Never rely on colour alone: every state has an **icon + text + colour**. Respect `prefers-reduced-motion`. All interactive elements keyboard-accessible; status changes announced via `aria-live`.
- Visual direction: **"marked-up paper"**, fully specified in 7.1A to 7.1F below. Those sections override any other styling guidance in this file. Parent mode (7.4) is the same identity at maximum size and minimum density.
- UI languages at launch: English and Hindi (JSON dictionaries). Add more only with human review.
- Always-visible small text: "Sajag is a helper, not a guarantee."

### 7.1A Visual identity: "marked-up paper"

**The one idea.** Sajag behaves like a vigilant family elder reading along with a highlighter and a rubber stamp. The call transcript is a **sheet of paper**. Warning signs get **marked** as they arrive (highlighter for soft signs, a hand-drawn circle for hard ones), short **margin notes** explain why, and the verdict lands as an **ink stamp**. This is the single memorable element; everything around it stays calm, quiet and disciplined. It must look warm, human and trustworthy, not like a cyber-security dashboard.

**Do not build (these read as generic or AI-generated):** a glowing orb or "AI sparkle" iconography; purple/blue gradient washes or mesh gradients; glassmorphism blur cards; neon-on-black; the same rounded card with the same soft grey shadow repeated everywhere; emoji used as icons; stock illustrations or stock photos; fade-and-slide-up on every section; hover lift on every card; all-caps tracked-out eyebrow labels above headings; middle-dot meta strings (`A · B · C`); spaced-em-dash labels (`WORD — fragment`); an arrow glyph appended to every button; a monospace face for small labels; accenting a single word in a headline with a colour or italic.

**Colour tokens** (define as CSS variables in `web/src/styles/tokens.css`; Tailwind reads them; light is `:root`, dark is `[data-theme="dark"]`; default follows `prefers-color-scheme`, with a manual toggle stored in `localStorage` inside try/catch). Starting values; **the agent must compute WCAG contrast for every text/background pair and adjust the `*-text` variants until body text is ≥ 4.5:1 and large text ≥ 3:1, recording the table in `docs/DESIGN.md`**:

| Token | Light "Paper" | Dark "Night ink" | Role |
|---|---|---|---|
| `--bg` | `#F5F7FB` | `#0E1030` | page background (cool, not cream) |
| `--sheet` | `#FFFFFF` | `#171A45` | the transcript paper |
| `--ink` | `#14163A` | `#ECEEFF` | primary text |
| `--ink-muted` | `#4A4E7A` | `#A5A9D6` | secondary text |
| `--line` | `rgba(20,22,58,.12)` | `rgba(236,238,255,.14)` | borders, ruled lines |
| `--stamp` | `#2A2FB8` | `#8C93FF` | brand colour (stamp-pad ink), primary actions, links |
| `--marker` | `#FFD60A` | `#FFD60A` at 40% opacity | highlighter for soft signs ("suspicious") |
| `--alarm` | `#E5322D` | `#FF5A52` | circles, scam stamp, scam colour field |
| `--alarm-text` | `#B91C1C` | `#FF8A84` | alarm used as text |
| `--safe` | `#12A150` | `#3DDC84` | "no signs found" only |
| `--safe-text` | `#0B6B34` | `#3DDC84` | safe used as text |

Colour rules: marker yellow = soft signals; vermilion circle/stamp = hard categories and scam; stamp-blue = brand and primary actions; green appears **only** to say "no signs found". Never use red decoratively. Never rely on colour alone (always icon + text + colour).

**Typography** (`next/font/google`, `display: swap`; request the `latin` and, where the family provides it, `devanagari` subsets; **verify each family and subset actually exists in the installed `next/font` metadata and adjust if not; never invent a font name**):
- Display: **Bricolage Grotesque** (700–800) for headlines and the wordmark. For Hindi headlines the stack falls back to **Mukta** 800.
- Body and UI: **Mukta** (400/500/700), which covers Latin and Devanagari so Hindi and English look like one voice.
- Margin notes only: **Kalam** (handwriting, Latin and Devanagari), 18–22 px, at most six words per note, slightly rotated (±1.5°).
- No monospace anywhere. Use tabular numerals (`font-variant-numeric: tabular-nums`) for timestamps.
- Scale (mobile to desktop, `clamp`): display 40/0.98 → 88/0.95, tracking −0.02em; h2 28 → 44; h3 22 → 28; body 17–18 / 1.6; small 14–15. **Devanagari needs about 10% larger size and line-height ≥ 1.7** (apply via a `:lang(hi)` rule). Parent mode body ≥ 24 px, headings ≥ 40 px.
- Line length ≤ 68 characters for reading text.

**Shape, surface, elevation.** Radius by role, not one radius everywhere: sheet 6 px with a subtly folded top-right corner; buttons fully rounded (pill); inputs 14 px; dialogs 20 px; marks are SVG shapes, not boxes. Flat surfaces with 1 px `--line` borders by default. The **only** layered shadow is the call sheet, which has two faint sheets peeking out behind it, offset and rotated 0.6° and 1.1°. A very faint paper grain (SVG `feTurbulence` noise at ≤ 4% opacity, inlined, no image files) on `--bg` is allowed; remove it if it costs performance.

**Layout.** Container max 1120 px; 8-pt spacing scale (4/8/12/16/24/32/48/72/112); generous vertical rhythm; left-aligned text (centred only for short single-line statements and the stamp); 12-column grid on desktop, single column on mobile with a 16 px gutter. Structural devices (rules, numbering) appear only where they carry meaning: the "how it works" steps are a true sequence and may be numbered; nothing else is.

**Motion.** One orchestrated moment: **the mark-swipe and the stamp thump** (7.1B). Everything else is responsive micro-feedback only (button press, sheet open, toggle), 120–220 ms, ease-out. No scroll-triggered entrance animations. `prefers-reduced-motion`: marks appear instantly, the stamp appears without the slam, nothing loops. On Android, `navigator.vibrate([200,100,200])` once when the level first reaches `likely_scam` (feature-detected, with the user's mute respected).

### 7.1B Signature components (build as small, typed, reusable components, with a dev-only gallery at `/dev/ui` that renders every state; the route calls `notFound()` in production)

1. **`<CallSheet>`** — the paper. Props: segments (`{index, text}`), signals (`{evidence, category, weight, segment_index}`), level, `lang`. Renders transcript lines with tabular-numeral timestamps in the left gutter, signals as `<Mark>`s, margin notes in the right gutter on desktop and indented below the line on mobile. New lines enter by appearing in place (no slide). Handles long transcripts (virtualise or cap to the last 60 lines with "earlier lines" disclosure).
2. **`<Mark>`** — two kinds. *Highlight* (soft categories): a slightly irregular SVG/CSS marker stroke behind the phrase, animated left to right over ≈ 350 ms (`background-size` or clip-path). *Circle* (hard categories: OTP_PIN_REQUEST, MONEY_TRANSFER, REMOTE_ACCESS_APP, ISOLATION, SECRECY): a hand-drawn vermilion ellipse around the phrase drawn with `stroke-dashoffset` over ≈ 450 ms. Phrases that wrap across lines must still render correctly (use per-line fragments). Each mark is keyboard-focusable and exposes its category and explanation in an accessible description.
3. **`<MarginNote>`** — a Kalam note linked to a mark by a thin hand-drawn arrow, text from `warnings.yaml`/i18n category labels in plain words ("asks for OTP", "wants money first", "stay on the call"). Max one note per category per call.
4. **`<VerdictStamp>`** — an SVG rubber stamp rotated about −7°, ink texture via `feTurbulence` + `feDisplacementMap`, `mix-blend-mode: multiply` in light theme. States: `no signs found` (green seal, calm), `careful` (blue stamp-pad ink), `likely scam` and `scam` (vermilion, larger). Bilingual labels (EN + HI) set in the display face. Lands with a 180 ms scale-down "thump" (1.4 → 1.0, slight overshoot) once per level change; never re-animates on re-render. The stamp text is also present in the DOM as `role="status"` text so screen readers announce it. **Wording rule:** never "safe" or "100%"; the lowest state is "no signs found".
5. **`<LevelStrip>`** — a slim horizontal ruler (tick marks like a school ruler) with four labelled zones and a marker that moves along it as the score rises; it only escalates during a live session. Replaces any "meter/gauge/orb".
6. **`<CallTimeline>`** — a thin track for the call's duration with a dot per signal, coloured by kind; tapping a dot scrolls the sheet to the line. The "first flagged at m:ss" label may appear **only** from computed `first_crossed` values.
7. **`<Seal>`** — the brand mark: a circular rubber-stamp seal containing the word सजग and a small waveform line, doubling as favicon and app icon. Draw it as SVG yourself; do not reproduce any existing logo.
8. **Controls** — primary button: pill, `--stamp` fill, ≥ 52 px tall, a real pressed state, visible keyboard focus ring (2 px `--stamp` offset 2 px). Secondary: outlined. Inputs ≥ 48 px. Language toggle (EN / हिं) and theme toggle in the top bar. Dialogs and sheets trap focus and close on Escape. Toasts are plain, no apology language.

### 7.1C Landing page composition

Desktop wireframe (the headline and sheet are the hero; there is no hero image or video):
```
[Seal Sajag]                                   [EN | हिं] [theme]  ( Check a recording )

  Is this call                            ┌───────────────────┐
  a scam?                                 │ paper call sheet   │  ← tilted ~1.5°, layered sheets
  क्या यह कॉल ठगी है?                      │ marked phrases     │
                                          │ margin notes       │
  Sajag listens, marks the warning        │            [STAMP] │
  signs, and tells you out loud, in       └───────────────────┘
  your language, when to hang up.
  ( Watch Sajag catch a scam )  Set up for my parents
```
Below the fold, in this order: (1) **How it works**, three real steps (Listen, Mark, Warn) each with a small custom SVG; (2) **Built for how India speaks**: language names set at a large size in their own scripts, Hinglish called out, one honest sentence on noisy phone lines (no numbers unless from `/accuracy`); (3) **Scams Sajag knows**, a typographic index (type name large, one plain-language sentence beside it) rather than a card grid; (4) **For your parents**, a full-width band previewing Parent mode; (5) **Honest limits**, short and visible, linking to `/about`; (6) footer with credits ("Speech recognition and voice by Gnani Prisma and Timbre"), privacy note, and the GitHub link. No badge rows, no emojis.

Hero sheet content: in M0.5 it shows a **short invented example dialogue labelled "Example, written by us"** with hand-placed marks (static). In M7 it is replaced by the real demo replay (7.6) with the same visual. It must never be presented as a live result.

Plain-language scam index copy (agent may refine; keep it factual, no statistics):
- Digital arrest: someone says they are police or CBI, claims you are under "arrest", and tells you to stay on the call.
- Fake KYC: your account will be blocked unless you update details and share a code.
- Refund or wrong payment: money "sent by mistake", then they ask for your PIN or a QR scan.
- Electricity bill: power will be cut tonight unless you pay or call a number.
- Courier and customs: a parcel in your name has something illegal; pay to clear it.
- Tech support: install an app so they can "fix" your phone.
- Family emergency: a voice like your child or grandchild, in trouble, asking for money and secrecy.
- Lottery and prizes: you won something; first pay a fee.
- Investment and tasks: easy money from tasks or guaranteed returns.

### 7.1D Share assets
- `/api/og` produces two designs from the same layout: **Open Graph 1200×630** and **Story 1080×1920**. Typographic poster: marked-up lines "Hang up." / "Do not share the code." / "Do not send money." with marker strokes, the stamp, and "Check your call" with the site URL. Level-aware: only a warning variant exists (no "all clear" share card).
- **Devanagari in `next/og` (Satori) may render conjuncts and vowel signs incorrectly.** Test it. If any Hindi glyph renders wrong, the OG/story images use English text only and the Hindi stays on the page itself. Do not ship a broken Hindi image.
- Query params carry only `type`, `level`, `lang`. No transcript content, ever.

### 7.1E Copy and tone
Plain verbs, sentence case, active voice, one job per sentence. Buttons say exactly what happens ("Start listening", "Check a recording", "Tell my family"); the same action keeps the same name across the flow. Errors say what happened and what to do, without apologising. Empty states are invitations ("No call yet. Press Start listening, or try a recording."). No fear-mongering, no "AI-powered" filler, no promises of protection. Hindi copy written by the agent is `reviewed: false` until the human approves it (section 13).

### 7.1F UI acceptance checklist (used at M0.5 and again at M7)
- Looks intentional at 360×800 and 1440×900, in light and dark. No horizontal scroll at 320 px.
- Contrast table in `docs/DESIGN.md` complete; all body text ≥ 4.5:1.
- Keyboard-only walkthrough of every page works; visible focus everywhere; `aria-live` announces level changes; the stamp text is readable by a screen reader.
- `prefers-reduced-motion` emulation checked: nothing animates except instant state changes.
- Hindi renders correctly everywhere (screenshots), with correct line-height.
- Landing route JS ≤ 150 KB gzipped; fonts subset; no layout shift from fonts; Lighthouse (mobile) numbers recorded in `docs/DESIGN.md` (accessibility target ≥ 95; do not claim performance numbers you did not measure).
- No console errors or warnings; no unused placeholder text; no emoji anywhere in UI or README.
- Screenshots of landing, live (with example data), result, parent, report, accuracy, about, saved to `docs/screens/` for the human's review. In `STATUS.md` write a short self-critique: what you changed after looking at them.

### 7.2 Pages
- `/` Landing: one-line promise, the three ways to use it (Live, Check a recording, Paste text), the "Try the demo" button, the honest limits, a link to `/accuracy`.
- `/live` Live mode (7.3).
- `/check` Upload audio (drag-drop/file input, ≤ 3 min) or record in-browser (MediaRecorder) → progress → result card.
- `/paste` Paste text → result (calls `/api/analyze/text`).
- `/parent` Parent mode (7.4).
- `/demo` Demo replay (7.6).
- `/accuracy` Evaluation results page generated from `eval/results/latest.json` (shows counts, precision/recall/FPR, time-to-detect, per-language and per-noise tables, and the **limitations**, including that part of the test set is synthetic).
- `/about` How it works, privacy, limits, what data is (not) stored, credits to Gnani models used.
- `/report` (share card landing): reads `type`, `level`, `lang` query params only (no PII) and renders a shareable page with Open Graph image from `/api/og` (`next/og`): big warning, scam type label, "Hang up. Don't share codes. Call the national cyber-crime helpline", the app URL. **No transcript content in the URL.**

### 7.3 Live mode
- Language selector (STT language), **Start** button (user gesture; also primes audio playback), mic permission explanation.
- Mic capture: `getUserMedia({audio: {channelCount: 1, echoCancellation: false, noiseSuppression: false, autoGainControl: true}})` as the default for *second-device listening* (tune in M4 by testing; document the result).
- An **AudioWorklet** resamples to **16,000 Hz mono**, converts to Int16 little-endian, and emits **exactly 1,024-byte frames (512 samples)** as they fill (≈ every 32 ms in real time). Pure functions for resample/frame are in `src/lib/audio/` and unit-tested (frame size invariant, no sample loss across buffers).
- WebSocket to `NEXT_PUBLIC_API_WS_URL/ws/live?lang=...`; handle `ready/transcript/risk/error/end`; auto-stop at the server time limit; show remaining time.
- UI: the `<CallSheet>` with `<LevelStrip>`, `<VerdictStamp>` and `<CallTimeline>` (section 7.1B; no generic meter or orb), the rolling transcript as the sheet with **marked evidence phrases** and margin notes, "what to do now" list (hang up; don't share OTP/PIN; don't send money; don't install apps; call the national cyber-crime helpline; tell a family member), and a **Warn my family** button.
- When the level first reaches `likely_scam`, auto-play the pre-baked warning clip (`/audio/warnings/{lang}/alert_scam.mp3`); on `suspicious`, play the shorter alert once. Never play the same alert more than once per 60 s. "Mute" and "Stop" always visible.
- On session end: show summary + "Share this warning" (links to `/report?...`).

### 7.4 Parent mode (`/parent`)
One screen, minimal: a huge **Start listening** button, a **full-screen colour field** for status (green "no signs found", marker-yellow "careful", vermilion "scam, hang up" with a giant `<VerdictStamp>`; the field colour change is accompanied by large text and an icon), Hindi-first, text ≥ 24 px, plays the spoken warning automatically, and a single **Tell my family** button.
**Tell my family** opens `https://wa.me/?text=<urlencoded text>` (no phone number; the user picks the contact). The text contains the scam type name and the app link, never any transcript content.

### 7.5 Result card (shared by check/paste/live summary)
Level badge; scam-type label (human words); up to 5 evidence quotes with the category label; "Why this looks like a scam" (1–2 plain sentences, from templates); advice list; **Listen** button (calls `/api/tts/warning` with `kind=explain`); "Not a guarantee" disclaimer; share button.

### 7.6 Demo replay (`/demo`)
- Plays a **clearly labelled synthetic call** (audio generated with Timbre in M7; banner text: "Synthetic demo call — pre-recorded. Transcripts were captured earlier from Prisma on this audio. Use Live mode to run on your own audio.").
- Replays cached per-segment transcripts (fixture JSON with audio timestamps) through the **same engine** so the sheet is marked and the stamp lands in sync with the audio. The fixture is produced by `scripts/make_demo_fixture.py`: take one dev-split synthetic scam clip, stream it through the **real live pipeline once at real-time pace**, and record the wall-clock offset at which each transcript segment arrived. These are the genuine times a live user would have seen, so any "flagged after N seconds" shown on the page is real. This costs zero credits and gives visitors an instant try-it experience.
- It must never be presented as a live run. The 60-second submission video must show **Live mode**, not this page.

---

## 8. Synthetic corpus and evaluation (`data/corpus`, `eval/`)

Goal: produce **honest numbers** we can show on `/accuracy` and quote in the submission.

### 8.1 Script files (`data/corpus/scripts/*.yaml`)
```yaml
id: da_hi_017
language: hi-IN            # language the dialogue is spoken in (hi-IN | en-IN | hi-en | gu-IN ...)
label: digital_arrest      # a scam type, or "legit"
legit_kind: null           # for legit: bank_advisory | delivery_otp | family_money | customer_care | appointment | chitchat
difficulty: easy|medium|hard
turns:
  - {speaker: caller, text: "..."}
  - {speaker: victim, text: "..."}
split: dev|test            # assigned deterministically from sha256(id): 70% dev / 30% test
```
- **All content is invented by us. No real phone numbers, names of real people, account numbers, Aadhaar or PAN.** Use obviously fake identifiers or none. Spell digits as words in spoken text.
- Minimum corpus for the first eval: 9 scam types × ≥ 3 scripts × (Hindi, Hinglish, English) ≈ 81 scam scripts, plus **≥ 81 legit scripts** including the hard negatives: real-style bank advisory ("never share your OTP"), delivery-partner OTP, family member asking for a small amount, genuine customer care, doctor/appointment reminder, plain chit-chat. Scripts 6–14 turns, 30–90 s spoken.
- Language quality: the agent drafts, the human reviews a sample. Scripts in languages the human cannot verify are marked `reviewed: false` and excluded from headline numbers.

### 8.2 Audio generation (`eval/make_audio.py`)
- Synthesise each turn with Timbre using the speaker's voice for the language (caller vs victim use two different voices from the section 2.5 table; always the voice's preferred `language`). Concatenate turns with 200–600 ms pauses. Output 16 kHz mono WAV.
- **Budget guard applies** (rule 0.7). Print projected totals first; wait for human approval beyond the thresholds.

### 8.3 Degradation (`eval/degrade.py`, numpy + ffmpeg, no external datasets)
Variants per script: `clean` (16 kHz), `tel` (8 kHz, 300–3400 Hz band-pass, μ-law companding implemented in numpy — **not `audioop`**), `tel_noise15` and `tel_noise5` (add synthetic white+pink noise at 15 dB and 5 dB SNR computed from RMS). Seeded RNG for reproducibility.
Note for the README: **TTS→STT round-trips are optimistic** (clean synthetic voices). To counter this the human records a small set of **staged human-voice calls** (section 13); report their results separately.

### 8.4 Runner (`eval/run_eval.py`)
- Inputs: split (`dev`|`test`), variants, language filter, config (STT format, bias on/off).
- Pipeline per audio: STT via the **production code path** (REST chunking) → engine → record `level`, `primary_type`, signals.
- Streaming simulation for time-to-detect: feed segment transcripts in order with their cumulative audio time; record first time `suspicious` and `likely_scam` were reached.
- Metrics (overall and per language, per variant, per type): for the binary decision "level ≥ likely_scam": precision, recall, F1, **false-positive rate on legit scripts**; type accuracy among detected scams; median and p90 time-to-detect (seconds); character error rate of STT vs the known script text (secondary; normalise punctuation/case/digit-words consistently and document how).
- Output: `eval/results/<timestamp>.json` and a `latest.json` consumed by `/accuracy`. Always include: counts, config, git commit, date, and a "limitations" list.
- **Discipline:** tune playbook/thresholds using **dev only**. Run `--split test` **at most once per milestone-defined freeze** and record it in `STATUS.md`. If you tune after seeing test results, say so.

### 8.5 STT configuration experiments (dev split, small)
Decide with data, not opinion (and record in `docs/DECISIONS.md`):
1. Hinglish speech: `hi-IN` vs `en-IN` as `language_code`.
2. `format=verbatim` vs `transcribe`.
3. Word boosting off vs on (`bias_list` of single letter-only words such as OTP, KYC, CBI, UPI, AnyDesk, TeamViewer, arrest plus Devanagari equivalents; score 1.0). Report the **false-positive rate change**, because boosting can invent trigger words.
Keep each experiment within the budget guard.

---

## 9. Security, privacy, cost control

- No audio and no transcript is written to disk beyond temp files deleted in `finally`; no transcripts in logs; no database of user content. Only anonymous counters (requests, STT seconds, TTS chars) are kept.
- Show a plain-language consent line before mic use or upload: audio is sent to Gnani for transcription and not stored by Sajag; only record calls you are allowed to record; do not use for evidence.
- No transcript or audio is ever sent anywhere except to Gnani's STT endpoints (audio) — never to any other service.
- Protect credits: per-IP rate limits, global concurrency cap, daily caps, session time cap, TTS endpoint limited to template text, TTS cache, pre-baked warning clips, demo replay with cached fixtures, and a kill switch env `MAINTENANCE_MODE=true` that makes Gnani-calling routes return `503 maintenance`.
- Input validation on every route (size, type, language whitelist). Never trust filenames. Temp files in a private temp dir.
- CORS strict; security headers on the web app; no third-party trackers.

---

## 10. Milestones

Run **one milestone at a time**, only when the human says so. Each ends with: tests green, pushed, `STATUS.md` written. Dates are targets.

### M0 — Scaffold + proof the Gnani APIs work (target 10-20)
0. **Do section 0.1 first** (machine check, `git init`, remote, first commit with the spec, venv, Next.js scaffold), pushing to `origin/main`.
1. Create the repo layout (section 3.2), `.env.example`, `.gitignore` (ignore `.env`, `api/.cache/`, `data/corpus/audio/`, `node_modules/`, `eval/results/*.json` except `latest.json`), pinned `pyproject.toml`/requirements, minimal FastAPI app with `/healthz`, a minimal Next.js app that shows the API health.
2. Copy section 2 into `docs/GNANI_API_NOTES.md` under "Documented", and fetch the live pages (`llms.txt`, STT REST, STT WebSocket, TTS REST, voices) to confirm; list any differences.
3. `scripts/smoke.py` (needs the human's `.env`): (a) TTS REST: synthesize one short Hindi sentence (`timbre-v2.5`, `Chitra`, `hi-IN`, WAV 16 kHz) and save it; (b) STT REST: transcribe that WAV with `hi-IN`; (c) STT WebSocket: read the WAV with the `wave` module, stream raw PCM in exact 1,024-byte frames at 32 ms cadence, then send ≥ 1 s of zero-frames so VAD closes the segment, and print received events. Print STT-seconds and TTS-chars used.
4. Record in `docs/GNANI_API_NOTES.md` under "Observed": real response JSON shapes (redact ids), latencies, any differences from the docs.
- **Acceptance:** the repo is initialised and pushed to `origin/main` with the spec as the first commit; `python scripts/smoke.py` succeeds on all three steps with the human's key; `pytest` runs (even if only a health test); `npm run build` passes; `STATUS.md` contains the real outputs. If any step fails, stop and report — do not continue to M1.

### M0.5 — Design system and app shell (target 10-21)
Build the visual identity (7.1A to 7.1F) **before any feature page**, so every later page is built on it.
1. `docs/DESIGN.md`: tokens, type scale, the computed contrast table, component inventory, motion rules, the "do not build" list.
2. `tokens.css`, Tailwind wiring, `next/font` setup (verify families/subsets exist), light/dark theme with toggle, EN/HI language toggle and dictionaries, app shell (top bar with `<Seal>`, wordmark, toggles; footer).
3. Components from 7.1B with a dev-only `/dev/ui` gallery showing every state (empty, loading, error, each level, reduced motion). Gallery data is labelled "fixture" and the route is not reachable in production.
4. The landing page (7.1C) with the labelled static example sheet. Placeholder routes for `/live`, `/check`, `/paste`, `/parent`, `/demo`, `/accuracy`, `/about`, `/report` that render the shell and a clear "coming in a later milestone" message (an honest empty state, not fake content).
5. Playwright screenshot script `npm run shots` writing to `docs/screens/` at 360×800 and 1440×900, light and dark, plus reduced-motion emulation.
- **Acceptance:** the full 7.1F checklist passes; `npm run build` and typecheck pass; screenshots and a self-critique are in `STATUS.md`. **Stop here and wait for the human's visual review; do not start M1.**

### M1 — Transcription pipeline (target 10-21)
Gnani client modules (4.1), audio utilities (4.2), `POST /api/analyze/audio` returning transcript + segments (engine not yet attached: `level: "safe"`, `signals: []` is **not allowed** as a stub in production code — return only transcript fields and have the route marked `engine_attached=false` in `/api/meta` until M2), `/check` page with upload + record + transcript view.
- **Acceptance:** a 2-minute test file is chunked, transcribed in order, no chunk > 28 s; error paths tested with `respx` (400/403/429/500/503, timeouts); temp files cleaned; usage counters work and caps trigger `budget_exhausted`.

### M2 — Detection engine (target 10-22)
Section 5 in full + playbook v1 + `POST /api/analyze/text` + `/paste` page + result card.
- **Acceptance:** all engine tests pass (≥ 60 cases); evidence-substring invariant test passes; the negation/delivery/genuine-bank cases do not exceed `suspicious`; `/api/analyze/audio` now runs the engine.

### M3 — Corpus + evaluation harness (target 10-24)
Section 8. Write scripts (dev-first), calibrate budget with a **5-clip calibration run** and ask the human to read the dashboard credit change before scaling, generate audio, run dev eval, run the 8.5 experiments, expand playbook patterns from real Prisma outputs, freeze, run the **test** split once.
- **Acceptance:** `eval/results/latest.json` exists with all metrics; `/accuracy` renders it; `docs/DECISIONS.md` records the 8.5 outcomes with numbers; the human has been told the credit usage.

### M4 — Live mode (target 10-26)
`/ws/live`, `stt_stream.py`, AudioWorklet + framing, `/live` page, risk updates, evidence highlighting, level-escalation rule, limits.
- **Acceptance:** with a laptop playing a synthetic scam call through its speaker and a phone running `/live`, the level reaches `likely_scam`; a fake-upstream integration test verifies relay, frame validation, session limits and error handling; unit tests for the worklet math pass; document the mic-constraint findings.

### M5 — Voice: Timbre warnings + Parent mode (target 10-28)
`tts_rest.py` cache, `warnings.yaml`, `/api/tts/warning`, `scripts/bake_warnings.py` (generates `web/public/audio/warnings/{lang}/*.mp3` for reviewed languages — budget guard applies), `/parent`, **Listen** button, WhatsApp share, `/report` + OG image.
- **Acceptance:** all pre-baked clips exist and play; `/api/tts/warning` rejects anything outside the template set; Parent mode works at 360 px wide; the human has listened to every clip (the agent cannot judge pronunciation — list the clips for review in `STATUS.md`).

### M6 — (Removed)
Evon and any LLM tier were removed by decision of the human. Skip M6 entirely and go from M5 to M7. This milestone number is kept so the others do not change.

### M7 — Hardening, deploy, launch kit (target 11-01)
Rate limits, caps, maintenance mode, Dockerfile, deploy config, `README.md` (what it is, honest limits, architecture diagram, how to run, eval table, credits to Gnani), `/about`, `/demo` fixtures and page (7.6), accessibility pass, Lighthouse run (record numbers), security checklist from section 9.
- **Acceptance:** the 7.1F UI checklist passes again with real data on every page (screenshots refreshed); public URL works on a real Android phone; all pages load on 360 px; the demo replay is labelled; `/api/usage` is protected; no secrets in git history (`git log -p` search for the key prefix is clean); README numbers match `latest.json`.

Launch kit (script, captions, posts) is prepared by the human with Claude in chat after M7, not by you.

---

## 11. Style notes
- Backend: typed, small functions, async where I/O bound, no global mutable state except the explicit usage counters and rate limiter. Docstrings on public functions. Ruff + black defaults.
- Frontend: strict TypeScript, no `any`, components small, text via i18n dictionaries, no hard-coded user-facing strings outside dictionaries.
- Errors shown to users are plain and actionable ("The service is busy, please try again in a minute"), never stack traces.

---

## 12. `STATUS.md` template (rewrite fully at the end of each milestone)

```
# STATUS — after M<n> — <date/time IST>
## Done
- bullet list of what exists now (files/endpoints/pages)
## Evidence (real outputs, trimmed, key redacted)
- command → result
## Tests
- pytest: X passed / Y failed; npm build: pass/fail; other
## Gnani usage this milestone
- STT seconds: …   TTS characters: …   (credit change reported by human: …)
## Deviations from the spec (and why)
## Doc differences found (live docs vs spec)
## Dependencies added (name==version — reason)
## Open questions for the human
## Ready for next milestone? yes/no (+ blockers)
```

---

## 13. Things only the human can do (agent: list any that are blocking in STATUS.md)
0. Place `SAJAG_SPEC.md` in the empty project folder, create the (empty) GitHub repo, give the agent its URL, make sure `git` can authenticate to it, and install system tools the agent reports missing (for example `ffmpeg`).
1. Create `.env` with `GNANI_API_KEY` from `https://app.gnani.ai/voice`.
2. After the M3 calibration run: read the credit change on the Gnani dashboard and report it.
3. Review a sample of the generated scripts, and every non-Hindi/non-English warning text, with a native speaker before flipping `reviewed: true`.
4. Listen to every pre-baked Timbre clip (pronunciation of numbers and the helpline).
5. Record ≥ 30 **staged human-voice** scam/legit calls with consenting friends/family (fake names, fake numbers, no real personal data) in different rooms/devices/noise, for the honest "real voice" evaluation row.
6. Verify India-specific official claims quoted in advice/explain texts (for example the national cyber-crime helpline number and portal, and statements about what police/courts do not do) against current government advisories on `cybercrime.gov.in` before publishing.
7. (Removed: Evon is out of scope.)
8. Deployment accounts, domain, and the public posts (LinkedIn/X with `#GnaniAI` and `#GreatIndianAIInternshipChallenge`; the posts must be live before submitting).
