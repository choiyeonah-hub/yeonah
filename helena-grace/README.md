# Helena Grace — A Catholic Daily Faith Planner

*A little light, every day.* A mobile-first PWA and landing page. All user data stays in the browser (IndexedDB). There is no account, server, tracking or payment.

## Run

```bash
cd helena-grace
npm install
npm run dev        # http://localhost:5173  (landing at /, app at /app/today)
npm run test
npm run build      # output: dist/
```

More commands, the verification status and the deploy checklist are in [docs/QA.md](docs/QA.md).

## Structure

```
helena-grace/
├─ docs/            BRAND · SITEMAP · MVP · RIGHTS_AND_COMPLIANCE · COPY · QA
├─ ASSUMPTIONS.md   choices made where the brief was open
├─ public/          manifest, sw.js (shell-only cache), favicon, icons/, brand/
├─ scripts/         render-icons.mjs, screenshots.mjs
└─ src/
   ├─ App.tsx              routes + AppProvider (settings, timezone "today")
   ├─ styles/index.css     design tokens (CSS vars → Tailwind @theme), themes
   ├─ data/                types.ts, sample.ts (isSample-tagged demo data)
   ├─ content/             copy.ts (landing EN), labels.ts
   ├─ lib/
   │  ├─ date.ts           timezone-safe yyyy-mm-dd keys
   │  ├─ rosary.ts         pure counter + mystery data
   │  ├─ validation.ts
   │  ├─ hooks.ts          useApp, useStore (re-reads on any write)
   │  └─ storage/          db.ts (idb), repos.ts, backup.ts (JSON/CSV, restore, wipe)
   ├─ components/ui/       Button, Card, Field, Dialog, Chip, SunPetals, CalendarGrid, Logo, Sticker
   ├─ components/layout/   AppShell (bottom tabs / sidebar)
   └─ features/            landing, onboarding, today, planner, rosary, journal, you, widgets
```

## What it deliberately does not do (yet)

Sync and accounts, sending reminders, purchases, native home-screen widgets, prayer texts, readings, liturgical calendar, and Korean UI. Each one is labelled in the app as "Not available" or "Coming later". See [docs/MVP.md](docs/MVP.md).

Independently created. Not affiliated with or endorsed by any diocese or official Catholic organization.
