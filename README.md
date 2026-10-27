# Sajag (सजग) — AI Scam-Call Shield for Indian Families

Sajag (सजग) is a real-time, privacy-first companion and scam-call shield designed for Indian families. It transcribes suspicious telephone calls using **Gnani Prisma** multi-lingual speech-to-text across 10 Indian languages, evaluates cumulative transcripts against a deterministic, rules-based scam playbook (zero generative models, zero hallucinations), visibly marks warning signs on an ink-style case sheet with a dynamic rubber stamp, and speaks regional voice warnings using **Gnani Timbre** voice synthesis.

---

## Architecture Diagram

```
                                      ┌─────────────────────────────────────┐
                                      │   Mobile Phone / Second Device      │
                                      │  (Speakerphone audio at 16 kHz)     │
                                      └──────────────────┬──────────────────┘
                                                         │  PCM16 mono audio
                                                         │  via WebSocket /ws/live
                                                         ▼
┌───────────────────────────────────────────────────────────────────────────────────┐
│ FastAPI Streaming Pipeline (api/app/)                                             │
│                                                                                   │
│  1. Pacing & Framing     ──────► 2. Gnani Prisma STT Relay                        │
│     (1024-byte chunks,             (16 kHz multi-lingual ASR streaming)           │
│      32 ms cadence)                                    │                          │
│                                                        ▼                          │
│  4. Timbre Voice Warning ◄────── 3. Deterministic Detection Engine                │
│     (Reviewed regional             (Regex signals, weights, risk escalation:      │
│      spoken alert clips)            safe -> suspicious -> likely_scam -> scam)   │
└────────────────────────────────────────┬──────────────────────────────────────────┘
                                         │ JSON Events (segments, signals, level)
                                         ▼
┌───────────────────────────────────────────────────────────────────────────────────┐
│ Next.js 15 Web Client (web/src/)                                                  │
│                                                                                   │
│  • Live Mode (/live)       • Parent Mode (/parent)     • Offline Check (/paste)   │
│  • Dynamic CallSheet       • Verdict Rubber Stamp      • Demo Replay (/demo)      │
└───────────────────────────────────────────────────────────────────────────────────┘
```

---

<!-- BEGIN_README_NUMBERS -->
### Empirical Benchmark Results

Evaluated on 239 audio clips across clean and telephony variants with real background noise (Gnani Prisma STT → Deterministic Rules Engine):

| Evaluation Split | Clips / Scripts | Modality | Scam Recall | False Alarm Rate (Legit) | F1 Score |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **Overall Corpus** | 239 | Audio (WAV → STT → Engine) | 76.3% (87/114) | 0.0% (0/125) | 0.866 |
| **DEV Split** | 113 | Audio (WAV → STT → Engine) | 83.9% (47/56) | 0.0% (0/57) | 0.913 |
| **TEST Split** | 54 | Audio (WAV → STT → Engine) | 75.0% (21/28) | 0.0% (0/26) | 0.857 |
| **HOLDOUT Split** | 60 | Audio (WAV → STT → Engine) | 63.3% (19/30) | 0.0% (0/30) | 0.775 |
| **FINAL HOLDOUT** (frozen engine) | 10 | Text-Only (zero STT noise) | 100.0% (5/5) | 40.0% (2/5)* | 0.833 |

- **STT Mean CER**: 9.7% on multi-lingual Indian speech.
- **Real-Time Live Streaming (WebSocket)**: Evaluated on 6 live scam calls at real-time 32 ms pacing; median time to detect `likely_scam` is **18.2s audio time** (18.9s wall-clock latency).
- *** Known Weakness**: On the frozen final holdout, 2 out of 5 genuine advisory or alert scripts mentioning OTP/SIM/refund were flagged as suspicious. Legitimate bank advisories remain a known source of false alarms and are documented in [docs/DECISIONS.md](docs/DECISIONS.md).
<!-- END_README_NUMBERS -->

---

## Honest System Limitations (Spec 1.1)

1. **Mobile OS Sandboxing**: Modern mobile operating systems (Android and iOS) deliberately isolate telephone dialers and WhatsApp from background web applications. Browsers cannot directly tap cellular call audio. Users run Sajag on a nearby tablet, laptop, or second phone while placing the primary phone on speakerphone.
2. **Acoustic Noise**: Real-world speaker-to-mic acoustic transmission suffers from room reverberation, ambient chatter, and aggressive mobile microphone noise gating.
3. **Advisory False Positives**: Official advisories from banks and police warning citizens *"Never share your OTP or click refund links"* mention the exact keywords scammers use. In our frozen holdout evaluation, 2 of 5 legitimate warning scripts triggered suspicious alerts.
4. **Sajag is a helper, not a guarantee**: No algorithmic shield detects 100% of evolving social engineering techniques. Never share OTPs, PINs, or money with unverified callers.

---

## How to Run Locally

### Prerequisites
- **Python**: 3.13+ (standard library + `ffmpeg` installed on PATH)
- **Node.js**: 20.9+ (Node 22 LTS recommended)
- **Gnani API Key**: Obtain from [https://app.gnani.ai/voice](https://app.gnani.ai/voice)

### 1. Setup Backend API
```bash
# Clone the repository
git clone https://github.com/Ppratik765/SAJAG.git
cd SAJAG

# Configure environment
cp .env.example .env
# Edit .env and set your GNANI_API_KEY=...

# Create virtual environment and install dependencies
python -m venv api/.venv
api/.venv/Scripts/python.exe -m pip install -r api/requirements.txt

# Run backend test suite (162 tests)
cd api
.\.venv\Scripts\python.exe -m pytest

# Start API server
.\.venv\Scripts\python.exe -m uvicorn app.main:app --port 8000
```
*Expected output: Uvicorn running on `http://127.0.0.1:8000`. Querying `http://127.0.0.1:8000/healthz` returns `{"status":"ok"}`.*

### 2. Setup Web Client
In a second terminal:
```bash
cd web
npm install
npm run lint
npm run build
npm run dev
```
*Expected output: Next.js dev server running on `http://localhost:3000`.*

### 3. Docker Compose (Full Stack)
```bash
docker compose up --build
```

---

## Security & Privacy Guarantee

- **Zero Audio Retention**: Audio uploaded for analysis is converted in ephemeral directories and unlinked immediately in a guaranteed `finally` block.
- **Zero Transcript Storage**: Transcripts and evidence quotes are held exclusively in volatile RAM during the call and are never written to disk or database stores.
- **Sanitized Logging**: Server logs record only anonymized event types and credit counters; no API keys, phone numbers, or caller dialog are ever logged.
- **Rate Limiting & Circuit Breaker**: Public endpoints are protected by per-IP token buckets (`/api/analyze/audio`: 10/min, `/api/analyze/text`: 30/min, `/api/tts/warning`: 5/min). When `MAINTENANCE_MODE=true` is set, billable speech APIs safely answer HTTP 503 while text analysis remains fully active.

---

## Credits & Model Attributions

Built for the **Great Indian AI Challenge** utilizing Indian language speech foundation models from **Gnani.ai**:
- **Gnani Prisma Speech-to-Text (v2.5)** — Multi-lingual Indian speech recognition (Hindi, English, Tamil, Telugu, Bengali, Gujarati, Marathi, Kannada, Malayalam, Punjabi).
- **Gnani Timbre Voice Synthesis (v2.5)** — Natural regional speech synthesis for emergency spoken warnings.

---

## License

This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.
