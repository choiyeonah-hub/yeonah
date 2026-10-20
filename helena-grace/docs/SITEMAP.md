# Sitemap & UX flows (V2 — long-form journaling)

## Routes

| Route | Screen | One clear job |
|---|---|---|
| `/` | Brand landing | Hero (writing scene), 5 features, "A look inside", how it works, themes, honest plans, early access (disabled), FAQ, privacy, footer |
| `/privacy`, `/terms`, `/brand` | Notes / logo sheet | — |
| `/app/today` | Today | **Primary:** Today's plans · Prayer intentions · Continue writing. **Collapsible:** Return to the Rosary · A note of gratitude · Gentle routines (only if turned on). "Liturgical notes · Coming later" |
| `/app/planner` | Planner | Today / Week / Month. Week = **List** (one card per day, large targets, "Reflect" + "Add" per day) or **Calendar** (strip + day detail). Category show/hide chips and colour picker. Day detail: plans, **Write a reflection** → journal for that date, day note. My gentle week |
| `/app/rosary` | Rosary | Choose mysteries + intention → counter, Pause/Resume, Complete, history |
| `/app/journal` | Journal home | "A place for your prayers and reflections." New reflection · Continue writing · Read past entries. Tabs: **Reflections** (by date, newest first, Monthly light calendar, CSV/JSON export) · **Intentions** (headline + long note, Answered prayers) · **Gratitude** (free text, any number, choose Grace Note) · **Search** |
| `/app/journal/new[?date=]` → `/app/journal/:id` | Writing studio | Title, date, tags, prompts (hint only), auto-growing editor (≥24rem), Write/Read, Focus mode, autosave status, delete |
| `/app/you` | Settings | Privacy & storage limits, preferences, **Gentle routines on/off**, theme, reminders (stored only), backup/restore/sample/delete, plan status, notices |
| `/app/you/widgets` | Widgets & Themes | Morning Light, Little Rosary, **Grace Note** (only the chosen gratitude note), Feast & Season (locked); PNG share card |

Navigation: mobile bottom bar (5 tabs) / desktop sidebar. Focus mode is a full-screen layer above the tab bar (Esc or "Exit focus").

## Flows

1. **Evening reflection (scenario A)** — Today "Continue writing" or Journal "New reflection" → type → status "Saving…" → "Saved locally · 9:14 PM". The URL becomes `/app/journal/<id>` after the first save. Reload, closing the tab, or switching tabs restores everything (IndexedDB + synchronous write-ahead copy). Read mode shows it as a printed page.
2. **Plans + prayer (scenario B)** — add a personal plan and a Mass in Planner → both appear in the week list and in Today. Add an intention (with a long note) and a gratitude note. Widgets show only the Grace Note the user picks; reflections and intentions never appear there.
3. **Routines optional (scenario C)** — off by default. Turn on in onboarding (pick any) or You → Gentle routines. Tap a large card → "Noted for today". Tap again to undo.
4. **Data (scenario D)** — You → Download backup (JSON) / Restore / Remove sample data / type DELETE. Journal tabs export CSV (and JSON for reflections).

## States

- Loading `role="status"`. Storage error: explains private mode / blocked storage.
- Autosave: idle ("Start writing…"), Saving…, Saved locally · time, Couldn't save (+ Download copy).
- Empty states give one gentle action. Missing entry id → "We couldn't find this reflection" plus a note that entries live on one device.
