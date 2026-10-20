# Sitemap & UX flows

## Routes

| Route | Screen | Notes |
|---|---|---|
| `/` | Brand landing | Hero, features, "A look inside" (4 illustrative phone screens), how it works, themes, honest plan comparison, early access (disabled), FAQ, privacy, footer with non-affiliation note |
| `/privacy`, `/terms` | Plain-language notes | Preview text, pending legal review |
| `/brand` | Logo system sheet | Wordmark, symbol, app icon, mono, usage, tokens, type |
| `/app/today` | Today | Morning note, daily rhythm (petals + count), intentions, today's grace, Rosary resume, today's plans, "Liturgical notes · Coming later" |
| `/app/planner` | Planner | Today / Week / Month tabs, prev/next/today, category filters + rhythms toggle, day detail (plans, rhythms, day note), My gentle week (week view) |
| `/app/rosary` | Rosary | Choose mysteries (weekday suggestion, user decides) + intention → counter with decades, beads, +1, Back, Pause/Resume, Complete, End; history |
| `/app/journal` | Journal | `?tab=page|intentions|month|search` and `?date=yyyy-mm-dd` (deep-linkable) |
| `/app/you` | You / Settings | Privacy & sync status, preferences, theme, reminders (stored only), backup/restore/sample/delete, subscription status, notices |
| `/app/you/widgets` | Widgets & Themes | Widget previews, PNG share card, theme gallery |
| `*` | Not found | Links back to Today / Home |

Navigation: mobile bottom bar (5 tabs, ≥56px tall, safe-area aware); ≥768px a left sidebar. Every feature is ≤2 taps from a tab. "Skip to content" link on every layout.

## Flows

1. **First visit** → `/app/today` → onboarding dialog (3 steps: name · timezone/week start/quiet time · starter rhythms + optional sample data). "Skip for now" at every step, Esc closes = skip.
2. **Daily use** → Today: write a morning line (saved on blur/Save) → tick rhythms → add an intention → "Write three graces" → Journal page.
3. **Plan** → Planner → New plan (validated dialog) → appears in day/week/month → tick done (per occurrence for repeats) → edit / mark cancelled / delete (confirm).
4. **Rosary** → choose mysteries + intention → +1 bead … → Pause (state saved) → leave → Today shows "Return to the Rosary" → Resume → Complete → history.
5. **Journal** → three graces + reflection + mood + tags; typing autosaves a *draft* (restored on return), Save commits. Navigate days, Monthly light calendar, Search (local only), CSV export.
6. **Data** → You → Download backup (JSON) / Restore (validated, replaces) / Add or Remove sample data (only `isSample` records) / type DELETE to wipe → onboarding restarts.

## States

- Loading: `role="status"` text. Error: storage-unavailable message (e.g. private mode).
- Empty: arch icon + gentle copy + one action.
- Form errors: inline text linked by `aria-describedby`, `aria-invalid`.
