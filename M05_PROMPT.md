# M5 — Voice warnings, Parent mode, Report share card (with M4 cleanup first)

Read `SAJAG_SPEC.md` sections 4.3 (`/api/tts/warning`), 4.6 (warning templates), 7.4 (Parent mode), 7.3 (live auto-play rules), the `/report` bullet in 7.2, 7.1 design system, and `docs/GNANI_API_NOTES.md` sections 2.4, 2.5 (voices). Rules 1–7 of the spec still apply: no invented API facts, every claim needs evidence, budget guard. Commit after each part. Do not start M7.

Budget: TTS is the only credit spend. Hard cap **8,000 TTS characters** total for this milestone, counted by the script, and print the count before and after. Cache everything (cache hit = 0 credits). If the projected total exceeds the cap, stop and write the projection into STATUS.md.

---

## PART 0: M4 cleanup (small; do this first; text only plus one replay, max ~60 credits)

1. **Replay pacing is slower than real time.** In `eval/results/live_logs/*.json` the final transcript for a ~28 s clip arrives at ~36.9 s wall-clock, and segments land every ~9 s for 6 s of audio. The spec requires one 1,024-byte frame every 32 ms in real time. Fix `scripts/live_replay.py` to pace with absolute deadlines (`t0 + n*0.032` via `loop.time()`), not `sleep(0.032)` after work. Log the achieved send duration vs audio duration and the max frame lateness. The same pacing must exist in the browser sender: measure it in the AudioWorklet path and write the result into STATUS.md (the worklet is driven by the audio clock, so say what you actually measured, not what you expect).
2. **Report time-to-alert as the user would feel it.** Add to `live_ttd.json` per clip: `wall_first_suspicious_s` and `wall_first_likely_scam_s` (seconds from stream start, from the event log), in addition to the existing audio-time `first_crossed`. `/accuracy` and STATUS must show **both** columns and say plainly that detection happens once per speech segment (about 6 s of audio per segment), so the real alert delay is segment length plus upstream latency. The "Detector latency ~4 ms" line only measures our engine; relabel it "our detector, per update" and show the measured upstream STT latency (`latency` field from the `transcript` events) instead as the real number.
3. **Re-run the same 10 pre-declared clips unchanged** after the pacing fix. Report every row, including clips that still end `suspicious` or `safe` (bk_en_001 did). Credits for this run must be printed.
4. **Holdout hygiene.** In M4c the agent printed the signals of `holdout_*`, `fresh_holdout_*` and `adv_holdout_*` failures into STATUS while tuning. Those splits are therefore **contaminated** from now on. Relabel `adv_holdout` as "adv_holdout (contaminated after M4c)" everywhere, state that the 0/8 legit false positives there after the fix were not an independent test, and keep the M4a untouched numbers (6/8 recall, 2/8 legit FP) in the table as the only clean adv-holdout result. Do not hide the remaining text-only false positives: holdout 2/15 and fresh_holdout 1/6 stay in the table.
5. **Fresh test set.** Write **10 new scripts** (5 scam in the advisory-imitation style, 5 hard legit advisory in Hindi/English/Hinglish), `split: final_holdout`, text only. Do not run them until Part 5, and then only once. Do not look at their results before the engine is frozen.

---

## PART 1: Warning templates and voices

1. `api/app/config/warnings.yaml` per spec 4.6. Languages: `hi-IN` and `en-IN` have `reviewed: false` until the human has listened and confirmed (the human flips these); all others `reviewed: false` and not baked. Use the seed texts in spec 4.6 verbatim. Add `alert_suspicious`, `alert_scam`, and one `explain` line per scam type in the playbook (list the exact type ids from `playbook.yaml`; do not invent types) in Hindi and English. Rules: no digits in spoken text (helpline spoken as words, e.g. "one nine three zero" / "एक नौ तीन शून्य"), one or two short sentences per explain line, plain words, no unverified official claims. Anything that states what real police, courts, RBI or banks do or do not do must be listed in STATUS.md under "Claims for the human to verify".
2. `api/app/config/voices.py` already holds the default voices; use hi-IN `Chitra`, en-IN `Kaveri` only. Do not add voices.
3. `POST /api/tts/warning` (spec 4.3): body `{"kind","scam_type","language_code"}`, validated against the template set; **rejects any other kind, type or language with 400 and never accepts free text**. Returns `audio/mpeg`. Per-IP limit (5/min), checks the daily TTS cap via `usage.py`, uses the content-addressed cache. Tests: valid combos, rejects free text field if present, rejects unknown type, cap exhausted -> 429/503 with a clear code, cache hit uses 0 characters.
4. `scripts/bake_warnings.py`: generates `web/public/audio/warnings/{lang}/{kind}.mp3` and `.../explain_{type}.mp3` for `hi-IN` and `en-IN`. Prints a characters-used table. Estimate first and write the projection (characters per file) into STATUS.md before running. Run it once. Commit the generated mp3s (they are small; confirm total size and report it).
5. Create `docs/WARNING_REVIEW.md`: a table of every clip (path, language, exact spoken text, duration in seconds from the file) with an empty "Human verdict (ok / mispronounced / fix text)" column. The agent cannot judge pronunciation, so do not say the clips are good; say they are generated and awaiting review.

## PART 2: `playWarning` wiring

1. Replace the no-op stub in `/live` with real playback of the pre-baked clips: first time the level reaches `likely_scam` (or `scam`) play `alert_scam`; first time `suspicious` plays `alert_suspicious`. Never the same alert more than once per 60 s. Respect Mute. Play only after the user's Start gesture (autoplay policy). If a clip is missing or the language has no baked clips, fall back to Hindi if the UI language is Indic and `hi-IN` is baked, otherwise English; never silently fail: show a small visible "audio unavailable" note.
2. Add a **Listen** button on the result card (shared by check/paste/live summary, spec 7.5) that plays the `explain` clip for the detected type in the selected language.
3. Test with Playwright (mocked WS fixture, as in M4b): assert the correct `Audio.src` is requested for each transition and the 60 s rule, and save a screenshot of the Listen button state. Label mocked screenshots as mocked.

## PART 3: Parent mode `/parent` (spec 7.4)

One screen, Hindi-first, text at least 24 px, huge **Start listening** button, full-screen colour field for status with icon and large text (never colour alone): green "no signs found", marker-yellow "careful", vermilion "scam, hang up" with a giant `<VerdictStamp>`. Reuses the live WebSocket and the Part 2 audio. A single **Tell my family** button opens `https://wa.me/?text=<urlencoded>` with no phone number; text contains the scam type name and the app link, **never transcript content**. Works at 360 px wide with no horizontal scroll. Respect reduced motion. Screenshots at 360 px for the four states (mocked), saved to `docs/screens/m5/`. Write the Hindi UI strings in `i18n` and list them under "Hindi strings for the human to review".

## PART 4: `/report` share card and OG image

`/report` reads only `type`, `level`, `lang` (validate against allowlists; anything else renders a neutral page, never reflects raw input) and shows: a big warning, the scam type label, "Hang up. Do not share codes. Call the national cyber-crime helpline", and the app URL. Add `/api/og` via `next/og`. **Test Devanagari rendering in the OG image** (spec section 7.2 note): render the PNG, look at it, and if any Hindi glyph or conjunct is wrong, use English text only in the image and keep Hindi on the page. Save the rendered OG PNGs for hi and en to `docs/screens/m5/` and state what you found. "Share this warning" from the live summary links to `/report?type=...&level=...&lang=...`.

## PART 5: Final engine freeze check (text only, 0 credits)

1. Freeze the engine and playbook: record the commit hash in STATUS.md.
2. Run the 10 `final_holdout` scripts **once**. Report recall and false positives exactly, with the scripts that fail listed and their signals. Do not tune afterwards. If you want to change the engine after seeing this, you must say so and relabel `final_holdout` contaminated.
3. Update `/accuracy` with this row labelled "final holdout (n=10, text only, run once)". Do not call it solved. Keep the plain-language limitations list current.

## Acceptance for M5

- `pytest` and `npm run build` pass (paste counts). New tests cover `/api/tts/warning` validation and the 60 s alert rule.
- Every clip listed in `docs/WARNING_REVIEW.md` exists; characters used by bake printed and under the 8,000 cap.
- Parent mode at 360 px and OG image screenshots exist in `docs/screens/m5/`.
- STATUS.md rewritten: what is done with evidence, credit counters (STT seconds, TTS chars), claims and Hindi strings for human review, the final_holdout result, and "dashboard reading needed from the human".
- Nothing in STATUS or on the site claims anything not measured in a file produced by this milestone.

Commit: `M5: ...`. Push.
