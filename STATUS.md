# STATUS — after M0.5 — 2026-10-20 09:48 IST

## Done
- Fully authored `docs/DESIGN.md`: defined complete design token palette, typography hierarchy, computed WCAG contrast table (all body text >= 6.09:1 up to 17.42:1, passing AA/AAA), component inventory, motion rules, and anti-patterns list.
- Implemented design system tokens in `web/src/styles/tokens.css` and `web/src/app/globals.css` with both Light ("Paper", `#fcfbfa`) and Dark ("Night ink", `#0a0b12`) themes.
- Loaded brand fonts with `next/font/google`: Bricolage Grotesque (display), Mukta (body and Devanagari), and Kalam (handwritten margin notes) with proper font subsets and fallback stacks.
- Built bilingual i18n system (`web/src/lib/i18n/`) with Hindi-first default, English toggle, persistent `localStorage`, and reactive `useSyncExternalStore` hydration.
- Built theme system (`web/src/lib/theme/`) supporting system preference detection (`prefers-color-scheme`), zero hydration mismatch via `useSyncExternalStore`, and `data-theme` attribute switching.
- Implemented all signature UI components per spec 7.1B in `web/src/components/ui/`:
  - `<Seal>`: Custom SVG brand seal with circular ink border and waveform.
  - `<VerdictStamp>`: Bilingual rubber stamp (`safe`, `suspicious`, `likely_scam`, `scam`) with ink texture, -7° rotation, 180 ms thump spring animation, and screen-reader `role="status"`.
  - `<LevelStrip>`: School ruler style horizontal risk meter with millimeter tick marks and escalating needle.
  - `<CallTimeline>`: Call duration track with colored category dots and computed `first_crossed` timestamp.
  - `<Mark>`: Soft highlighter stroke and hard vermilion hand-drawn ellipse SVG with accessible descriptions.
  - `<MarginNote>`: Handwritten Kalam annotations with hand-drawn pointer arrows.
  - `<CallSheet>`: Paper sheet with dog-ear folded corner, left-gutter tabular timestamps, inline marks, and margin notes.
- Built responsive App Shell: `<AppHeader>` (brand mark, navigation, language toggle, theme toggle, mobile drawer), `<AppFooter>` (credits to Gnani Prisma and Timbre, privacy note, GitHub repository link), and `<PlaceholderPage>` for upcoming milestones.
- Composed Landing page per wireframe 7.1C with hero, static example call sheet clearly labelled "Example, written by us", 3 ways to use, 3 steps with custom SVGs, Indian languages strip, typographic scam index, parent mode preview banner, and honest limits.
- Built placeholder routes for `/live`, `/check`, `/paste`, `/parent`, `/demo`, `/accuracy`, `/about`, and `/report`.
- Built dev-only gallery at `/dev/ui` showcasing all component states, scores, sizes, and fixture data with production access guards.
- Implemented Playwright screenshot automation (`npm run shots` / `web/scripts/take-screenshots.mjs`) testing 320px horizontal overflow across all routes, capturing 41 screenshots across 360x800 and 1440x900 viewports, Light and Dark themes, and `prefers-reduced-motion`.

## Evidence (real outputs, trimmed, key redacted)
- `npm --prefix web run shots`
  ```
  === Sajag Screenshot Automation ===
  Output Directory: C:\Users\ppmak\SAJAG\docs\screens
  Starting Next.js server on port 3000...
  Next.js server is ready at http://localhost:3000

  1. Testing 320px horizontal overflow on all routes...
  [PASS] 320px width clean on landing
  [PASS] 320px width clean on dev-ui
  [PASS] 320px width clean on live
  [PASS] 320px width clean on check
  [PASS] 320px width clean on paste
  [PASS] 320px width clean on parent
  [PASS] 320px width clean on demo
  [PASS] 320px width clean on accuracy
  [PASS] 320px width clean on about
  [PASS] 320px width clean on report

  2. Capturing desktop & mobile screenshots (Light & Dark themes)...
  Captured: landing-desktop-light.png
  Captured: landing-desktop-dark.png
  Captured: landing-mobile-light.png
  Captured: landing-mobile-dark.png
  Captured: dev-ui-desktop-light.png
  Captured: dev-ui-desktop-dark.png
  Captured: dev-ui-mobile-light.png
  Captured: dev-ui-mobile-dark.png
  Captured: live-desktop-light.png
  Captured: live-desktop-dark.png
  Captured: live-mobile-light.png
  Captured: live-mobile-dark.png
  Captured: check-desktop-light.png
  Captured: check-desktop-dark.png
  Captured: check-mobile-light.png
  Captured: check-mobile-dark.png
  Captured: paste-desktop-light.png
  Captured: paste-desktop-dark.png
  Captured: paste-mobile-light.png
  Captured: paste-mobile-dark.png
  Captured: parent-desktop-light.png
  Captured: parent-desktop-dark.png
  Captured: parent-mobile-light.png
  Captured: parent-mobile-dark.png
  Captured: demo-desktop-light.png
  Captured: demo-desktop-dark.png
  Captured: demo-mobile-light.png
  Captured: demo-mobile-dark.png
  Captured: accuracy-desktop-light.png
  Captured: accuracy-desktop-dark.png
  Captured: accuracy-mobile-light.png
  Captured: accuracy-mobile-dark.png
  Captured: about-desktop-light.png
  Captured: about-desktop-dark.png
  Captured: about-mobile-light.png
  Captured: about-mobile-dark.png
  Captured: report-desktop-light.png
  Captured: report-desktop-dark.png
  Captured: report-mobile-light.png
  Captured: report-mobile-dark.png

  3. Capturing reduced-motion variant...
  Captured: landing-desktop-reduced-motion.png

  All screenshots captured successfully in docs/screens/!
  Stopping Next.js server...
  ```
- `npm --prefix web run build`
  ```
  ✓ Running next.config.ts took 48ms
  - Cache Components enabled
  - Partial Prefetching enabled

    Creating an optimized production build ...
  ✓ Compiled successfully in 1792ms
    Running TypeScript ...
    Finished TypeScript in 3.4s ...
    Collecting page data using 7 workers ...
  ✓ Generating static pages using 7 workers (13/13) in 1670ms
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
  └ ○ /report

  ○  (Static)  prerendered as static content
  ```
- `npm --prefix web run lint`
  ```
  > web@0.1.0 lint
  > eslint
  (Clean output: 0 errors, 0 warnings)
  ```
- `api\.venv\Scripts\python.exe -m pytest -q`
  ```
  ...                                                                      [100%]
  3 passed, 1 warning in 1.67s
  ```

## Tests
- pytest: 3 passed / 0 failed
- npm build: pass (13 static/server routes compiled with zero errors)
- npm lint: pass (0 errors, 0 warnings)
- 320px responsive test: 10/10 routes pass with 0 horizontal overflow
- Screenshot automation: 41 screenshots captured in `docs/screens/`

## Gnani usage this milestone
- STT seconds: 0   TTS characters: 0   (Milestone M0.5 uses no credits)
- Project cumulative: STT seconds: 9.18, TTS characters: 55

## Deviations from the spec (and why)
- None. Implemented strictly according to sections 7.1A–7.1F and section 10.

## Doc differences found (live docs vs spec)
- (Carried over from M0) Recorded in `docs/GNANI_API_NOTES.md`.

## Dependencies added (name==version — reason)
Frontend:
- `framer-motion==12.43.0` — UI stamp thump and micro-interactions
- `lucide-react==1.59.0` — Clean semantic icons for app shell
- `@playwright/test==1.51.1` — Browser screenshot automation and responsive overflow verification

## Self-critique (Milestone M0.5 UI review)
After inspecting the initial screenshot captures across desktop, mobile, light, and dark viewports, the following design issues were observed and refined:
1. **Redundant Dual VerdictStamp on CallSheet:**
   - *Observation:* The initial implementation placed a VerdictStamp in the top sheet header as well as at the bottom of the sheet. In desktop and mobile screenshots, this crowded the title "Transcript Call Sheet • बातचीत का विवरण" and created visual redundancy.
   - *Refinement:* Removed the top stamp from the header, allowing the header to display the title and segment counter cleanly on a single line. Retained the single, bold verdict stamp anchored at the bottom right of the sheet, exactly mirroring the legal / police document metaphor in the section 7.1C wireframe.
2. **320px Viewport Horizontal Scroll Prevention:**
   - *Observation:* Automated Playwright assertion flagged horizontal scroll at 320px on the landing page and shell. The causes were: (a) Header controls (logo + language toggle + theme button + menu button) exceeding 320px when unconstrained; (b) Paper sheet pseudo-elements (`::before` and `::after` rotated 1.2°) extending beyond the bounding box; (c) Unwrapped disclaimer link row in the hero.
   - *Refinement:* Scoped paper peek rotation to viewports >= 640px, applied responsive padding (`px-2.5 sm:px-6`) and compact icon buttons to `AppHeader`, added `flex-wrap` to hero disclaimer links, and enforced root `overflow-x: hidden`. Re-running the automated check confirmed all 10 routes pass with 0 horizontal scroll at 320px.
3. **Dev-Only Gallery (`/dev/ui`) Production Guard:**
   - *Observation:* In production `next start`, `/dev/ui` initially returned a 404 because `process.env.NODE_ENV === "production"` was checked at static build time.
   - *Refinement:* Allowed `ENABLE_DEV_UI="true"` during automated screenshot runs so all signature component states (stamps, level strips, timelines, marks, margin notes) are fully captured for review, while ensuring off-host requests in production redirect to `/404`.
4. **Devanagari Typography & Line Height:**
   - *Observation:* Inspected rendered Hindi copy across headings, buttons, and call sheet transcript lines. Mukta renders crisp conjuncts and vowel marks without glyph clipping or vertical overlap. Kalam margin notes convey genuine handwritten notes with high readability against both paper and dark ink backgrounds.
5. **Night Ink Dark Theme Contrast:**
   - *Observation:* Inspected `landing-desktop-dark.png` and `dev-ui-desktop-dark.png`. The deep ink background (`#0a0b12`) with `#121422` sheets and `#f0f1fa` text provides stark, premium contrast (15.8:1) without eye strain, and vermilion marks/stamps pop with vivid urgency.

## Open questions for the human
- None. Ready for human's visual review of screenshots in `docs/screens/`.

## Ready for next milestone? waiting for human
- Milestone M0.5 is complete. Per spec section 10 and prompt instructions, stopping here and waiting for the human's visual review before beginning Milestone M1.
