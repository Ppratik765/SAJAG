# M0.6 — Make Sajag feel alive (brief for the coding agent)

Place this file at `docs/M06_ALIVE_BRIEF.md`. It is an addition to `SAJAG_SPEC.md`. **Where it conflicts with the motion rules in section 7.1A ("one orchestrated moment", "no scroll-triggered entrance animations", "micro-feedback only"), this brief wins.** Everything else in the spec (rules in section 0, the identity in 7.1A to 7.1F, the "do not build" list, accessibility, honesty rules) still applies.

## Why this milestone exists
The human reviewed the M0.5 screenshots and rejected them as static: nothing moves, nothing reacts, and nothing invites a visitor to touch it. The engagement on the public demo post decides who gets shortlisted, so the landing page and the demo must be something people stop scrolling for and want to share. The visual identity ("marked-up paper") stays. What changes is that the paper must now **behave**: it is written on in front of the visitor, it reacts to their pointer and touch, and it lets them play.

## Problems seen in the M0.5 screenshots (fix all of them)
1. The hero headline is tiny (4xl/6xl). The spec asked for display 40 to 88 px and it should dominate the first screen. Left side of the hero is mostly empty.
2. Margin notes on the desktop sheet are clipped at the right edge ("सीबीआई", "का झूठा दावा" are cut off). Notes must never clip or overflow, at any width.
3. Everything is bilingual at once ("EXAMPLE, WRITTEN BY US • काल्पनिक उदाहरण", the four-line stamp). This is cluttered and breaks our own "do not build" list (all-caps tracked labels, middle-dot strings, "WORD — fragment" labels). Show **one language at a time**, driven by the language toggle.
4. The default language is Hindi. Change it: default to the browser language (`navigator.languages`: Hindi if it starts with `hi`, otherwise English), remembered in localStorage inside try/catch. The visitor can switch at any time.
5. The stamp text is four lines of mixed script. Make it one big word in the active language plus one short line.
6. Below the hero, the page is a column of generic text blocks and identical cards (three ways, three steps, a language chip row, a plain list). It needs structure that responds to the visitor, see P0-3 and P0-5.
7. The mobile hero is cramped and the sheet's notes collide with the transcript text. Mobile must be designed first (360 x 800), not shrunk from desktop.
8. Only `Mark` and `VerdictStamp` use motion today. The landing page itself has no motion and no interaction.

## Priorities
Build P0 completely before touching P1. If time runs short, drop P1 and say so in STATUS.md.

### P0-1 The living hero (the memorable thing)
A huge headline and a large paper call sheet that **plays itself**.
- **Headline:** "Is this call a scam?" at display scale (clamp 56 px to 120 px desktop, 44 px mobile), taking the full width. The sentence **cycles through languages**: English, Hindi, Hinglish, Tamil, Telugu, Bengali, Gujarati, Marathi, Kannada, Malayalam, Punjabi, about 2.4 s each, changing with a quick pen-erase and rewrite (a clip-path wipe, not a fade). Pause on hover, tap or focus; never cycles under `prefers-reduced-motion` (show the active-language sentence only). Screen readers get the one static sentence (`aria-label`), the cycling text is `aria-hidden`.
  - Strings (the human will have native speakers review all but English and Hindi before launch; keep them in `web/src/lib/i18n/cycle.ts` with `reviewed: false` except en and hi):
    - en: Is this call a scam?
    - hi: क्या यह कॉल ठगी है?
    - hinglish: Kya yeh call scam hai?
    - ta: இந்த அழைப்பு மோசடியா?
    - te: ఈ కాల్ మోసమా?
    - bn: এই কলটা কি প্রতারণা?
    - gu: શું આ કૉલ છેતરપિંડી છે?
    - mr: हा कॉल फसवणूक आहे का?
    - kn: ಈ ಕರೆ ವಂಚನೆಯೇ?
    - ml: ഈ കോൾ തട്ടിപ്പാണോ?
    - pa: ਕੀ ਇਹ ਕਾਲ ਧੋਖਾ ਹੈ?
  - Fonts: Mukta only covers Latin and Devanagari. For the other scripts, load the matching Noto Sans family (verify each family and subset exists in `next/font`; never invent names) **lazily, after the hero is interactive**, weight 700 only. Total extra font payload for this ≤ 250 KB. If a font fails to load, skip that language in the cycle. Screenshot every script and check the glyphs render correctly (conjuncts, vowel signs) before committing.
- **The sheet plays a scripted call** (the existing "Example, written by us" dialogue; write an English version of it too, and keep the Hindi one). It starts when the hero is at least 50% visible and plays once automatically:
  1. The sheet starts blank with ruled lines. Lines land one at a time in call time, with a typing cadence, with a timestamp in the left gutter.
  2. When a line lands, its marks happen: highlighter swipe for soft signs (about 350 ms), hand-drawn vermilion circle for hard ones (about 450 ms, stroke-dashoffset), and the margin note is **written by a pen** (stroke reveal of the Kalam text, not a fade), with its arrow drawing in.
  3. The `LevelStrip` needle slides along the ruler as the score rises, with a small overshoot at each zone boundary.
  4. When the level reaches `likely_scam`, the sheet's border flashes vermilion once, a "Hang up now" speech bubble with an animated waveform appears (visual only, **no audio and no fake play button** until M5 adds real Timbre clips), and `navigator.vibrate([200, 100, 200])` fires where supported and not muted.
  5. The `VerdictStamp` lands: it comes in large, slams down (scale 1.5 to 1.0 with overshoot, 180 ms), the sheet shifts 2 px for two frames, and a small SVG ink splatter spreads out from the stamp edges. Stamp text is one big word in the active language.
  6. Total timeline about 9 s. Then a **Replay** button, a Pause/Play toggle (Space also toggles when the sheet is focused), and the `CallTimeline` becomes scrubbable (drag or arrow keys), re-rendering the sheet at that moment of the call.
  7. Hovering or tapping any mark opens its explanation (category in plain words and why it matters). Keyboard-focusable.
- Pauses when the tab is hidden. Replays instantly (no animation) if the visitor scrubs.
- **Accessibility:** the full transcript with its marks exists in the DOM from the start as normal text (the animation is a visual layer only). The verdict is announced once via `aria-live`. Under `prefers-reduced-motion`: the sheet renders in its final state, marks and stamp appear instantly, the needle jumps, and Replay steps through the call with instant state changes.
- **Honesty:** the sheet stays labelled "Example, written by us" (one language only, normal case, no dots) and the page must never imply this is a live result.

### P0-2 A pointer that does something (desktop, fine pointers only)
On pointer devices the cursor over the hero sheet and the Spot game (P1-1) becomes a **highlighter marker**: hovering transcript text paints a yellow stroke behind the words under it, which fades after about 1.5 s. This is the signature interaction, not decoration. Outside those areas the normal cursor is used. Never hide the system cursor over buttons or inputs. Not used on touch devices.

### P0-3 Scroll-driven "how it works"
Replace the three-card row and the "three steps" block with one **sticky sheet** that is marked as the visitor scrolls: the sheet stays pinned on one side while three steps scroll on the other. Step 1 (Listen): the sheet's lines appear. Step 2 (Mark): marks and notes draw in. Step 3 (Warn): the stamp lands and the spoken-warning bubble appears. Scroll position drives the state (scrubbable in both directions), not a one-off entrance. On mobile the sheet becomes a compact sticky strip at the top of the section. Reduced motion: show the three states as static steps.

### P0-4 The scam index becomes interactive
Replace the plain two-column list. Each scam type is a large typographic row (type name at display size, one plain sentence). Hovering or tapping a row expands it to show a **one-line example with marks that draw in** and its margin note. Only one row open at a time. Keyboard accessible (button + `aria-expanded`). The nine types and sentences from 7.1C stay.

### P0-5 Micro-interactions and polish
- Buttons: pressed state with a 1 px ink "stamp-pad" depression, a short press ripple that is a stamp ring, and a focus ring as already specified.
- Language chips: hovering a language chip swaps the headline to that language (desktop) or tapping does (mobile).
- Nav: the active route gets a hand-drawn underline that draws in; route changes use a quick sheet-wipe transition (under 300 ms, transform and opacity only, disabled for reduced motion).
- Theme toggle: the page switches theme with a short circular reveal from the toggle button (View Transitions API when available, instant fallback).
- Ambient paper: very faint paper grain that shifts a few pixels with the pointer (desktop) and nothing on mobile. No animated gradients, no floating particles.
- Optional ink-slam sound: **off by default**, a visible sound toggle in the header, remembered in localStorage inside try/catch. Only add a sound file you actually generated or that is public domain; log its source and licence in `docs/DESIGN.md`. If you cannot source one legitimately, skip sound entirely and say so.

### P1-1 "Spot the red flags" game (`/spot`, linked from the landing page)
A short, shareable, educational game that needs no backend.
- The visitor reads a short fake call (6 to 8 lines, written by us, labelled "Example, written by us") and **taps or drags a marker over the phrases they think are warning signs** (token-level selection; tapping words must work on touch without dragging).
- Press **Check**: Sajag's own marks animate in over the transcript. Show found, missed and wrongly marked phrases clearly with icon + text + colour, and a score ("You caught 4 of 6").
- At least three different calls (digital arrest, fake KYC, family emergency) plus one **genuine** call with no red flags (a real-style bank advisory saying "never share your OTP") so players learn that not everything is a scam. Calls live in `web/src/data/spot/*.json`, with the true marks stored as exact substrings (a unit test asserts every stored mark is an exact substring of its line).
- Share: Web Share API with a WhatsApp fallback (`https://wa.me/?text=...`, no phone number). Text template: "I caught X of Y warning signs in this fake scam call. Can you? <url>". Share text contains the score and the link only.
- This is education, not an accuracy claim: never describe the score as Sajag's detection accuracy.

## Performance and engineering rules
- Use `framer-motion` with `LazyMotion` and `m` components (`domAnimation` features) to keep the bundle small. Animate only `transform`, `opacity`, `clip-path` and SVG stroke properties. No layout-thrashing animations, no scroll listeners without `passive`/IntersectionObserver.
- Landing route JS budget: ≤ 170 KB gzipped (raised from 150 KB for the motion work). Record the real number from the build output. Lazy-load the Spot game and the extra script fonts.
- Put the hero timeline in a typed, data-driven definition (`web/src/components/hero/script.ts`): an array of `{atMs, lineIndex, marks[], note, scoreAfter}`. The component only interprets it. Unit-test that every mark's text is an exact substring of its line and that scores are non-decreasing.
- Honour `prefers-reduced-motion` everywhere via one shared hook. Pause all loops when the tab is hidden.
- No console errors or warnings. No emoji. No new dependencies beyond what is needed; list any addition in STATUS.md with a reason.

## Evidence required (screenshots cannot show motion)
1. Extend `npm run shots` (Playwright) to capture **filmstrip frames** of the landing hero at t = 0.4, 1.2, 2.5, 4, 6, 8 and 10 s (desktop and mobile, light and dark) into `docs/screens/motion/`, plus the headline at three different languages. Also record the hero for about 12 s as `docs/screens/motion/landing-hero.webm` (keep it under 5 MB).
2. Frames for: a scam-index row opening, the sticky "how it works" at three scroll positions, the Spot game before and after Check, and the reduced-motion final state.
3. Re-run the 320 px no-horizontal-scroll check on every route, and the contrast table for any new colours.
4. `STATUS.md`: build output with the real landing JS size, test results (including the substring tests), and a **self-critique after looking at the filmstrip**: what felt flat, what you changed, what still bothers you.

## Acceptance
- The hero plays on load, can be replayed, paused and scrubbed, and its final frame is identical to the static reduced-motion state.
- No margin note, mark or stamp is clipped at any width from 320 to 1440 px.
- Only one language is shown at a time everywhere; default follows the browser language.
- P0-1 to P0-5 done and verified with frames; P1-1 done or explicitly deferred in STATUS.md.
- Build, lint, tests green. Push. **Stop and wait for the human's review. Do not start M1.**

## Do not
- Do not add real Gnani calls or any audio of speech in this milestone.
- Do not present the animation as a live result; keep the "Example, written by us" label.
- Do not add parallax backgrounds, animated gradients, confetti, floating shapes or any effect that is not tied to the marked-up-paper idea.
- Do not invent statistics, user counts, testimonials or accuracy claims anywhere.
