# Helena Grace — Brand

Tagline: **A little light, every day.**
Positioning: A beautiful place to plan your days, hold your prayers, and notice grace in the ordinary.
Tone: warm, graceful, modern, thoughtful, a little playful. Never childish, preachy, guilt-inducing or manipulative.

## Three concepts and the choice

| Concept | Share | Role | Why |
|---|---|---|---|
| **A. Luminous Grace** | 80–85% | Primary system | Reads as premium stationery + quiet chapel; scales from 16px favicon to print; doesn't look like a generic Christian app or a Hallow clone. |
| **B. Seoul Chapel** | ~10% | Secondary detail | Celadon wash, faint hanji grain, restrained arch geometry. Differentiates without pastiche. Used in the free "Celadon Morning" theme and the `.paper` background. |
| **C. Sunday Atelier** | 5–10% | Accent only | Small stickers (sun, flower, star, ribbon, bead) on planner items, theme/goods content. Never on sacred figures. |

Selected: **A as the system, B and C as controlled accents** (85% minimal / 15% kitsch + Korean detail).

**Writing surfaces (V2):** decoration ≤5%. The Journal editor, read mode, and focus mode use no stickers, arches, or gold ornaments inside the writing area — only a hairline under the title. Body 18px / line-height 1.75 (write), Cormorant 21.6px / 1.7 (read).

## Logo system (implemented as original SVG)

- **Wordmark** — "HELENA GRACE" in Cormorant Garamond 500, uppercase, 0.22em tracking. (`src/components/ui/Logo.tsx` → `Wordmark`)
- **Symbol** — slender chapel arch + baseline, rising sun with 8 rays, Latin cross cut as *negative space* from the sun (SVG mask, so it works on any background). (`SunMark`)
- **App icon** — ivory square, gold sun with 8 rays + negative-space cross, no arch, no text. (`public/icons/*.png`, `app-icon.svg`)
- **Monochrome** — ink on white, white on ink. (`public/brand/*.svg`)
- **Usage sheet** — `/brand` route: favicon, digital sticker, goods tag, widget, landing header.
- Regenerate all brand SVG/PNG from one geometry: `npm run icons`.

Note: the wordmark is live text in a licensed open font, not outlined custom lettering. A bespoke H/G-balanced logotype needs a type designer (see MVP risks).

## Tokens

| Token | Hex | Use |
|---|---|---|
| Background / Ivory | #FCF9F3 | page |
| Surface / Warm white | #FFFEFC | cards |
| Sun Gold | #D6AC71 | lines, icons, decoration — **not text** (2.0:1) |
| Gold ink (added) | #8A6430 | small gold labels; AA on ivory |
| Blush | #EBC9C7 · Celadon #D4E3E5 · Sage #AEBDAE | accents, category dots |
| Ink | #253645 | text, primary buttons |
| Muted | #626B71 | secondary text (≥4.5:1 on ivory and tint) |
| Border | #E9E2D8 | hairlines |
| Success | #426A56 · Warning #955D31 | status |

Defined once as CSS variables in `src/styles/index.css`, mapped to Tailwind via `@theme`. Themes override variables only (`[data-theme="celadon"]`). Contrast verified in `src/test/contrast.test.ts`.

## Type, shape, motion

- Titles: Cormorant Garamond 500/600. Body: Inter Variable, 16px minimum. KO fallback: Noto Sans KR (in font stack, not bundled yet). All SIL OFL 1.1, self-hosted via @fontsource (no Google requests).
- Radius 16–24px, hairline gold/border lines, 8pt spacing grid, 44×44px minimum targets.
- Motion 150–250ms, disabled by `prefers-reduced-motion` and by the in-app "Reduce motion" setting.

## Illustration & icon rules

- Only original SVG/CSS (arches, sun, rays, stickers) and Lucide icons (ISC). No stock religious imagery, no saints' portraits, no photographs, no copied marks, no downloaded reference images.
- No heavy gradients/glow/3D, no purple SaaS look.
- Optional routines are large tap cards with a sun icon and the words "Noted for today" — no counts, percentages, scores or streaks, never colour alone.

## Image-generation briefs (for an external image tool)

Use these only to explore direction; final assets must be redrawn as clean vectors and cleared for trademark.

**Brand A — Luminous Grace (main)**
> Create an original refined vector-ready identity for "Helena Grace", a premium Catholic daily faith planner. Use an abstract sunrise emblem in a slender chapel arch, with a tiny integrated cross suggested subtly through negative space. Minimal ivory and muted warm-gold palette, elegant understated luxury stationery aesthetics, modern editorial composition, lots of breathing room, soft human warmth, excellent scalability. Include a horizontal wordmark and a clean standalone symbol. Serif logotype inspired by literary typography, not a copy of any existing font logo. Flat shapes and clear outlines; no photorealism, no embossing, no glossy 3D, no stock religious symbols, no mockup products, no watermark. Ensure the name is spelled exactly HELENA GRACE.

**Brand B — Seoul Chapel**
> Design an original minimalist Catholic lifestyle identity for "Helena Grace" that subtly blends cathedral stained-glass geometry with restrained Korean celadon and handcrafted-paper sensibility. Quiet ivory, celadon blue, charcoal ink, and subdued gold. A sunrise framed by one clean arch, geometric linework, nuanced Korean design detail, sophisticated and globally accessible, never pastiche or overly traditional. Deliver icon and wordmark design concept, simple vector-friendly geometry, flat background, no copied artwork, no watermark. Exact brand spelling HELENA GRACE.

**Brand C — Sunday Atelier**
> Create an original charming yet sophisticated Catholic planner brand graphic for "Helena Grace". Keep a minimal warm-ivory base and integrate tiny playful sun, flower, star and rosary-bead inspired sticker shapes in dusty rose, peach, pale blue, and gold. Adult designer stationery, charming not childish, peaceful, restrained, high-end K-stationery energy, sacred imagery treated respectfully. Show app icon motif and small sticker-system concepts with plenty of negative space. Flat clean vector look, no 3D, no watermark, exact brand spelling HELENA GRACE.

**App icon — main**
> Create a single original app icon symbol for Helena Grace: minimalist luminous golden sun with 8 delicate rays, an understated cross shape subtly integrated in the center using negative space, soft ivory solid background, harmonious symmetry, ultra-simple vector mark optimized for visibility at 48px. No text, no hands, no portraits, no photorealism, no gradients, no bevel, no watermark, no religious organization's official insignia.

**Brand identity — user brief (2026-10-20)**
> Design an original premium Catholic lifestyle brand identity for "Helena Grace". Create a refined minimalist golden sun emblem with delicate rays, a subtle cross integrated into the center, and the graceful silhouette of a chapel arch. Elegant editorial serif typography, soft ivory background, muted champagne gold, understated warmth. Blend modern European sacred architecture with the quiet sophistication of Korean minimalist design. Luxurious yet approachable, peaceful, feminine, timeless. Flat vector-ready design, no 3D, no gradients, no mockups, no watermark. Exact brand name: HELENA GRACE.

**App icon — user brief (2026-10-20)**
> Create a single original minimalist mobile app icon for a Catholic daily planner named Helena Grace. A symmetrical small golden sun with eight fine rays and a tiny cross suggested through negative space. Warm ivory background, clean vector geometry, high contrast at small sizes, sophisticated and serene. No text, no human figures, no 3D effects, no gradients, no watermark.

The shipped SVG mark (`SunMark`, `public/icons/*`) already follows both briefs: 8 rays, negative-space cross, chapel arch on the symbol, ivory square icon without text.
