# Gnani API notes

Two parts:
- **Documented**: section 2 of `SAJAG_SPEC.md`, copied unchanged, then a re-check against the live docs on 2026-10-20.
- **Observed**: what the real API actually returned when `scripts/smoke.py` ran.

---

## Documented (copied from SAJAG_SPEC.md section 2, verified 2026-10-19)

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
Not used, not referenced in code, not mentioned in the UI.

---

## Live-docs re-check (2026-10-20, M0 step 2)

Pages fetched as markdown:
- `https://docs.gnani.ai/llms.txt`
- `https://docs.gnani.ai/api/STT/speech-to-text.md`
- `https://docs.gnani.ai/api/STT/stt-websocket.md`
- `https://docs.gnani.ai/api/TTS/tts-inference.md`
- `https://docs.gnani.ai/api/TTS/available-voices.md`

**Everything in section 2 that we rely on matches the live docs.** Endpoints, auth headers, STT REST fields, `bias_list`/`bias_score` rules, WebSocket headers, VAD header ranges and defaults, the 1,024-byte / 32 ms frame rule, server message types and fields, the TTS body, models, `language` values, `speed`, `audio_config` values, and the full Timbre v2.5 voice table (42 voices, same names and languages) all match.

Differences and additions found (none change our design):

| # | Topic | Spec section 2 | Live docs (2026-10-20) | Impact |
|---|---|---|---|---|
| 1 | STT REST max duration | 30 vs 60 s noted | Still inconsistent: the page intro and field docs say 60 s; the OpenAPI operation description says "Maximum duration: 30 seconds"; the 400 example says "exceeds maximum limit of 60 seconds". | None. We keep ≤ 28 s chunks. |
| 2 | STT REST extra fields | not mentioned | The word-boosting section mentions `multi_lang_codes` and a `model` field ("omit `model`, or `Prisma v2.5`"). Neither appears in the OpenAPI request schema. | None. We do not send them. |
| 3 | STT REST 403 | listed | The prose error table lists 400/429/500/503 only; 403 appears in the OpenAPI block (type `FORBIDDEN`). | None. We handle 403 as in the spec. |
| 4 | STT REST 200 schema | `success, request_id, timestamp, transcript` | The OpenAPI `STTResponse` schema lists only `success, timestamp, transcript`; the example and prose include `request_id`. | Treat `request_id` as optional. |
| 5 | WebSocket `lang_code` | required | Table says Required = Yes but also lists a default of `en-IN`. | None. We always send it. |
| 6 | WebSocket extra headers | not mentioned | `itn_native_numerals` (no `x-` prefix), `x-enable-substitution`, `x-substitution-map`. `update_settings` can also change `bias`. | None. Not used. |
| 7 | "Clean web microphone" preset | listed with VAD values | The docs show this preset with `x-sample-rate: 48000`. We use its VAD values (`0.5` / `700`) with `x-sample-rate: 16000`, because we resample to 16 kHz in the browser. | Design choice from spec 2.3/4.3, recorded here. |
| 8 | TTS defaults | not stated | `audio_config.sample_rate` defaults to `48000`; `bitrate` defaults to `128k`; `audio_config` is listed as required in the OpenAPI schema. | We always send `audio_config` explicitly. |
| 9 | TTS encodings | `linear_pcm` | Also `pcm_s16le`, `pcm_mulaw`, `pcm_alaw`, `oggopus`. | None. Not used. |
| 10 | TTS 403 | listed | Prose table omits 403; OpenAPI block includes it. | None. |
| 11 | Timbre v3.0 voices | not listed | 13 voices: Avinash, Shivani, Lakshmi, Kalpana, Shubham, Prakash, Devansh, Yashraj, Chetana, Vasudha, Riyaa, Tarika, Harshad. Each speaks all 10 languages. | Only relevant if the human sets `GNANI_TTS_MODEL=timbre-v3.0`. The voice map would then need a separate v3.0 table. |

---

## Observed (from `scripts/smoke.py` executed 2026-10-20)

### 1. TTS REST (`POST https://api.vachana.ai/api/v1/tts/inference`)
- **Status:** `200 OK`
- **Observed latency:** `1.09s` for a 55-character Hindi sentence.
- **Content-Type:** `audio/wav`
- **Output audio shape:** 16,000 Hz, 1 channel (mono), 16-bit signed PCM (`sample_width=2`), 3.84s duration (122,924 bytes).
- **Observed behavior:** Timbre generates WAV audio with streaming placeholder sizes (`0xFFFFFFFF` in RIFF header and data chunk). Standard WAV decoders calculate unbounded frame counts unless patched with true file lengths. `scripts/smoke.py` patches the header so standard tools correctly recognize `duration=3.84s`.

### 2. STT REST (`POST https://api.vachana.ai/stt/v3`)
- **Status:** `200 OK`
- **Observed latency:** `0.33s` (end-to-end); `processing_time`: `0.23s`.
- **Response JSON shape:**
  ```json
  {
    "success": true,
    "request_id": "<uuid-redacted>",
    "transcript": "नमस्ते, यह सजग प्रणाली का परीक्षण है, कृपया सतर्क रहें।",
    "model": "gnani-prisma-v2.5",
    "processing_time": 0.2297,
    "end_to_end_latency": 0.2311
  }
  ```
- **Differences from OpenAPI doc:** Response includes `"model"`, `"processing_time"`, and `"end_to_end_latency"` in addition to `"success"`, `"request_id"`, and `"transcript"`.
- **WAF note:** Cloudflare WAF on `api.vachana.ai` inspects multipart form bodies. In production, audio uploads are converted/encoded using ffmpeg (`audio.py`) rather than arbitrary uncompressed raw stream buffers.

### 3. STT WebSocket (`WSS wss://api.vachana.ai/stt/v3/stream`)
- **Status:** Connected and successfully streamed at 32 ms real-time cadence (1,024-byte frames at 16 kHz).
- **Observed latency:** `86 ms` segment transcription latency after VAD closed segment.
- **Observed event stream:**
  1. Handshake `connected`:
     ```json
     {
       "type": "connected",
       "message": "STT service ready — VAD service connected",
       "request_id": "<uuid-redacted>",
       "config": {
         "sample_rate": 16000,
         "chunk_size": 512,
         "partials_enabled": false,
         "partial_interval_ms": 450,
         "partial_max_window_s": 15.0,
         "language_code": "hi-IN",
         "format": "verbatim"
       },
       "timestamp": "2026-10-20T03:40:10.811545+00:00"
     }
     ```
  2. `speech_start`:
     ```json
     {
       "type": "speech_start",
       "utterance_id": "ud1827e1b",
       "timestamp": "2026-10-20T03:40:11.095231+00:00"
     }
     ```
  3. `transcript`:
     ```json
     {
       "type": "transcript",
       "text": "नमस्ते, यह सजग प्रणाली का परीक्षण है, कृपया सतर्क रहें।",
       "audio_duration_ms": 4288.0,
       "segment_id": "<redacted>",
       "segment_index": 1,
       "utterance_id": "ud1827e1b",
       "is_final": true,
       "latency": 86,
       "timestamp": "2026-10-20T03:40:15.182238+00:00"
     }
     ```
- **Differences from spec / docs:**
  - An event with `"type": "speech_start"` and `"utterance_id"` is sent when speech begins.
  - The transcript event includes `"utterance_id"` and `"is_final": true`.
  - The `connected` event echoes `partials_enabled`, `partial_interval_ms`, and `partial_max_window_s`.

