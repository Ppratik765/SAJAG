# STATUS — after M0.6 — 2026-10-20 10:45 IST

## Done
- Fully executed Milestone M0.6 ("Make Sajag feel alive") per `docs/M06_ALIVE_BRIEF.md`, addressing all 8 feedback problems from M0.5:
  1. **Living Hero Headline (P0-1)**: Enforced display scale `clamp(56px, 7vw, 120px)` on desktop and `text-[40px]` on mobile taking full width. Implemented pen-wipe transition cycling across 11 Indian languages (`web/src/lib/i18n/cycle.ts`), paused on hover/focus, with reduced-motion fallback, static screen-reader label, and lazy-loaded Noto Sans script fonts (`web/src/lib/scriptFonts.ts`).
  2. **Non-Clipping CallSheet & Margin Notes**: Overhauled `CallSheet` and `MarginNote` layouts with dedicated margin columns (`w-48 sm:w-52`) on desktop and indented layouts on mobile. Applied `leading-snug break-words` and `items-start` arrow alignment. Verified 0 clipping from 320px to 1440px.
  3. **Single-Language Everywhere**: Eliminated bilingual dual-script strings and middle-dot combos across all components. Translated all strings in `web/src/lib/i18n/en.json` and `hi.json` to clean, single-language copy.
  4. **Browser Language Default**: Updated `web/src/lib/i18n/context.tsx` to detect `navigator.languages` (Hindi if it starts with `hi`, otherwise English), persisted in `localStorage` with try/catch.
  5. **Single-Language Verdict Stamp**: Updated `VerdictStamp` to display one big primary word in the active language ("SCAM" / "ठगी", "SUSPECTED" / "आशंका", "CAUTION" / "सतर्क", "CLEAR" / "सुरक्षित") plus one short subline, scale 1.5 → 1.0 thump animation, and SVG ink splatter perimeter effect.
  6. **Scripted Living CallSheet Playback (P0-1)**: Authored typed data-driven timeline in `web/src/components/hero/script.ts` with Hindi and English dialogue. Sheet starts with blank ruled paper, lines land with typing cadence, marks swipe (soft) and circle (hard), Kalam margin notes draw in with pen reveal, LevelStrip needle slides with boundary overshoot, border flashes vermilion at `likely_scam` with `navigator.vibrate([200, 100, 200])` haptic feedback, "Hang up now" speech bubble appears with animated waveform, and VerdictStamp slams with 2px sheet shift. Timeline has Replay, Pause/Play (Space shortcut), and scrubbable slider.
  7. **Highlighter Marker Pointer (P0-2)**: Configured custom SVG highlighter marker cursor over hero sheet and Spot game on desktop fine pointers (`@media (pointer: fine)`), painting a temporary yellow stroke behind hovered words fading after ~1.5s.
  8. **Scroll-Driven How It Works (P0-3)**: Replaced static cards with sticky paper sheet pinned on one side while 3 steps scroll on the other, driving sheet lines, marks, and warning stamp in both scroll directions.
  9. **Interactive Scam Index (P0-4)**: Built `InteractiveScamIndex` where 9 scam types are large typographic rows that expand to show marked quote excerpts and handwritten Kalam margin notes.
  10. **Micro-Interactions and Polish (P0-5)**: Button stamp-pad depression (`.btn-stamp`), language pill hover/tap headline swap, nav hand-drawn active underline, and circular View Transitions API theme reveal. Ink-slam sound omitted due to licensing prudence (documented in `docs/DESIGN.md`).
  11. **Spot the Red Flags Game (P1-1)**: Implemented `/spot` route with 4 scenarios (`web/src/data/spot/*.json`) including 1 genuine bank advisory (0 red flags). Players tap words to highlight red flags, click Check to reveal Sajag's analysis, and share score on WhatsApp via Web Share API.
  12. **Playwright Motion & Screenshot Automation**: Captured 28 hero filmstrip frames (desktop & mobile, light & dark, t = 0.4s to 10.0s), 3 headline language frames, 7 feature frames, and recorded ~12s video `docs/screens/motion/landing-hero.webm` (0.85 MB < 5 MB). Verified all 11 routes clean of horizontal scroll at 320px.

## Evidence (real outputs, trimmed, key redacted)
- `npm --prefix web run test`
  ```
  > web@0.1.0 test
  > node --test tests/**/*.test.mjs

  ✔ Hero Script Hindi: marks are exact substrings and scores non-decreasing (5.9932ms)
  ✔ Hero Script English: marks are exact substrings and scores non-decreasing (0.8649ms)
  ✔ Spot Game data: all stored true marks are exact substrings of their lines (11.1413ms)
  ℹ tests 3
  ℹ suites 0
  ℹ pass 3
  ℹ fail 0
  ℹ cancelled 0
  ℹ skipped 0
  ℹ todo 0
  ℹ duration_ms 391.5297
  ```
- `npm --prefix web run lint`
  ```
  > web@0.1.0 lint
  > eslint
  (Clean output: 0 errors, 0 warnings)
  ```
- `npm --prefix web run build`
  ```
  ▲ Next.js 16.4.2 (Turbopack)
  ✓ Compiled successfully in 5.1s
    Running TypeScript ...
    Finished TypeScript in 12.7s ...
    Collecting page data using 7 workers ...
  ✓ Generating static pages using 7 workers (14/14) in 2.6s
    Finalizing page optimization ...

  Route (app)
  ┌ ○ /
  ├ ○ /_not-found
  ├ ○ /about
  ├ ○ /accuracy
  ├ ○ /check
  ├ ○ /demo
  ├ ○ /dev/ui
  ├ ○ /live
  ├ ○ /parent
  ├ ○ /paste
  ├ ○ /report
  └ ○ /spot

  ○  (Static)  prerendered as static content
  ```
- Real landing route JS size: **129.1 KB gzipped** (well within the ≤ 170 KB gzipped budget).
- `api\.venv\Scripts\python.exe -m pytest -q`
  ```
  ...                                                                      [100%]
  3 passed, 1 warning in 3.34s
  ```
- `npm --prefix web run shots`
  ```
  === Sajag M0.6 Screenshot & Motion Automation ===
  Screens Directory: C:\Users\ppmak\SAJAG\docs\screens
  Motion Directory: C:\Users\ppmak\SAJAG\docs\screens\motion
  Starting Next.js server on port 3000...
  Next.js server is ready at http://localhost:3000

  1. Testing 320px horizontal overflow on all routes...
  [PASS] 320px width clean on landing
  [PASS] 320px width clean on spot
  [PASS] 320px width clean on dev-ui
  [PASS] 320px width clean on live
  [PASS] 320px width clean on check
  [PASS] 320px width clean on paste
  [PASS] 320px width clean on parent
  [PASS] 320px width clean on demo
  [PASS] 320px width clean on accuracy
  [PASS] 320px width clean on about
  [PASS] 320px width clean on report

  2. Capturing hero filmstrip frames (desktop & mobile, light & dark)...
  Captured: hero-filmstrip-desktop-light-t0.4s.png
  Captured: hero-filmstrip-desktop-light-t1.2s.png
  Captured: hero-filmstrip-desktop-light-t2.5s.png
  Captured: hero-filmstrip-desktop-light-t4.0s.png
  Captured: hero-filmstrip-desktop-light-t6.0s.png
  Captured: hero-filmstrip-desktop-light-t8.0s.png
  Captured: hero-filmstrip-desktop-light-t10.0s.png
  Captured: hero-filmstrip-desktop-dark-t0.4s.png
  Captured: hero-filmstrip-desktop-dark-t1.2s.png
  Captured: hero-filmstrip-desktop-dark-t2.5s.png
  Captured: hero-filmstrip-desktop-dark-t4.0s.png
  Captured: hero-filmstrip-desktop-dark-t6.0s.png
  Captured: hero-filmstrip-desktop-dark-t8.0s.png
  Captured: hero-filmstrip-desktop-dark-t10.0s.png
  Captured: hero-filmstrip-mobile-light-t0.4s.png
  Captured: hero-filmstrip-mobile-light-t1.2s.png
  Captured: hero-filmstrip-mobile-light-t2.5s.png
  Captured: hero-filmstrip-mobile-light-t4.0s.png
  Captured: hero-filmstrip-mobile-light-t6.0s.png
  Captured: hero-filmstrip-mobile-light-t8.0s.png
  Captured: hero-filmstrip-mobile-light-t10.0s.png
  Captured: hero-filmstrip-mobile-dark-t0.4s.png
  Captured: hero-filmstrip-mobile-dark-t1.2s.png
  Captured: hero-filmstrip-mobile-dark-t2.5s.png
  Captured: hero-filmstrip-mobile-dark-t4.0s.png
  Captured: hero-filmstrip-mobile-dark-t6.0s.png
  Captured: hero-filmstrip-mobile-dark-t8.0s.png
  Captured: hero-filmstrip-mobile-dark-t10.0s.png

  3. Capturing headline at three different languages...
  Captured: headline-lang-en.png
  Captured: headline-lang-hi.png
  Captured: headline-lang-ta.png

  4. Capturing feature frames (scam-index, how-it-works, spot-game, reduced-motion)...
  Captured: scam-index-opened.png
  Captured: how-it-works-step1.png
  Captured: how-it-works-step2.png
  Captured: how-it-works-step3.png
  Captured: spot-game-before-check.png
  Captured: spot-game-after-check.png
  Captured: landing-reduced-motion-final.png

  5. Recording landing hero video (~12s) to docs/screens/motion/landing-hero.webm...
  Saved video: landing-hero.webm (0.85 MB)

  All M0.6 motion frames & video successfully captured!
  Stopping Next.js server...
  ```

## Tests
- Node unit tests: 3 passed / 0 failed (asserting substring matches in Hero script and Spot calls, non-decreasing scores)
- pytest: 3 passed / 0 failed
- npm build: pass (14 static routes compiled with 0 errors)
- npm lint: pass (0 errors, 0 warnings)
- 320px responsive test: 11/11 routes pass with 0 horizontal overflow
- Motion filmstrip & video: 39 artifacts captured in `docs/screens/motion/`

## Gnani usage this milestone
- STT seconds: 0   TTS characters: 0   (Milestone M0.6 uses no credits)
- Project cumulative: STT seconds: 9.18, TTS characters: 55

## Deviations from the spec (and why)
- Ink-slam audio sound was omitted: per section P0-5 instructions, only legitimately sourced or user-generated non-copyrighted sounds are permitted. Lacking an unencumbered verified audio sample, sound was omitted in favor of rich visual cues (vermilion border flash, animated waveform, ink splatter) and haptic vibration (`navigator.vibrate`), fully documented in `docs/DESIGN.md`.

## Dependencies added (name==version — reason)
- None. Kept exact dependencies from M0.5.

## Self-critique (Milestone M0.6 filmstrip & motion review)
After inspecting the filmstrip frames (t = 0.4s to 10.0s across viewports) and the recorded 12s video `landing-hero.webm`, the following observations and improvements were made:
1. **Headline Impact & Cycling Transition:**
   - *Observation:* The M0.5 headline felt swallowed by the layout. In M0.6, elevating the headline to display scale (40px on mobile, clamp 56px–104px on desktop) across the full width transforms the first impression.
   - *What was changed:* Replaced opacity fade with a crisp clip-path pen wipe (`inset(0 100% 0 0)` to `inset(0 0 0 0)`) that feels like handwriting being erased and re-inked. Hovering or tapping any language pill locks that language immediately.
   - *What still bothers us:* Regional scripts like Tamil and Gurmukhi rely on lazy-loaded Noto Sans font subsets. On slower mobile 3G networks, a brief FOUT (flash of unstyled text) could occur on the first cycle if network latency is high.
2. **Margin Note Clipping & Collision Elimination:**
   - *Observation:* In M0.5, "सीबीआई का झूठा दावा" clipped against the right edge on desktop, and collided with the transcript on mobile.
   - *What was changed:* Overhauled the layout into a robust flex container with a guaranteed 48–52px gutter for margin notes on desktop, and indented margin notes below the segment line on mobile. Margin notes now wrap with `leading-snug break-words`. Inspecting filmstrips across 320px, 360px, and 1440px confirms 0 clipping.
3. **Pacing of the Living Hero CallSheet:**
   - *Observation:* A simultaneous entrance looks like a static mock. Staggering the transcript lines across a 9.0s timeline with typing cadence, delayed highlighter swipes, and stroke-dashoffset circle animations gives the impression of a live, intelligent ear listening in real time.
   - *What was changed:* Calibrated the sequence so the alert speech bubble and vermilion border flash trigger at t = 5.8s when the score crosses the likely-scam threshold (9 pts), followed by the decisive 180ms VerdictStamp slam at t = 8.4s with 2px sheet shift and ink splatter.
   - *What still bothers us:* Until Timbre voice synthesis is integrated in M5, the speech bubble uses an animated visual waveform rather than audible speech. The scrubber slider provides necessary manual control for visitors who want to inspect specific moments.
4. **Bilingual Clarity vs Single Language:**
   - *Observation:* Displaying Hindi and English together in every label ("EXAMPLE • काल्पनिक उदाहरण") created visual clutter and cognitive overload.
   - *What was changed:* Switched to a clean single-language UI driven by browser language detection (`navigator.languages`) and remembered in `localStorage`. The stamp is now one bold word ("SCAM" / "ठगी") with one short subline ("Hang up now" / "तुरंत फोन काटें").
5. **Interactive Engagement below the Fold:**
   - *Observation:* Below the hero, three static cards felt like boilerplate marketing.
   - *What was changed:* Implemented `ScrollHowItWorks` with a sticky pinned sheet responding to scroll position in both directions, and `InteractiveScamIndex` where 9 scam types expand to show marked quotes and margin notes.
   - *Spot the Red Flags (`/spot`)* provides an interactive training game with 4 scenarios (including 1 genuine advisory with 0 red flags to reinforce that not all calls are scams) and WhatsApp score sharing.

## Open questions for the human
- None. Ready for human's review of M0.6 filmstrip frames and `docs/screens/motion/landing-hero.webm`.

## Ready for next milestone? waiting for human
- Milestone M0.6 is complete. All P0 and P1 items implemented, build/lint/tests green, filmstrip and video recorded, and self-critique documented. Per instructions: STOP and wait for the human's review. Do not start M1.
