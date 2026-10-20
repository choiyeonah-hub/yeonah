# MVP scope, cost, risk, validation

## Feature table

| Priority | Feature | Status in this build |
|---|---|---|
| P0 | Responsive landing + 5-tab app | Done |
| P0 | Design tokens, logo SVG, favicon, PWA icons | Done (original SVG; trademark not cleared) |
| P0 | Onboarding + basic settings | Done |
| P0 | Routine CRUD + completion + by-date view | Done (daily / weekdays; archive, restore, delete) |
| P0 | Planner event CRUD, week view (+ day, month) | Done (repeat daily/weekly, cancel, tags, stickers, filters, day note, weekly reflection) |
| P0 | Rosary progress / pause / resume / complete | Done (no prayer texts — rights review) |
| P0 | Gratitude ×3 + intentions record/edit/search | Done (drafts, mood, tags, answered-by-user, archive) |
| P0 | Local storage, export/import, delete | Done (IndexedDB, JSON backup/restore, CSV, sample removal, full wipe) |
| P0 | EN microcopy, accessibility, mobile test | Done for automated checks; **no manual screen-reader/device pass yet** (see QA) |
| P0 | 2 base themes, web widget previews | Done (+ PNG share card) |
| P0 | README, run/build/test | Done |
| P1 | Auth + sync (Supabase Auth/RLS), remote backup, consent-based email reminders, richer calendar, monthly review, print export, real purchases | Not started |
| P2 | Native widgets, audio Rosary, KO and other languages, reviewed seasonal content, NFC goods | Not started |

## Rough cost (hypotheses, KRW, before any paid acquisition)

| Item | Estimate | Note |
|---|---|---|
| Hosting (static, Vercel/Netlify free tier) | ₩0 | PWA is static |
| Domain | ₩20–50k/yr | after trademark check |
| Trademark search (US + KR) by attorney | ₩0.5–1.5M | strongly recommended before spending on brand |
| Ads for Experiment A | ₩0.8–1.2M | within the ₩3M pilot |
| Interview incentives (15–20 × ~$10–20) | ₩0.3–0.5M | |
| Waitlist email tool | ₩0–30k/mo | needs privacy notice update |

## Key risks

1. **Name/trademark**: "Helena Grace" not cleared; could force a rebrand. → search before ads.
2. **Data loss**: local-only storage can be wiped by the browser. → backup prompt; sync is P1.
3. **Content rights**: no prayer texts/readings; perceived as less useful by some users. → measure in interviews.
4. **"Pretty but unused"**: core risk of planner apps. → Experiment C retention gates.
5. **iOS PWA limits**: no home-screen widgets, limited notifications. → stated in-app; native only after validation.
6. **Bespoke logotype**: current wordmark is set in an open font; custom lettering needs a designer.

## Validation (pilot ≤ ₩3M, no real payments/inventory/licensing purchases)

- **A** — 3 landing visual variants, small US ads + community posts (follow each community's rules). Metric: CTR, demo opens.
- **B** — 15–20 interviews: current planner habits, tools, recurring pain.
- **C** — 30 free beta users × 14 days. Metrics: D7 return, weekly planner use. Requires a privacy-respecting, consent-based way to measure (none is built in; use self-reported check-ins or an opt-in analytics tool added later).
- **D** — "I'm interested" on premium concepts before building; clearly labelled "no payment". Not built yet.
- **Go (hypothesis)**: ≥50% of interviewees describe a specific recurring planner problem **and** ≥30% of beta users use a core feature ≥2× in week 2 unprompted.
- **Stop/pivot**: only "it's pretty" feedback, little repeat use, or "free apps are enough" → stop subscription build, pivot to one-time digital planner/sticker sales.
- These thresholds are founder hypotheses, not market statistics.
