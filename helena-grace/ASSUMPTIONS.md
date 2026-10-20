# Assumptions

Decisions made where the brief left a choice open. Each one can be changed. V2 items (2026-10-20) are at the end; they take precedence over V1 items.

1. **Location**: the repo already contains a Next.js app ("하브루타 톡") that deploys on Vercel. Helena Grace is a separate Vite app in `helena-grace/`. The only change outside this folder: `helena-grace` added to `exclude` in the root `tsconfig.json`, so the Next build doesn't type-check this app.
2. **Versions**: React 19, Vite 7, Tailwind 4, React Router 7, Vitest 3. These are established majors, not the newest ones on npm (Vite 8, Vitest 5).
3. **Event time model**: `PlannerEvent.startAt`/`endAt` are wall-clock strings `yyyy-mm-ddTHH:mm` with no offset. "9 AM Mass" stays 9 AM if the user changes timezone. Day keys for "today" come from the user's timezone setting (`Intl`), never `toISOString()`.
4. **Repeat completion**: one-off events use `completed`; repeating events track each occurrence in `completedDates` (added field).
5. **Routine recurrence**: "daily" or "certain weekdays". Daily routines show from any date (no start date).
6. **Rosary model**: 5 decades × 10 beads. Opening and closing prayers aren't counted. "Back" can cross decades. "End this session" deletes the unfinished session after confirmation.
7. **Mystery titles**: the short traditional names are shown. No prayer text.
8. **Waitlist**: no backend. The form is visible but disabled, with a clear notice. It never shows a success message.
9. **Reminders**: the preferred time is stored and browser permission can be requested, but nothing is scheduled.
10. **Themes**: the free themes are "Luminous" (default) and "Celadon Morning". The four premium packs appear only as concepts, with no price.
11. **Pricing**: the hypothesised $3.99 / $29.99 prices are **not** shown on the landing page. It says "Price not set." Showing a price is part of Experiment D.
12. **Contact**: no contact address was given. The footer says "address coming before launch".
13. **Gold text**: Sun Gold #D6AC71 fails text contrast, so a darker `gold-ink` #8A6430 was added for small gold labels.
14. **Sample data**: tagged `isSample: true` with `sample-` ids, so adding samples never overwrites the user's own records.
15. **Restore**: restoring a backup replaces data records but keeps settings.
16. **Analytics**: none are built in. The beta experiments need an opt-in measurement method to be chosen.

## V2 — long-form journaling update

17. **Spec source**: `Helena_Grace_Claude_Code_Master_Prompt.md` wasn't in the repo, so the V2 text pasted in chat was used. Where the pasted landing-copy draft conflicts with V2 §8 (e.g. "Capture three little moments of gratitude each day"), V2 §8 wins. Only the draft heading "A gentle rhythm for every day." was adopted.
18. **Journal model**: `JournalEntry { id, localDate, title?, body, tags, createdAt, updatedAt }`. Gratitude is a separate `GratitudeEntry` store. Intentions use `note` and `resolvedAt` (renamed from `answeredNote`/`answeredAt`). The `mood` field from V1 was dropped because V2 doesn't list it and forbids emotion scoring.
19. **Migration**: IndexedDB v1 → v2 runs automatically. Each old day page becomes one reflection (if it had text) plus one gratitude note per non-empty line. The removed "gratitude" event category maps to "reflection". Backups are now version 2, and v1 backup files are rejected with a clear message. No v1 builds were deployed, so v1 file import wasn't worth its code.
20. **Autosave**: 600 ms debounce to IndexedDB, plus an immediate save on blur, tab hide, page hide and leaving the editor. Plus a synchronous `localStorage` write-ahead copy of the entry being typed, recovered on next start. This was added after a browser test showed IndexedDB can't finish writing during a reload. Empty new entries are never created.
21. **`DraftState`** is the editor's in-memory save state. "Continue writing" opens the most recently updated reflection, so no separate draft record is stored. The V1 `drafts` object store stays in the schema, unused.
22. **Prompts** never insert text. Choosing one shows it above the editor (and as the placeholder when the body is empty).
23. **Plain text only** (no rich text). Read mode splits paragraphs on blank lines and keeps single line breaks.
24. **Routines** are off by default. They turn on if the user picks any during onboarding, or via You → Gentle routines.
25. **Planner categories**: Personal, Prayer, Mass & Adoration, Intentions, Reflection. Show/hide chips and colours are saved in settings. Week view defaults to **List**.
26. **Grace Note**: widgets and the share image show only the gratitude note the user explicitly chooses. With no choice, they show an empty state, never the latest entry automatically.
27. **Limits kept**: plan titles (120), intention headline (500), event notes (2,000) and tags still have limits. Reflection bodies, intention notes, gratitude text, day notes and weekly reflections have none.
28. **Mobile keyboard**: verified only in Chromium device emulation (no software keyboard). Real iOS/Android keyboard and dictation behaviour is still unverified (QA.md).
