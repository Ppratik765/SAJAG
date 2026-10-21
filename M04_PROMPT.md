# M4 — Engine hardening (M4a) + Live mode (M4b)

Read `SAJAG_SPEC.md` sections 2.3, 4.3, 4.5, 5.5, 7.3 and `docs/M06_ALIVE_BRIEF.md` first. Rules 1–7 of the spec still apply (no invented API facts, evidence for every claim, budget guard). Do the work in two parts, commit after each part, update `STATUS.md` at the end of each. Do not start M5.

Budget: M4a is text-only (0 credits). M4b may use at most ~150 credits total, mostly for the 4 timed live runs in 4b-9. Print STT seconds and TTS characters used. Cache everything.

---

## PART M4a: close the "advisory-imitation" hole (text engine only, 0 credits)

**Problem (reproduce first, paste the output).** These scam texts currently under-score because the advisory-frame suppression treats the *words* "advisory / fraud prevention / be alert / security" as a reason to ignore a demand:

1. `This is RBI security advisory. Your account will be frozen. Be alert and tell me the OTP right now.` -> currently `safe` (1)
2. `This is State Bank fraud prevention team. Your account is compromised. Share the OTP immediately to stop the fraud.` -> currently `suspicious` (5)
3. `मैं पुलिस से बोल रहा हूँ। आपके नाम पर नकली पासपोर्ट मिला है, अरेस्ट वारंट है। अभी पैसे ट्रांसफर करें।` -> loses THREAT_ARREST because of "नकली"

**Principle to implement (general, not per script).** An advisory frame protects a phrase only when the sentence **tells the listener NOT to do the thing** (an explicit negated or protective directive: never/do not/मत/कभी नहीं + share/give/tell/send/enter, or "report/call 1930"). It must **not** protect a sentence that **asks the listener to do the thing**. Concretely:

- Keep a list in the playbook of **demand-to-listener patterns**: imperative or request forms directed at the listener with a credential/money object, e.g. `tell me`, `share the`, `read out`, `send me`, `give me`, `enter the`, `transfer`, `pay`, `install`, and Hindi/Hinglish `बताइए`, `बताओ`, `भेजिए`, `दीजिए`, `ट्रांसफर करें`, `bataiye`, `bhejiye`, `batao`. Source these from what the engine and playbook already contain; do not invent new Hindi from memory without marking the pattern `reviewed: false`.
- Resolution order per sentence: (1) explicit negated directive governing this exact verb -> suppress (as today). (2) demand-to-listener pattern present **without** a negation governing it -> **never suppress**, regardless of advisory keywords (`advisory`, `awareness`, `prevention`, `security`, `alert`, `fake`, `नकली`, `सावधान`...). (3) otherwise the existing advisory-frame rule.
- Advisory *keywords* alone (fake, नकली, advisory, awareness, report, शिकायत, prevention, vigilant) must stop suppressing THREAT_ARREST and MONEY_TRANSFER unless rule (1) applies. "नकली पासपोर्ट मिला है, अरेस्ट वारंट है" is a scam sentence, not an advisory.
- Evidence-substring invariant must still hold. Everything is data in `playbook.yaml`, no hard-coded phrase lists in `matcher.py`.

**Test set (authoring rules).**
- Write **16 new adversarial scam scripts** in `data/corpus/scripts/adv_*.yaml`, `split: dev`, label `scam`: scammers imitating bank / RBI / police / TRAI advisory or fraud-prevention teams while asking for OTP/money/remote access (8 English, 8 Hindi/Hinglish). Vary wording; do not just paraphrase the three examples above.
- Write **16 matching hard legit scripts** `split: dev`, label `legit`, `legit_kind: bank_advisory`: genuine advisories and a genuine bank "we will never ask for your OTP, please do not share" call, plus a genuine fraud-prevention outreach where the caller says "please do not share the OTP with anyone, even me".
- Hold out **half of each** (8 scam + 8 legit) as `split: adv_holdout`. **Do not look at their results while changing the engine.** Run them exactly once at the end of M4a and report them untouched. Tune only against the other 16.
- Text-engine only: add a `--text-only` path to `eval/run_regression.py` that scores `data/corpus/scripts` via `analyze_text` on the script text (label this clearly as "text, no STT noise" in all output and on `/accuracy`).

**Acceptance for M4a.**
- The three problem sentences above reproduce before, and after the change #1 and #2 reach at least `likely_scam`, #3 keeps THREAT_ARREST. Print signals before/after.
- Unit tests: each of the three, plus `Never share your OTP with anyone, even me` and `Police never ask for money transfer` stay suppressed/safe.
- Full regression table (dev, test, holdout, fresh_holdout, adv_dev, adv_holdout) with before/after. Dev/test scam recall must not drop; dev/test/holdout/fresh legit false positives must stay 0. If any legit false positive appears, report it, do not hide it by re-tuning on adv_holdout.
- `/accuracy` page: add a row for adv_dev and adv_holdout labelled "text only", and rewrite the limitation to: "Scam calls that imitate advisory language: hardened in M4a, measured on N scripts (text only), see table." Report the real numbers, whatever they are. Do not call it solved.

Commit: `M4a: ...`.

---

## PART M4b: Live mode

Implement exactly the spec: section 4.3 `WS /ws/live`, 4.5 RiskUpdate, 5.5 streaming escalation rule, 7.3 Live UI, plus the M0.6 brief (alive UI) for `/live`. Do not rely on memory of the Gnani WS shape; use `docs/GNANI_API_NOTES.md` section 2.3 and 3 (observed events: `connected`, `speech_start`, `processing`, `transcript` with `is_final`/`utterance_id`). If observed behaviour differs from the spec, write the difference into the notes and STATUS.

### Backend
1. `api/app/gnani/stt_stream.py`: async client to `wss://api.vachana.ai/stt/v3/stream`, headers per notes (`x-api-key-id`, `lang_code`, `x-sample-rate: 16000`, `x-format: verbatim`, clean-web-mic VAD preset `0.5` / `700`). Typed errors. Never log the key or audio.
2. `api/app/routes/live.py`: `WS /ws/live?lang=`. Validate `lang` against the supported list before connecting upstream. Frame validation: binary only, exactly 1,024 bytes, ignored+counted otherwise, >20 bad frames closes. Forward frames upstream **at the cadence they arrive**; do not buffer-and-burst. Server -> client messages exactly as spec 4.3 (`ready`, `transcript`, `risk`, `error`, `end`). Handle both partial-less transcripts and `speech_start` (surface it as `{"type":"speech"}` so the UI can show "listening").
3. Streaming engine: after each transcript segment, re-run the engine on the cumulative transcript (last 5 minutes max). Level only escalates within a session. Track `first_crossed` (audio time = cumulative `audio_duration_ms` of segments plus offsets, **not** wall clock) for `suspicious` and `likely_scam`. Evidence quotes must be exact substrings of the cumulative transcript.
4. Limits and cost guards: `MAX_LIVE_SESSION_SECONDS` (default 180), `MAX_LIVE_SESSIONS` global (default 3), 2 per IP, idle timeout (no audio for 20 s closes with `end`), STT seconds counted as the larger of wall-clock and sum of `audio_duration_ms`, written to `api/.cache/usage.json` via existing `usage.py`. Daily cap -> `end` with `budget_exhausted`. Origin check against `ALLOWED_ORIGINS`.
5. Upstream failures: auth/403 -> `error` code `upstream_auth` / `upstream_quota` and close; upstream drop -> `end` reason `upstream_closed`; client disconnect cleans up the upstream socket and decrements counters in a `finally`.
6. **Fake-upstream integration test** (no credits): a local fake WS server that speaks the observed protocol. Tests: relay and cadence, bad frame handling, escalation (safe -> suspicious -> likely_scam never goes down), `first_crossed` values, session time limit, per-IP and global limits, upstream error mapping, cleanup on disconnect. Use `pytest` + `websockets`/Starlette test client.

### Frontend
1. `web/src/lib/audio/`: pure functions `resampleTo16k`, `floatToPcm16`, `Framer` (accumulates samples, emits exactly 1,024-byte frames, no sample loss across buffers). Unit tests (vitest or existing runner) for: frame size invariant, no samples lost or duplicated across arbitrary buffer sizes, resampling 48k and 44.1k to 16k keeps duration within 1 frame, clipping.
2. `web/public/worklets/pcm-worklet.js` (AudioWorkletProcessor) sending Float32 blocks to the main thread; framing and WS send on the main thread or worker, your choice, but document it.
3. `/live` page per spec 7.3 and the alive brief: language selector, Start (user gesture), mic permission explanation, `<CallSheet>` with rolling transcript and evidence marks, `<LevelStrip>`, `<VerdictStamp>`, `<CallTimeline>`, remaining-time countdown, Stop and Mute always visible, "what to do now" list, **Warn my family** (WhatsApp link, no transcript content). Show "listening" on `speech` events. Reduced-motion respected. `aria-live` announces level changes.
4. Warning audio hooks: when M5 clips do not exist yet, the level-change code path must call a `playWarning(kind, lang)` that no-ops cleanly if the file is missing (M5 adds the clips). Do not generate TTS in M4.
5. Error UI for every `error`/`end` code, mic denied, no mic found, WS failure, plus a visible reconnect/restart.
6. Mic constraints: implement `echoCancellation: false, noiseSuppression: false, autoGainControl: true` as default, and add a hidden dev toggle on `/dev` to try the other combinations. **Document what you actually tested** (see 4b-9); do not claim results you did not measure.

### Measurement (this is the headline number, so be honest)
7. `scripts/live_replay.py`: streams a corpus WAV file through our own `/ws/live` **at real-time cadence** (32 ms per frame), prints each message and writes `eval/results/live_ttd.json` with, per clip: `first_crossed.suspicious`, `first_crossed.likely_scam` (audio time), wall-clock latency from the end of the triggering utterance to the `risk` message, final level, and STT seconds used.
8. Run it on **6 scam clips (clean) and 2 legit advisory clips**, one run each. Choose them **before running** by listing the ids in STATUS.md: 3 dev scam, 3 test scam (different scam types, at least 2 Hindi), plus `holdout_legit_ba_en_001` and `fresh_holdout_legit_police_hi_001`. Also run **2 of the same scam clips using the `tel_noise15` variant**. Total audio sent must stay under ~600 s; if it would exceed that, write the projection to STATUS.md and use fewer clips. Report every result, including misses.
9. Laptop-speaker-to-phone-mic test is manual and the human will do it, so do **not** fabricate it. Instead write `docs/LIVE_MANUAL_TEST.md`: exact steps, the 3 mic-constraint combos to try, what to record (device, browser, level reached, seconds), and a results table template for the human to fill in.
10. Evidence: screenshots saved to `docs/screens/m4/` via Playwright for `/live` in states: idle, listening, mid-call suspicious, likely_scam with stamp, error, mobile 360 px. Drive the UI with a **mocked WS** (a dev-only fixture), and label them as mocked in STATUS.md. Self-critique: what you changed after looking.
11. `/accuracy`: add a "Live time-to-detect" table from `live_ttd.json` (n, median, min, max of audio-time to `likely_scam`, with the clip list). The words "caught in N seconds" may appear on the site only from this file, with n shown.

### Acceptance for M4b
- Fake-upstream tests pass; frame-math unit tests pass; full `pytest` and web build pass (paste counts).
- One real run through Gnani is shown end to end for at least one scam clip: paste the message log (redacted ids), the `first_crossed` values, and credits used.
- `STATUS.md` is rewritten: what is done, evidence, measured numbers, the 8 live-replay results as a table, open questions, credits counters (STT seconds, TTS chars) and a line "dashboard reading needed from the human".
- Do not state any number, speed, or claim that is not in a file you produced in this milestone.

Commit: `M4b: ...`. Push.
