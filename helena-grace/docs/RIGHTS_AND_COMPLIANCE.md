# Rights & compliance checklist

Not legal advice. Items marked ☐ need a qualified professional before public launch.

## Content

| Content | Status |
|---|---|
| Prayer texts (Hail Mary, Our Father, Glory Be, etc. in English) | **Not included.** Common texts may be public domain in older translations, but specific modern translations (e.g. ICEL) are copyrighted. ☐ choose a source and confirm its license. |
| Scripture / daily readings | **Not included.** NABRE, RSV-CE etc. are licensed. ☐ licensing before any readings. |
| Liturgical calendar / feasts / saints | **Not included.** Card shows "Coming later". ☐ verified source, data license, regional calendar differences (US vs universal). |
| Rosary mystery titles (e.g. "The Annunciation") | Included as short traditional names (`src/lib/rosary.ts`). Low risk, but ☐ confirm in theological review. |
| Weekday mystery suggestion | Shown as "a common weekday pattern … choose what fits your practice". User always chooses. |
| Saints' quotes, images, audio | None. Not to be auto-collected or generated. |
| Seasonal packs (Advent, Lent) | Concept names only. ☐ independent theological review before content. |

## Brand & trademark

- ☐ USPTO and KIPRIS search for "Helena Grace" in classes 9, 42, 16, 35 (and 14/20 for goods).
- ☐ Domain/social handle availability.
- ☐ Confirm the symbol isn't confusingly similar to diocesan/order insignia.
- Non-affiliation note shown on landing footer, You → Notices, Terms: "Independently created. Not affiliated with or endorsed by any diocese or official Catholic organization."
- No church/diocese logos, no "official" or "approved" claims.

## Assets & licenses

- Fonts: Cormorant Garamond, Inter — SIL OFL 1.1, self-hosted via @fontsource. Noto Sans KR (OFL) planned.
- Icons: lucide-react — ISC.
- Brand marks, stickers, illustrations: original SVG in this repo.
- No photos, no downloaded reference images.

## Privacy

- MVP stores all user data in IndexedDB on the device. No server, analytics, ads, tracking SDKs, or third-party font requests.
- Service worker caches the app shell only (HTML/JS/CSS/icons), never user content.
- Intentions are private by default and excluded from share images.
- Users can export (JSON/CSV) and delete everything.
- ☐ Before collecting emails: privacy policy (CAN-SPAM, CCPA/CPRA if applicable, GDPR if EU traffic), double opt-in, unsubscribe, processor DPA.
- ☐ Before accounts/sync: Supabase RLS, encryption at rest, data-deletion flow, breach plan. Religious belief data can be "sensitive" under CPRA/GDPR — treat as such.
- ☐ Any analytics: opt-in only.

## Subscriptions & payments (not implemented)

- No purchase flow exists; UI says "Not available in demo" / "Not available yet"; no price is shown.
- ☐ iOS/Android: digital subscriptions and unlocks must use App Store / Google Play billing; NFC/QR goods must not unlock digital features to bypass store rules.
- ☐ Show trial length, auto-renewal, price, cancellation and refunds clearly before purchase (FTC "click-to-cancel" and state auto-renewal laws).
- Never paywall prayer, intentions, or journaling basics.

## Physical goods

- ☐ Original designs only — do not copy other brands' crosses/corner crosses or rosary holders.
- ☐ Pre-orders or demand validation before inventory.
