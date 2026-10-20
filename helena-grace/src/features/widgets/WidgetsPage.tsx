import { useState } from "react";
import { Link } from "react-router";
import { ArrowLeft, Download, Lock } from "lucide-react";
import { dataOf, useApp, useStore } from "../../lib/hooks";
import { Button, Card, CardTitle } from "../../components/ui";
import { SunMark } from "../../components/ui/Logo";
import { PageHeader } from "../../components/layout/AppShell";
import { formatLong, formatShort, formatTime } from "../../lib/date";
import { activeSession, eventsOn, eventTime } from "../../lib/storage/repos";
import { totalCounted } from "../../lib/rosary";
import { THEMES } from "./themes";
import { gratitudeCardSvg, svgToPngBlob } from "./shareCard";

export function WidgetsPage() {
  const { today } = useApp();
  const events = useStore("events");
  const rosary = useStore("rosary");
  const journal = useStore("journal");
  const [status, setStatus] = useState("");

  const next = eventsOn(dataOf(events), today).filter((e) => !e.cancelled).slice(0, 2);
  const monthRosaries = dataOf(rosary).filter((s) => s.completedAt && s.localDate.slice(0, 7) === today.slice(0, 7)).length;
  const active = activeSession(dataOf(rosary));
  const latest = [...dataOf(journal)].sort((a, b) => b.localDate.localeCompare(a.localDate)).find((j) => j.gratitude.some((g) => g.trim()));
  const grace = latest?.gratitude.find((g) => g.trim());

  const download = async () => {
    if (!grace || !latest) return;
    try {
      const blob = await svgToPngBlob(gratitudeCardSvg(grace, formatLong(latest.localDate)), 1080, 1350);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `helena-grace-gratitude-${latest.localDate}.png`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      setStatus("Image saved to your downloads. Nothing was uploaded.");
    } catch {
      setStatus("Your browser couldn't create the image.");
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <Link to="/app/you" className="inline-flex min-h-11 items-center gap-1 text-sm text-gold-ink">
        <ArrowLeft size={16} aria-hidden="true" /> You
      </Link>
      <PageHeader eyebrow="Widgets & Themes" title="A little light, at a glance" />
      <p className="rounded-2xl border border-line bg-tint px-4 py-3 text-[0.95rem]">
        These are <strong>previews</strong>. A web app can't place real widgets on your iPhone or Android home screen; true home-screen widgets are planned for a future native app.
      </p>

      <div className="grid gap-4 sm:grid-cols-2">
        <WidgetFrame name="Morning Light" size="Small">
          <div className="flex h-full flex-col">
            <div className="flex items-center gap-2">
              <SunMark size={28} arch={false} />
              <span className="font-display text-lg">{formatShort(today)}</span>
            </div>
            <ul className="mt-auto space-y-1 text-sm">
              {next.length === 0 ? <li className="text-muted">A spacious day</li> : next.map((e) => <li key={e.id} className="truncate">{formatTime(eventTime(e))} · {e.title}</li>)}
            </ul>
          </div>
        </WidgetFrame>

        <WidgetFrame name="Little Rosary" size="Small">
          <div className="flex h-full flex-col justify-between">
            <p className="font-display text-lg">Little Rosary</p>
            <div className="flex gap-1" aria-hidden="true">
              {Array.from({ length: 10 }, (_, i) => (
                <span key={i} className={`h-3 w-3 rounded-full ${active && i < active.beadIndex ? "bg-gold" : "border border-gold/60"}`} />
              ))}
            </div>
            <p className="text-sm text-muted">{active ? `Decade ${active.decadeIndex + 1} · ${totalCounted(active)}/50` : `${monthRosaries} prayed this month`}</p>
          </div>
        </WidgetFrame>

        <WidgetFrame name="Gratitude Card" size="Medium">
          {grace ? <p className="font-display text-xl leading-snug">“{grace}”</p> : <p className="text-muted">Your latest grace will appear here.</p>}
        </WidgetFrame>

        <WidgetFrame name="Feast & Season" size="Medium" locked>
          <p className="text-muted">Coming later — only after a verified, licensed liturgical calendar is in place.</p>
        </WidgetFrame>
      </div>

      <Card aria-labelledby="share-title">
        <CardTitle id="share-title" eyebrow="Share image">
          Gratitude card
        </CardTitle>
        <p className="mb-3 text-[0.95rem] text-muted">Creates a 1080×1350 image of your latest grace on this device. Intentions are never included.</p>
        {grace && (
          <div className="mb-3 overflow-hidden rounded-2xl border border-line" style={{ maxWidth: 270 }} dangerouslySetInnerHTML={{ __html: gratitudeCardSvg(grace, formatLong(latest!.localDate)) }} />
        )}
        <Button onClick={download} disabled={!grace}>
          <Download size={17} aria-hidden="true" /> Download image
        </Button>
        {!grace && <p className="mt-2 text-sm text-muted">Write a grace in Journal first.</p>}
        <p role="status" className="mt-2 text-sm text-success">
          {status}
        </p>
      </Card>

      <Card aria-labelledby="themes-title">
        <CardTitle id="themes-title" eyebrow="Themes">
          Theme gallery
        </CardTitle>
        <ul className="grid gap-2 sm:grid-cols-2">
          {THEMES.map((t) => (
            <li key={t.id} className="flex items-center gap-3 rounded-2xl border border-line p-3">
              <span aria-hidden="true" className="h-10 w-10 shrink-0 rounded-xl border border-line" style={{ background: t.swatch }} />
              <span className="min-w-0">
                <span className="block font-medium">
                  {t.name} {t.free ? <span className="text-sm text-success">· Free</span> : <span className="text-sm text-muted">· Concept, not yet available</span>}
                </span>
                <span className="block text-sm text-muted">{t.description}</span>
              </span>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-sm text-muted">Switch between free themes in You → Theme. Premium packs are not for sale yet.</p>
      </Card>
    </div>
  );
}

function WidgetFrame({ name, size, locked, children }: { name: string; size: string; locked?: boolean; children: React.ReactNode }) {
  return (
    <figure className="m-0">
      <div className={`h-40 rounded-[24px] border border-gold/50 bg-surface p-4 shadow-[0_8px_24px_rgb(37_54_69/0.06)] ${locked ? "opacity-70" : ""}`}>{children}</div>
      <figcaption className="mt-1.5 flex items-center gap-1 px-1 text-sm text-muted">
        {locked && <Lock size={13} aria-hidden="true" />}
        {name} · {size} preview
      </figcaption>
    </figure>
  );
}
