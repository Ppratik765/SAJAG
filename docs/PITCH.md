# Sajag (सजग): one-page pitch

**Challenge:** Great Indian AI Internship Challenge by Gnani.ai  |  **Builder:** Priyanshu Pratik  |  **Status:** working prototype

## Problem
"Digital arrest" scams, fake bank-fraud calls and parcel-and-warrant calls work by **pressure**, not hacking: a fake officer, urgency, secrecy and a demand for money. The person on the call is often an older parent with nobody listening for the pattern. Number-blocking and after-the-fact reporting do not help the person who is already on the call.

## Solution
**Sajag listens to the call (on speakerphone, on a second device), marks the warning signs on a transcript with the exact words as evidence, and says when to hang up** by screen verdict and by a spoken warning in Hindi or English.

1. **Gnani Prisma** streams the call into live text (Hindi, English, Hinglish tested).
2. A **deterministic rules engine** (no LLM) scores the growing transcript against a scam playbook. Every mark is an exact quote, so a family member can see *why* the call was flagged.
3. **Gnani Timbre** speaks a short warning; **Parent mode** gives a huge-text, one-button screen; **Tell my family** opens WhatsApp with the scam type only (never call content).

## Why this design
- **Explainable:** no hallucination; a person can check each mark against what was said.
- **Cheap and fast:** rule matching adds milliseconds; the only paid steps are speech-to-text and pre-baked voice clips.
- **Honest by default:** every number on the site is generated from files; limits are shown next to the results.
- **Private:** audio and transcripts are not stored; a static showcase needs no backend at all.

## What is measured (all from `eval/results/`)
- 239-clip synthetic corpus through Prisma: **76.3% scam recall, 0 of 125 legitimate calls flagged** (holdout recall 63.3%). Optimistic: the speech is synthetic and clean.
- Final holdout, 10 text scripts, run once: **5/5 scams flagged, 2/5 genuine advisories also flagged**: the known weakness.
- Live streaming replay at real-time pace: 5 of 6 scam clips reached "likely scam" at **11.8 to 24.7 s** of audio (median 18.2 s); one stayed safe.
- Two public examples (a news-channel recording of a fake-police call, an HDFC awareness dramatisation) flagged "likely scam" at **16.1 s** and **18.4 s** into the call.

## Limits we state openly
Not a guarantee; can miss scams and false-alarm on genuine bank advisories; needs a second device because phones block call-audio capture; evaluated on Hindi, English, Hinglish only; spoken warning clips await native-speaker review.

## Gnani models used
**Prisma** (REST and WebSocket STT) for transcripts; **Timbre v2.5** (Chitra, Kaveri) for spoken warnings.

## Next steps
Native-speaker review of warnings; test on real phone-line audio with consenting volunteers; more languages; an Android helper for one-tap family alerts; a bank-advisory allow-list to cut false alarms.

**Repo:** github.com/Ppratik765/SAJAG  |  **Demo:** https://sajag-alpha.vercel.app/test
