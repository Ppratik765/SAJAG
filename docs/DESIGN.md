# SAJAG — Design System Specification

## 1. Visual Direction: "Marked-up Paper"

Sajag behaves like a vigilant family elder reading along with a highlighter and a rubber stamp. The call transcript is a physical **sheet of paper**. Warning signs get **marked** as they arrive (yellow highlighter for soft signs, hand-drawn vermilion circle for hard scam signals), short handwritten **margin notes** explain why in plain words, and the verdict lands as an authentic **ink stamp**.

### 1.1 "Do Not Build" Anti-Patterns
To avoid looking generic, corporate, or AI-generated:
- **No glowing orbs or AI sparkles**: Avoid generic AI iconography.
- **No purple/blue gradient washes or mesh backgrounds**: Keep backgrounds solid and paper-like (`--bg`).
- **No glassmorphism blur cards**: No backdrop-filter blur sheets.
- **No neon-on-black**: Night ink theme is deep indigo-navy (`#0E1030`), not pure OLED black with neon accents.
- **No repetitive card-with-soft-grey-shadow**: Flat surfaces with 1px `--line` borders by default.
- **No emoji used as icons**: Use clean Lucide SVG icons.
- **No stock illustrations or stock photos**: All diagrams and marks are drawn directly in SVG.
- **No entrance animations on scroll**: Only responsive micro-feedback (120–220ms, ease-out).
- **No all-caps tracked-out eyebrow labels**: Clean sentence-case headings.
- **No middle-dot meta strings (`A · B · C`) or spaced-em-dash labels (`WORD — fragment`)**.
- **No monospace face**: Tabular numerals are rendered using `font-variant-numeric: tabular-nums` in the body face.
- **No decorative red**: Vermilion appears **only** for severe scam warnings, hard circles, and scam stamps. Green appears **only** for "no signs found".

---

## 2. Colour Tokens

Theme classes: Light is `:root`, Dark is `[data-theme="dark"]`. The default follows system `prefers-color-scheme` with a manual toggle persisted in `localStorage`.

| Token | Light ("Paper") | Dark ("Night ink") | Role |
|---|---|---|---|
| `--bg` | `#F5F7FB` | `#0E1030` | Canvas / page background (cool, clean) |
| `--sheet` | `#FFFFFF` | `#171A45` | Transcript paper sheet surface |
| `--ink` | `#14163A` | `#ECEEFF` | Primary high-contrast text |
| `--ink-muted` | `#4A4E7A` | `#A5A9D6` | Secondary labels, captions, metadata |
| `--line` | `rgba(20,22,58,0.12)` | `rgba(236,238,255,0.14)` | Hairline borders, ruled paper guides |
| `--stamp` | `#2A2FB8` | `#8C93FF` | Stamp-pad indigo ink (brand, primary buttons, links) |
| `--marker` | `#FFD60A` | `rgba(255,214,10,0.40)` | Highlighter yellow for soft/suspicious signs |
| `--alarm` | `#E5322D` | `#FF5A52` | Vermilion ink for scam stamp, hard category circles |
| `--alarm-text` | `#B91C1C` | `#FF8A84` | High-contrast alarm text for badges and alerts |
| `--safe` | `#12A150` | `#3DDC84` | Calming green seal ("no signs found" only) |
| `--safe-text` | `#0B6B34` | `#3DDC84` | High-contrast safe text |

---

## 3. Computed WCAG Contrast Ratios

Tested according to WCAG 2.1 relative luminance standards:
- Normal body text requirement: **>= 4.5:1**
- Large text (>= 24px or bold >= 18.5px) requirement: **>= 3.0:1**

### 3.1 Light Theme ("Paper") on White Sheet (`#FFFFFF`)
| Foreground Token | Hex | Background | Contrast Ratio | WCAG AA Body | WCAG AAA Large |
|---|---|---|---|---|---|
| `--ink` | `#14163A` | `#FFFFFF` | **17.42 : 1** | PASS (AAA) | PASS (AAA) |
| `--ink-muted` | `#4A4E7A` | `#FFFFFF` | **7.89 : 1** | PASS (AAA) | PASS (AAA) |
| `--stamp` | `#2A2FB8` | `#FFFFFF` | **9.56 : 1** | PASS (AAA) | PASS (AAA) |
| `--alarm-text` | `#B91C1C` | `#FFFFFF` | **6.47 : 1** | PASS (AA) | PASS (AAA) |
| `--safe-text` | `#0B6B34` | `#FFFFFF` | **6.63 : 1** | PASS (AA) | PASS (AAA) |

### 3.2 Light Theme ("Paper") on Canvas Background (`#F5F7FB`)
| Foreground Token | Hex | Background | Contrast Ratio | WCAG AA Body | WCAG AAA Large |
|---|---|---|---|---|---|
| `--ink` | `#14163A` | `#F5F7FB` | **16.24 : 1** | PASS (AAA) | PASS (AAA) |
| `--ink-muted` | `#4A4E7A` | `#F5F7FB` | **7.36 : 1** | PASS (AAA) | PASS (AAA) |
| `--stamp` | `#2A2FB8` | `#F5F7FB` | **8.91 : 1** | PASS (AAA) | PASS (AAA) |

### 3.3 Dark Theme ("Night ink") on Sheet Surface (`#171A45`)
| Foreground Token | Hex | Background | Contrast Ratio | WCAG AA Body | WCAG AAA Large |
|---|---|---|---|---|---|
| `--ink` | `#ECEEFF` | `#171A45` | **14.36 : 1** | PASS (AAA) | PASS (AAA) |
| `--ink-muted` | `#A5A9D6` | `#171A45` | **7.28 : 1** | PASS (AAA) | PASS (AAA) |
| `--stamp` | `#8C93FF` | `#171A45` | **6.09 : 1** | PASS (AA) | PASS (AAA) |
| `--alarm-text` | `#FF8A84` | `#171A45` | **7.26 : 1** | PASS (AA) | PASS (AAA) |
| `--safe-text` | `#3DDC84` | `#171A45` | **9.27 : 1** | PASS (AAA) | PASS (AAA) |

### 3.4 Dark Theme ("Night ink") on Canvas Background (`#0E1030`)
| Foreground Token | Hex | Background | Contrast Ratio | WCAG AA Body | WCAG AAA Large |
|---|---|---|---|---|---|
| `--ink` | `#ECEEFF` | `#0E1030` | **16.06 : 1** | PASS (AAA) | PASS (AAA) |
| `--ink-muted` | `#A5A9D6` | `#0E1030` | **8.14 : 1** | PASS (AAA) | PASS (AAA) |
| `--stamp` | `#8C93FF` | `#0E1030` | **6.81 : 1** | PASS (AA) | PASS (AAA) |

---

## 4. Typography Scale

All fonts loaded via `next/font/google` (`display: swap`):
- **Headlines / Wordmark**: `Bricolage Grotesque` (700/800, `latin`). For Hindi headlines, falls back to `Mukta` (800).
- **Body & Interface**: `Mukta` (400, 500, 700), shared across English and Hindi for visual unity.
- **Margin Notes**: `Kalam` (handwriting, 400/700, `latin` and `devanagari`), 18–22px, tilted ±1.5°.
- **Numbers / Timestamps**: `font-variant-numeric: tabular-nums` in `Mukta`. No monospace.

### 4.1 Type Scale
- **Display**: `clamp(2.5rem, 6vw, 4.5rem)` (40px → 72px), line-height 0.96, tracking -0.02em.
- **H2**: `clamp(1.75rem, 3.5vw, 2.75rem)` (28px → 44px), line-height 1.15.
- **H3**: `clamp(1.375rem, 2vw, 1.75rem)` (22px → 28px), line-height 1.25.
- **Body**: 17px–18px, line-height 1.6 (Hindi `:lang(hi)`: +10% font size, line-height >= 1.7).
- **Small**: 14px–15px, line-height 1.5.
- **Parent Mode**: Body >= 24px, headings >= 40px.

---

## 5. Shape, Elevation & Surfaces

- **Transcript Paper (`<CallSheet>`)**:
  - `border-radius: 6px`.
  - Subtle folded top-right dog-ear corner (clip-path SVG).
  - Layered backdrop: 2 faint sheets peeking behind at `+0.6°` and `+1.1°` rotation with soft natural paper drop-shadow.
  - Very faint SVG noise texture (`feTurbulence`) on canvas at <= 3% opacity.
- **Buttons**:
  - Fully rounded pill (`border-radius: 9999px`).
  - Minimum touch target: 52px height for primary actions.
  - Visible keyboard focus ring: 2px offset with `--stamp`.
- **Inputs**: `border-radius: 14px`, min-height 48px.
- **Dialogs & Modals**: `border-radius: 20px`, flat hairline border.

---

## 6. Signature Components Inventory

1. **`<CallSheet>`**: Paper transcript container with line-by-line segments, left gutter tabular timestamps, marks inline, right margin notes on desktop (below line on mobile).
2. **`<Mark>`**:
   - *Highlight* (soft category): SVG marker stroke animation across text.
   - *Circle* (hard categories): Hand-drawn vermilion stroke-dashoffset ellipse.
3. **`<MarginNote>`**: Kalam handwritten note with thin hand-drawn pointer arrow. Maximum 1 note per category per call.
4. **`<VerdictStamp>`**: Ink rubber stamp rotated ~ -7° with SVG ink texture. States: `no signs found` (green seal), `careful` (blue ink), `likely scam` / `scam` (vermilion). Thumps down with 180ms scale-down on first appearance.
5. **`<LevelStrip>`**: Slim ruler-style scale with 4 labelled zones (safe, suspicious, likely scam, scam) and an escalating indicator needle.
6. **`<CallTimeline>`**: Horizontal audio track with coloured category dots.
7. **`<Seal>`**: Circular stamp emblem containing "सजग" and subtle soundwave; serves as favicon and brand crest.

---

## 7. Motion & Accessibility

- **The One Orchestrated Moment**: The mark stroke swipe (350ms) and stamp thump (180ms scale 1.35 → 1.0).
- **Micro-feedback**: 120–220ms ease-out for button presses, disclosures, and toggles.
- **`prefers-reduced-motion`**: Instant marks, stamp appears without scaling thump, no loop animations.
- **Screen Reader Announcements**: Level transitions announced via `<div aria-live="polite" role="status">`.
- **Haptic Feedback**: `navigator.vibrate([200, 100, 200])` triggered when session escalates to `likely_scam` (feature-detected).
