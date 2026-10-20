# Assumptions

Decisions made where the brief left a choice open. Each one can be changed.

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
14. **Sample data**: tagged `isSample: true`. Adding samples never overwrites a real journal day.
15. **Restore**: restoring a backup replaces data records but keeps settings.
16. **Analytics**: none are built in. The beta experiments need an opt-in measurement method to be chosen.
