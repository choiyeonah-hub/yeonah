import { Link } from "react-router";
import { ArrowLeft } from "lucide-react";
import { Logo, SunMark, Wordmark } from "../../components/ui/Logo";
import { Sticker } from "../../components/ui/Sticker";

const TOKENS = [
  ["Ivory", "#FCF9F3", "Background"],
  ["Warm white", "#FFFEFC", "Surface"],
  ["Sun Gold", "#D6AC71", "Lines, icons, decoration — not body text"],
  ["Gold ink", "#8A6430", "Gold for small text/labels (AA on ivory)"],
  ["Blush Pink", "#EBC9C7", "Accent"],
  ["Celadon Blue", "#D4E3E5", "Accent / Seoul Chapel"],
  ["Sage", "#AEBDAE", "Accent"],
  ["Ink", "#253645", "Text, primary buttons"],
  ["Muted", "#626B71", "Secondary text"],
  ["Border", "#E9E2D8", "Hairlines"],
  ["Success", "#426A56", "Confirmations"],
  ["Warning", "#955D31", "Errors, destructive"],
];

/** Logo system sheet: wordmark, symbol, app icon, monochrome, and usage examples. */
export function BrandPage() {
  return (
    <div className="paper min-h-dvh bg-bg">
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        <Link to="/" className="mb-6 inline-flex min-h-11 items-center gap-2 text-sm text-gold-ink">
          <ArrowLeft size={16} aria-hidden="true" /> Home
        </Link>
        <main className="flex flex-col gap-10">
          <header>
            <p className="text-xs uppercase tracking-[0.2em] text-gold-ink">Brand sheet · draft</p>
            <h1 className="text-5xl">Luminous Grace</h1>
            <p className="mt-2 max-w-2xl text-muted">Primary concept. 85% quiet minimal, with small Seoul Chapel and Sunday Atelier details. All marks are original SVG; trademark clearance pending.</p>
          </header>

          <Section title="1 · Primary wordmark">
            <div className="flex flex-col items-center gap-6 rounded-[24px] border border-line bg-surface p-10">
              <Wordmark className="text-[1.6rem] sm:text-5xl" />
              <Logo size={40} />
            </div>
          </Section>

          <Section title="2 · Symbol & 3 · App icon">
            <div className="grid gap-4 sm:grid-cols-3">
              <Tile label="Symbol">
                <SunMark size={120} title="Helena Grace symbol" />
              </Tile>
              <Tile label="App icon (no text)">
                <div className="flex h-32 w-32 items-center justify-center rounded-[28px] border border-line bg-[#FCF9F3] shadow-sm">
                  <SunMark size={96} arch={false} />
                </div>
              </Tile>
              <Tile label="Small sizes: 48 · 32 · 16 px">
                <div className="flex items-end gap-4">
                  <SunMark size={48} arch={false} />
                  <SunMark size={32} arch={false} />
                  <SunMark size={16} arch={false} />
                </div>
              </Tile>
            </div>
          </Section>

          <Section title="4 · Monochrome">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex flex-wrap items-center justify-center gap-4 rounded-[24px] border border-line bg-white p-8">
                <SunMark size={56} color="#253645" />
                <Wordmark className="text-lg sm:text-2xl" />
              </div>
              <div className="flex flex-wrap items-center justify-center gap-4 rounded-[24px] bg-ink p-8">
                <SunMark size={56} color="#FFFFFF" />
                <Wordmark className="text-lg sm:text-2xl" tone="light" />
              </div>
            </div>
          </Section>

          <Section title="5 · Usage examples">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Tile label="Favicon / tab">
                <div className="flex items-center gap-2 rounded-t-xl border border-line bg-surface px-3 py-2 text-sm">
                  <SunMark size={16} arch={false} /> Helena Grace
                </div>
              </Tile>
              <Tile label="Digital sticker">
                <div className="flex h-24 w-24 items-center justify-center rounded-full border-2 border-dashed border-gold/60 bg-tint">
                  <SunMark size={56} />
                </div>
              </Tile>
              <Tile label="Goods tag">
                <div className="flex h-36 w-24 flex-col items-center justify-between rounded-xl border border-line bg-surface py-3">
                  <span className="h-3 w-3 rounded-full border border-line" />
                  <SunMark size={40} />
                  <span className="font-display text-[0.65rem] uppercase tracking-[0.2em]">Helena Grace</span>
                </div>
              </Tile>
              <Tile label="Widget">
                <div className="h-28 w-28 rounded-[22px] border border-gold/50 bg-surface p-3">
                  <SunMark size={24} arch={false} />
                  <p className="mt-2 font-display text-sm leading-tight">“A slow walk after dinner”</p>
                </div>
              </Tile>
            </div>
            <div className="mt-4 flex items-center justify-center gap-3 rounded-[24px] border border-line bg-surface p-4">
              {(["sun", "flower", "star", "ribbon", "bead"] as const).map((s) => (
                <Sticker key={s} id={s} size={32} />
              ))}
              <span className="text-sm text-muted">Sunday Atelier stickers (accent only)</span>
            </div>
          </Section>

          <Section title="Color tokens">
            <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {TOKENS.map(([name, hex, use]) => (
                <li key={name} className="flex items-center gap-3 rounded-2xl border border-line bg-surface p-3">
                  <span aria-hidden="true" className="h-10 w-10 shrink-0 rounded-xl border border-line" style={{ background: hex }} />
                  <span>
                    <span className="block font-medium">
                      {name} <span className="font-mono text-sm text-muted">{hex}</span>
                    </span>
                    <span className="block text-sm text-muted">{use}</span>
                  </span>
                </li>
              ))}
            </ul>
          </Section>

          <Section title="Typography">
            <div className="rounded-[24px] border border-line bg-surface p-6">
              <p className="font-display text-5xl">Cormorant Garamond</p>
              <p className="text-muted">Titles · SIL OFL 1.1</p>
              <p className="mt-4 text-lg">Inter — body text, 16px minimum, for calm, legible reading.</p>
              <p className="text-muted">Body · SIL OFL 1.1 · Korean fallback: Noto Sans KR (OFL) when translation ships</p>
            </div>
          </Section>
        </main>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="mb-4 text-3xl">{title}</h2>
      {children}
    </section>
  );
}

function Tile({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <figure className="m-0 flex flex-col items-center gap-3 rounded-[24px] border border-line bg-surface p-6">
      <div className="flex min-h-36 items-center justify-center">{children}</div>
      <figcaption className="text-sm text-muted">{label}</figcaption>
    </figure>
  );
}
