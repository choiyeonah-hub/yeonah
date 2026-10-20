# QA

## Commands

```bash
cd helena-grace
npm install
npm run dev          # http://localhost:5173
npm run typecheck    # tsc -b
npm run test         # vitest: 36 tests
npm run build        # tsc -b && vite build → dist/
npx vite preview --port 4173 &   # serve the build
npm run shots        # screenshots/ at 375/390/430/768/1440 + overflow & console-error report
npm run icons        # regenerate brand SVG + PWA PNG icons
```

`shots` and `icons` use the Chromium at `/opt/pw-browsers/...`. Elsewhere, set `CHROMIUM_PATH=/path/to/chrome`.

## Verified (automated, in this build)

| Area | How | Result |
|---|---|---|
| Types | `tsc -b` (strict, noUnused*) | 0 errors |
| Build | `vite build` | OK (JS 452 kB / 140 kB gzip) |
| Timezone day keys, DST, month/week math | `src/lib/date.test.ts` | pass |
| Rosary counter (advance/back/finish bounds) | `src/lib/rosary.test.ts` | pass |
| Validation | `src/lib/validation.test.ts` | pass |
| IndexedDB CRUD, routine toggle, repeat events, sample-only removal, backup round-trip, bad-file rejection, CSV formula guard | `src/lib/storage/storage.test.ts` (fake-indexeddb) | pass |
| Landing CTA/affiliation/disabled waitlist; onboarding skip; Today rhythm persists; Rosary begin→count→pause→resume persisted; Planner validation + create; Journal save + search | `src/test/screens.test.tsx` (real routes) | pass |
| Token contrast AA (text pairs) | `src/test/contrast.test.ts` | pass |
| No horizontal overflow / no console errors on 9 routes × 5 widths | `npm run shots` | pass |
| Offline: app shell loads with network off after first visit | Playwright, `context.setOffline(true)` | pass |
| Keyboard: month grid arrows, planner view tabs arrows | Playwright | pass |

## Not verified yet (manual work still to do)

- ☐ Real screen readers: VoiceOver on iOS/macOS, TalkBack, NVDA. Only ARIA structure has been checked.
- ☐ Real devices: iOS Safari "Add to Home Screen", Android Chrome install prompt, safe-area insets.
- ☐ 200% zoom and Windows high-contrast mode.
- ☐ JSON restore from a file picker on mobile Safari.
- ☐ PNG share card download on iOS Safari (canvas `toBlob` and download behaviour vary).
- ☐ Lighthouse PWA/performance score. Not run.
- ☐ Content review by a Catholic reader (tone, mystery titles).
- ☐ Bundle splitting (one 452 kB chunk). Acceptable for an MVP, not optimised.

## Taking screenshots manually

1. `npm run build && npx vite preview`
2. Chrome DevTools → device toolbar → 375 / 390 / 430 / 768 / 1440 → ⋮ → "Capture full size screenshot".
3. Or run `npm run shots`, which onboards with sample data first.

## Deployment checklist

- [ ] Trademark/domain check done (see RIGHTS_AND_COMPLIANCE).
- [ ] Vercel/Netlify project **root directory = `helena-grace`**, build `npm run build`, output `dist`. SPA rewrites are in `vercel.json`.
- [ ] HTTPS (needed for the service worker).
- [ ] Bump `CACHE` in `public/sw.js` when shell files change (hashed assets update on their own).
- [ ] Replace the footer contact placeholder.
- [ ] Privacy/Terms reviewed. Waitlist stays disabled until an email processor and consent records exist.
- [ ] `npm run test && npm run build && npm run shots` all green.
