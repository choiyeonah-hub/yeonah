# MVP scope, cost, risk, validation (V2)

## Priority: long-form writing first

V2 makes the **Journal** the core of the product. It's a writing studio with no short boxes, no length limits and no checkbox grids, and its autosave must survive reloads. The Planner and Rosary support it. Routines are optional.

**Out of scope, permanently for this product:** meal planning, recipes, groceries/shopping lists, nutrition, diet tracking. An automated test checks every route for this vocabulary (`src/test/screens.test.tsx` → "zero meal-planning UI").

## P0 feature table

| P0 item | Status | Proof |
|---|---|---|
| Responsive landing + 5 tabs | Done | screens test, `npm run shots` (5 widths × 11 routes, no overflow) |
| Design system, logo SVG, favicon, icons | Done (trademark not cleared) | `/brand`, `npm run icons` |
| Onboarding + settings | Done | screens test |
| Long-form Journal: title, free body, date, tags, multiple per day, focus mode, autosave, read/edit/search past entries | Done | unit + screens tests, `npm run qa:journal` |
| Gratitude (no 3-line rule, any count) + intentions with long notes: record/edit/search | Done | storage + screens tests |
| Planner CRUD, week view, daily life + faith in one calendar | Done (list/calendar week, category colour/visibility, "Write a reflection" per day) | screens test (scenario B) |
| Optional routines, large tap cards, by-date view (no forced checkboxes) | Done (off by default) | screens test (scenario C) |
| Rosary progress / pause / resume / complete | Done (no prayer texts) | screens test |
| Local storage, export/import, delete, long-text recovery | Done (v1→v2 migration, write-ahead recovery) | storage tests, `qa:journal` |
| EN microcopy, accessibility, mobile test | Automated checks only | see QA "not verified" |
| 2 themes + web widget previews | Done (Grace Note uses only a note the user chose) | screens test |
| README, run/build/test | Done | — |

## The six V2 completion criteria

| Criterion | Evidence |
|---|---|
| Journal long-form | 3,000+ char text with emoji/line breaks saved verbatim; no `maxlength`; ≥12 lines visible at 390px (`qa:journal`) |
| Autosave restore | Re-render restore test; flush-on-leave test; real Chromium reload after save, **and within the 600 ms debounce**, for existing and brand-new entries (`qa:journal`) |
| Daily planner & prayer | Scenario B test: personal + Mass in week list and Today; intention + gratitude; widgets don't leak |
| Optional routines | Scenario C tests: off → no routine UI, no checkboxes; on → tap card persists; no counts/streaks |
| Zero meal-planning UI | Vocabulary scan of 11 routes |
| Data export/import | Unit round-trip + browser download → wipe → file import of the long text |

## P1 / P2

- **P1:** auth + sync (Supabase Auth/RLS), remote encrypted backup, consent-based email reminders, richer calendar, monthly review, print export, purchases.
- **P2:** native widgets, audio Rosary, KO and other languages, reviewed seasonal content, NFC goods.

## Rough cost (hypotheses, KRW)

| Item | Estimate |
|---|---|
| Static hosting | ₩0 (free tier) |
| Domain | ₩20–50k/yr, after the trademark check |
| Trademark search (US + KR) | ₩0.5–1.5M |
| Experiment A ads | ₩0.8–1.2M |
| Interview incentives | ₩0.3–0.5M |

## Key risks

1. **Data loss.** Storage is local only, and browsers can evict it. Mitigations: write-ahead recovery, export buttons, clear notices. Real fix: sync (P1).
2. **Name/trademark** not cleared.
3. **Privacy of long confessional text.** No encryption at rest yet. The UI never claims "encrypted".
4. **"Pretty but unused."** Validate with Experiment C.
5. **iOS PWA limits:** no widgets, limited notifications.
6. **Content rights:** no prayer texts or readings.

## Validation (pilot ≤ ₩3M, hypotheses)

- **A:** 3 landing variants; small US ads and community posts (following each community's rules).
- **B:** 15–20 interviews on planner habits, the need for long-form faith writing, frustration with tiny checkboxes, and combining intentions with schedules. Use non-leading questions and record people's own words.
- **C:** 30 beta users × 14 days. Measure D7 and weekly planner use. Measure only *whether* someone journaled (opt-in). Never collect or read entry text or intentions. No analytics is built yet.
- **D:** "I'm interested" on premium concepts, clearly marked as no payment. Not built.
- **Go:** ≥50% of interviewees name a concrete recurring problem, and ≥30% of beta users use a core feature ≥2× in week 2.
- **Stop/pivot:** "pretty" without repeat use, or "free apps are enough" → stop the subscription build and pivot to one-time digital planners/stickers.
