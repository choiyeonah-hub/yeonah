import { useState } from "react";
import { Link } from "react-router";
import { ArrowRight, CalendarHeart, Feather, HandHeart, Lock, Palette, Sparkles } from "lucide-react";
import { Logo, SunMark } from "../../components/ui/Logo";
import { Sticker } from "../../components/ui/Sticker";
import { JournalMock, PlannerMock, RosaryMock, TodayMock } from "./Mocks";
import { THEMES } from "../widgets/themes";
import { LANDING } from "../../content/copy";

export function Landing() {
  return (
    <div className="paper min-h-dvh bg-bg text-ink">
      <a href="#top" className="sr-only-focusable fixed left-3 top-3 z-50 rounded-full bg-ink px-4 py-2 text-white">
        Skip to content
      </a>
      <header className="sticky top-0 z-30 border-b border-line/70 bg-bg/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <Link to="/" aria-label="Helena Grace home">
            <Logo size={28} />
          </Link>
          <nav aria-label="Page sections" className="hidden items-center gap-6 text-sm md:flex">
            <a href="#features" className="hover:text-gold-ink">Features</a>
            <a href="#how" className="hover:text-gold-ink">How it works</a>
            <a href="#pricing" className="hover:text-gold-ink">Plans</a>
            <a href="#faq" className="hover:text-gold-ink">FAQ</a>
          </nav>
          <Link to="/app/today" className="inline-flex min-h-11 items-center rounded-full bg-ink px-4 text-sm font-medium text-white sm:px-5">
            Open the demo
          </Link>
        </div>
      </header>

      <main id="top" tabIndex={-1}>
        {/* Hero */}
        <section className="relative overflow-hidden">
          <HeroArch />
          <div className="relative mx-auto grid max-w-6xl items-center gap-10 px-4 pb-16 pt-12 sm:px-6 md:grid-cols-[1.1fr_1fr] md:pt-20">
            <div>
              <p className="mb-4 text-xs font-medium uppercase tracking-[0.2em] text-gold-ink">{LANDING.eyebrow}</p>
              <h1 className="text-[2.75rem] leading-[1.05] sm:text-6xl lg:text-7xl">{LANDING.headline}</h1>
              <p className="mt-5 max-w-xl text-lg text-muted">{LANDING.body}</p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link to="/app/today" className="inline-flex min-h-12 items-center gap-2 rounded-full bg-ink px-6 font-medium text-white hover:bg-[#1b2a37]">
                  {LANDING.primaryCta} <ArrowRight size={18} aria-hidden="true" />
                </Link>
                <a href="#early-access" className="inline-flex min-h-12 items-center rounded-full border border-gold px-6 font-medium hover:bg-tint">
                  {LANDING.secondaryCta}
                </a>
              </div>
              <p className="mt-4 text-sm text-muted">Free demo · works in your browser · no account needed</p>
            </div>
            <div className="flex justify-center md:justify-end">
              <TodayMock />
            </div>
          </div>
        </section>

        {/* Feature intro */}
        <section id="features" className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
          <div className="mx-auto max-w-2xl text-center">
            <SunMark size={36} className="mx-auto mb-3" />
            <h2 className="text-4xl sm:text-5xl">{LANDING.secondaryHeadline}</h2>
            <p className="mt-4 text-lg text-muted">{LANDING.sectionIntro}</p>
          </div>
          <ul className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {LANDING.features.map((f, i) => {
              const Icon = [CalendarHeart, HandHeart, Feather, Palette][i];
              return (
                <li key={f.title} className="rounded-[24px] border border-line bg-surface p-6">
                  <span className="mb-4 flex h-11 w-11 items-center justify-center rounded-full bg-tint text-gold-ink">
                    <Icon size={20} aria-hidden="true" />
                  </span>
                  <h3 className="text-2xl">{f.title}</h3>
                  <p className="mt-2 text-muted">{f.body}</p>
                </li>
              );
            })}
          </ul>
        </section>

        {/* Screens */}
        <section aria-labelledby="inside" className="border-y border-line bg-surface/60 py-16">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <h2 id="inside" className="text-center text-4xl">
              A look inside
            </h2>
            <p className="mt-2 text-center text-muted">Illustrative screens. Try the real thing in the demo — it runs entirely in your browser.</p>
            <div className="-mx-4 mt-10 flex snap-x gap-6 overflow-x-auto px-4 pb-4 lg:justify-center" tabIndex={0} role="region" aria-label="App screens, scroll horizontally">
              <TodayMock />
              <PlannerMock />
              <RosaryMock />
              <JournalMock />
            </div>
          </div>
        </section>

        {/* How it works */}
        <section id="how" className="mx-auto max-w-4xl px-4 py-16 sm:px-6">
          <h2 className="text-center text-4xl">How it works</h2>
          <ol className="mt-10 grid gap-6 sm:grid-cols-3">
            {LANDING.steps.map((s, i) => (
              <li key={s} className="text-center">
                <span className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full border border-gold font-display text-2xl text-gold-ink">{i + 1}</span>
                <p className="font-display text-2xl">{s}</p>
              </li>
            ))}
          </ol>
        </section>

        {/* Themes */}
        <section aria-labelledby="themes" className="mx-auto max-w-6xl px-4 pb-16 sm:px-6">
          <h2 id="themes" className="text-center text-4xl">
            Thoughtful themes
          </h2>
          <p className="mt-2 text-center text-muted">Two themes are free today. Design packs are concepts we're exploring.</p>
          <ul className="mt-8 grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {THEMES.map((t) => (
              <li key={t.id} className="rounded-[20px] border border-line bg-surface p-3">
                <div className="mb-2 flex h-20 items-end justify-between rounded-2xl p-2" style={{ background: t.swatch }}>
                  <SunMark size={22} arch={false} />
                  {t.id === "sunday-atelier" && <Sticker id="flower" />}
                </div>
                <p className="font-medium">{t.name}</p>
                <p className="text-xs text-muted">{t.free ? "Free" : "Concept · not for sale"}</p>
              </li>
            ))}
          </ul>
        </section>

        {/* Pricing */}
        <section id="pricing" className="border-y border-line bg-surface/60 py-16">
          <div className="mx-auto max-w-4xl px-4 sm:px-6">
            <h2 className="text-center text-4xl sm:text-5xl">{LANDING.pricingHeader}</h2>
            <div className="mt-10 grid gap-4 md:grid-cols-2">
              <div className="rounded-[24px] border-2 border-gold bg-surface p-6">
                <p className="text-xs uppercase tracking-[0.18em] text-gold-ink">Free</p>
                <p className="font-display text-4xl">$0</p>
                <p className="mt-2 text-muted">{LANDING.freeLine}</p>
                <ul className="mt-4 space-y-1.5 text-[0.95rem]">
                  {["Today dashboard & daily rhythms", "Planner: day, week, month", "Rosary counter that saves your place", "Prayer intentions & three graces", "2 themes", "Export & delete your data anytime"].map((x) => (
                    <li key={x} className="flex gap-2">
                      <Sparkles size={16} className="mt-1 shrink-0 text-gold-ink" aria-hidden="true" /> {x}
                    </li>
                  ))}
                </ul>
                <Link to="/app/today" className="mt-6 inline-flex min-h-11 items-center gap-2 rounded-full bg-ink px-5 text-white">
                  Try it free <ArrowRight size={16} aria-hidden="true" />
                </Link>
              </div>
              <div className="rounded-[24px] border border-line bg-surface p-6">
                <p className="text-xs uppercase tracking-[0.18em] text-muted">Helena Plus · in development</p>
                <p className="font-display text-4xl">Not available yet</p>
                <p className="mt-2 text-muted">{LANDING.plusPreview}</p>
                <ul className="mt-4 space-y-1.5 text-[0.95rem] text-muted">
                  {["Sync across devices (planned)", "Private cloud backup (planned)", "Advanced repeating routines", "Year-in-review keepsake", "Seasonal design collections"].map((x) => (
                    <li key={x}>· {x}</li>
                  ))}
                </ul>
                <p className="mt-4 text-sm text-muted">Price not set. Nothing can be purchased, and we'll never put prayer itself behind a paywall.</p>
              </div>
            </div>
          </div>
        </section>

        <EarlyAccess />

        {/* FAQ */}
        <section id="faq" className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
          <h2 className="text-center text-4xl">Questions</h2>
          <div className="mt-8 divide-y divide-line rounded-[24px] border border-line bg-surface">
            {LANDING.faq.map((f) => (
              <details key={f.q} className="group px-5">
                <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-3 py-3 font-medium">
                  {f.q}
                  <span aria-hidden="true" className="text-gold-ink transition-transform group-open:rotate-45">
                    +
                  </span>
                </summary>
                <p className="pb-4 text-muted">{f.a}</p>
              </details>
            ))}
          </div>
        </section>

        {/* Privacy */}
        <section aria-labelledby="privacy-h" className="mx-auto max-w-3xl px-4 pb-16 sm:px-6">
          <div className="rounded-[24px] bg-tint p-6 sm:p-8">
            <h2 id="privacy-h" className="flex items-center gap-2 text-3xl">
              <Lock size={22} aria-hidden="true" /> Your prayers stay yours
            </h2>
            <p className="mt-3 text-muted">
              In this version, everything you write is stored only in your browser on your device. No account, no ads, no tracking, no selling of data. Your intentions are private by default, and you can export or delete everything at any time.
            </p>
            <Link to="/privacy" className="mt-3 inline-flex min-h-11 items-center text-gold-ink underline">
              Read the privacy notes
            </Link>
          </div>
        </section>
      </main>

      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-10 text-sm sm:px-6">
          <p className="max-w-2xl text-muted">{LANDING.trustNote}</p>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
            <span className="font-display text-lg">Helena Grace</span>
            <span className="text-muted">A little light, every day.</span>
            <Link to="/privacy" className="inline-flex min-h-11 items-center underline">Privacy</Link>
            <Link to="/terms" className="inline-flex min-h-11 items-center underline">Terms</Link>
            <Link to="/brand" className="inline-flex min-h-11 items-center underline">Brand</Link>
            <span className="text-muted">Contact: address coming before launch</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

function HeroArch() {
  return (
    <svg aria-hidden="true" className="pointer-events-none absolute -right-24 top-6 hidden h-[620px] w-[520px] opacity-60 md:block" viewBox="0 0 520 620">
      <path d="M40 620V260a220 220 0 0 1 440 0v360" fill="none" stroke="var(--hg-border)" strokeWidth="1.5" />
      <path d="M80 620V270a180 180 0 0 1 360 0v350" fill="none" stroke="var(--hg-gold)" strokeOpacity="0.35" strokeWidth="1" />
      {Array.from({ length: 12 }, (_, i) => {
        const a = Math.PI + (Math.PI * (i + 0.5)) / 12;
        return <line key={i} x1={260 + 90 * Math.cos(a)} y1={330 + 90 * Math.sin(a)} x2={260 + 130 * Math.cos(a)} y2={330 + 130 * Math.sin(a)} stroke="var(--hg-gold)" strokeOpacity="0.35" strokeWidth="1.2" />;
      })}
      <path d="M190 330a70 70 0 0 1 140 0" fill="var(--hg-tint)" stroke="var(--hg-gold)" strokeOpacity="0.5" />
    </svg>
  );
}

function EarlyAccess() {
  const [email, setEmail] = useState("");
  const [consent, setConsent] = useState(false);
  return (
    <section id="early-access" aria-labelledby="ea-title" className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
      <div className="rounded-[28px] border border-gold/60 bg-surface p-6 text-center sm:p-10">
        <SunMark size={40} className="mx-auto mb-3" />
        <h2 id="ea-title" className="text-4xl">
          {LANDING.emailHeadline}
        </h2>
        <p className="mt-2 text-muted">{LANDING.joinCta} — opening soon.</p>
        <form className="mx-auto mt-6 flex max-w-md flex-col gap-3 text-left" onSubmit={(e) => e.preventDefault()} aria-describedby="ea-status">
          <label htmlFor="ea-email" className="text-sm font-medium">
            Email
          </label>
          <input id="ea-email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} className="min-h-12 rounded-full border border-line bg-surface px-5" placeholder="you@example.com" />
          <label className="flex items-start gap-3 text-sm text-muted">
            <input type="checkbox" className="mt-0.5 h-5 w-5 accent-[var(--hg-ink)]" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
            {LANDING.consent}
          </label>
          <button type="submit" disabled className="min-h-12 cursor-not-allowed rounded-full bg-ink/50 px-6 font-medium text-white">
            {LANDING.joinCta}
          </button>
          <p id="ea-status" className="text-center text-sm text-warning">
            The list isn't open yet in this preview. Nothing you type here is sent or saved.
          </p>
        </form>
      </div>
    </section>
  );
}
