# Sajag

Sajag is a scam-call shield for Indian families. It transcribes a suspicious call with Gnani Prisma (speech-to-text), checks it against a rule-based scam playbook (no generative model), marks the warning signs, and speaks a warning with Gnani Timbre (text-to-speech).

Status: early scaffold (milestone M0). The full README is written in milestone M7. The build specification is [SAJAG_SPEC.md](SAJAG_SPEC.md); current progress is in [STATUS.md](STATUS.md).

## Run locally (Windows, PowerShell; these are the commands used during M0)

Requirements: Python 3.13, Node.js 20.9 or newer, ffmpeg.

Backend:

```
py -3.13 -m venv api/.venv
api\.venv\Scripts\python.exe -m pip install -r api/requirements.txt
cd api
.venv\Scripts\python.exe -m pytest -q
.venv\Scripts\python.exe -m uvicorn app.main:app --port 8000
```

Web:

```
cd web
npm install
npm run build
npm run dev
```

Gnani smoke test (needs `.env` with `GNANI_API_KEY`, see `.env.example`), from the repo root:

```
api\.venv\Scripts\python.exe scripts\smoke.py
```

## Limitations & Honest Reporting
- **Script & Rule Authorship:** The synthetic corpus scripts and the detection rules were authored by the same engineering process.
- **Acoustic Cleanliness:** Synthetic TTS speech passed to STT is substantially cleaner than real telephony calls (no packet drop, carrier codec degradation, or heavy acoustic reverberation).
- **Headline Accuracy:** The true headline accuracy will come from an unseen holdout set (evaluated exactly once after playbook freeze) and staged human-voice calls.
