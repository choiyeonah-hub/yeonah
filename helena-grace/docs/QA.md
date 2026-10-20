# QA (V2)

## Commands

```bash
cd helena-grace
npm install
npm run dev            # http://localhost:5173
npm run typecheck
npm run test           # vitest: 61 tests
npm run build
npx vite preview --port 4173 &
npm run qa:journal     # real Chromium, iPhone 13 profile: long-form + reload + export/import (11 checks)
npm run shots          # 11 routes × 375/390/430/768/1440 → screenshots/, overflow + console-error report
npm run icons
```

`qa:journal`, `shots` and `icons` use `/opt/pw-browsers/...` Chromium. Elsewhere, set `CHROMIUM_PATH`.

## Verified in this build

| Area | Evidence | Result |
|---|---|---|
| Types / build | `tsc -b`, `vite build` | 0 errors / OK |
| Timezone day keys, DST | `date.test.ts` | pass |
| Rosary counter | `rosary.test.ts` | pass |
| Long reflection stored verbatim; several per day; any number of gratitude notes | `storage.test.ts` | pass |
| Backup round-trip with 3,000+ chars, emoji, line breaks; CSV keeps the full body; formula guard | `storage.test.ts` | pass |
| v1 → v2 IndexedDB migration (old 3-line journal → reflection + gratitude) | `storage.test.ts` | pass |
| Write-ahead recovery (never older over newer; wiped by Delete all) | `journalWal.test.ts` | pass |
| Scenario A: paste 3,000+ chars, autosave, URL → id, reopen restores title/body/tags; flush on leave; no maxlength; prompts don't overwrite; Read mode; list by date; search | `screens.test.tsx` | pass |
| Scenario B: personal + Mass on Today and Planner; journal body and private intention absent from widgets | `screens.test.tsx` | pass |
| Scenario C: routines off → no routine UI, 0 checkboxes on Today; on → tap card persists; no counts/streaks | `screens.test.tsx` | pass |
| Zero meal-planning UI (11 routes) | `screens.test.tsx` | pass |
| Real browser (390px touch): editor ≥12 lines, no overflow, reload restores, **reload within 600 ms keeps the last words**, unsaved new entry restored, focus mode covers the tab bar and focuses the text, JSON export → wipe → import identical | `qa:journal` | 11/11 pass |
| No overflow or console errors at 5 widths × 11 routes | `shots` | pass |
| Contrast AA for text tokens | `contrast.test.ts` | pass |

### Bugs found and fixed during V2 QA
- Words typed <600 ms before a reload were lost (0/5 kept). Fixed with a synchronous localStorage write-ahead copy that is recovered on start (now 5/5, plus automated checks).
- A global `* { transition-duration }` rule made every style change animate, so focus mode appeared semi-transparent over the tab bar. Removed; motion now goes through Tailwind's `--default-transition-duration` only.
- The global heading font rule overrode utility classes. Moved into `@layer base`.

## Not verified (still to do)

- ☐ Real iPhone/Android: on-screen keyboard over the editor, dictation (voice input), safe areas, "Add to Home Screen". Chromium device emulation has no software keyboard.
- ☐ Screen readers (VoiceOver, TalkBack, NVDA).
- ☐ iOS Safari storage eviction (Safari can clear site data after about 7 days without a visit).
- ☐ Very large journals (e.g. 1,000+ entries). Search and list are in-memory and not profiled.
- ☐ Lighthouse; bundle splitting.
- ☐ Content review by a Catholic reader.

## Manual capture

`npm run build && npx vite preview`, then Chrome DevTools device toolbar → 375/390/430/768/1440 → "Capture full size screenshot". Or run `npm run shots`, which onboards with sample data and one routine.

## Deployment checklist

- [ ] Trademark/domain checks.
- [ ] Host root = `helena-grace`, build `npm run build`, output `dist`, SPA rewrites in `vercel.json`, HTTPS.
- [ ] Bump `CACHE` in `public/sw.js` when shell files change.
- [ ] Contact address, reviewed Privacy/Terms.
- [ ] `npm run test && npm run build && npm run qa:journal && npm run shots` all green.
