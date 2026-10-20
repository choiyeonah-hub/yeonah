import { useState } from "react";
import { Link } from "react-router";
import { ArrowRight, ChevronDown, Lock, PenLine, Plus, Settings2 } from "lucide-react";
import { dataOf, useApp, useStore } from "../../lib/hooks";
import { Button, Card, CardTitle, ErrorNote, Loading } from "../../components/ui";
import { SunMark } from "../../components/ui/Logo";
import { formatLong, formatShort, formatTime, greeting, localHour } from "../../lib/date";
import { activeSession, eventsOn, eventTime, isEventDone, latestEntry, saveGratitude } from "../../lib/storage/repos";
import { MYSTERIES, totalCounted } from "../../lib/rosary";
import { RhythmList } from "./RhythmList";
import { RoutineManager } from "./RoutineManager";
import { entryLabel, excerpt } from "../journal/JournalPage";

const linkCls = "inline-flex min-h-11 items-center gap-1 font-medium text-gold-ink hover:underline underline-offset-4";

export function TodayPage() {
  const { settings, today } = useApp();
  const routines = useStore("routines");
  const completions = useStore("completions");
  const intentions = useStore("intentions");
  const journal = useStore("journal");
  const gratitude = useStore("gratitude");
  const rosary = useStore("rosary");
  const events = useStore("events");
  const [managing, setManaging] = useState(false);

  const loadErr = [routines, completions, intentions, journal, gratitude, rosary, events].find((s) => s.status === "error");
  if (loadErr?.status === "error") return <ErrorNote message={loadErr.error} />;
  if (journal.status === "loading" || events.status === "loading") return <Loading />;

  const todays = eventsOn(dataOf(events), today).filter((e) => !e.cancelled);
  const openIntentions = dataOf(intentions)
    .filter((i) => !i.archivedAt && !i.resolvedAt)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const latest = latestEntry(dataOf(journal));
  const session = activeSession(dataOf(rosary));
  const lastGrace = [...dataOf(gratitude)].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0];

  return (
    <div className="flex flex-col gap-4">
      <header className="mb-1 flex items-start gap-3">
        <SunMark size={40} className="mt-1 shrink-0" />
        <div>
          <p className="text-sm text-muted">{formatLong(today)}</p>
          <p className="text-muted">
            {greeting(localHour(settings.timezone))}
            {settings.displayName ? `, ${settings.displayName}` : ""}.
          </p>
          <h1 className="mt-1 text-[2.2rem] sm:text-[2.6rem]">A little light for today</h1>
        </div>
      </header>

      <Card aria-labelledby="plans-title">
        <CardTitle id="plans-title" eyebrow="Planner" action={<Link to="/app/planner" className={linkCls}>Open</Link>}>
          Today's plans
        </CardTitle>
        {todays.length === 0 ? (
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-muted">Nothing scheduled. Room to breathe.</p>
            <Link to="/app/planner?new=1" className={linkCls}>
              <Plus size={16} aria-hidden="true" /> Add a plan
            </Link>
          </div>
        ) : (
          <ul className="flex flex-col divide-y divide-line">
            {todays.slice(0, 3).map((e) => (
              <li key={e.id} className="flex gap-4 py-2 text-[1.02rem]">
                <span className="w-20 shrink-0 text-muted">{formatTime(eventTime(e))}</span>
                <span className={isEventDone(e, today) ? "text-muted line-through" : ""}>{e.title}</span>
              </li>
            ))}
            {todays.length > 3 && <li className="pt-2 text-sm text-muted">+{todays.length - 3} more in Planner</li>}
          </ul>
        )}
      </Card>

      <Card aria-labelledby="intent-title">
        <CardTitle id="intent-title" eyebrow="Prayer" action={<Link to="/app/journal?tab=intentions" className={linkCls}>All</Link>}>
          Prayer intentions
        </CardTitle>
        {openIntentions.length === 0 ? (
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-muted">Who or what would you like to hold in prayer today?</p>
            <Link to="/app/journal?tab=intentions" className={linkCls}>
              <Plus size={16} aria-hidden="true" /> Add an intention
            </Link>
          </div>
        ) : (
          <ul className="flex flex-col gap-1.5">
            {openIntentions.slice(0, 3).map((i) => (
              <li key={i.id} className="flex items-start gap-2 rounded-2xl bg-tint px-4 py-2.5">
                {i.isPrivate && <Lock size={14} className="mt-1.5 shrink-0 text-muted" aria-label="Private" />}
                <span className="min-w-0 break-words">{i.text}</span>
              </li>
            ))}
            {openIntentions.length > 3 && <li className="text-sm text-muted">+{openIntentions.length - 3} more</li>}
          </ul>
        )}
      </Card>

      <Card aria-labelledby="write-title">
        <CardTitle id="write-title" eyebrow="Journal">
          {latest ? "Continue writing" : "A place to write"}
        </CardTitle>
        {latest ? (
          <>
            <p className="font-display text-2xl leading-snug">{entryLabel(latest)}</p>
            {latest.title && <p className="mt-1 text-muted">{excerpt(latest.body, 140)}</p>}
            <p className="mt-2 text-sm text-muted">
              {formatShort(latest.localDate)} · last saved {new Date(latest.updatedAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
            </p>
          </>
        ) : (
          <p className="text-muted">Your reflections can be as long or as short as you wish.</p>
        )}
        <div className="mt-4 flex flex-wrap gap-2">
          {latest && (
            <Link to={`/app/journal/${latest.id}`} className="inline-flex min-h-11 items-center gap-2 rounded-full bg-ink px-5 text-white">
              Continue <ArrowRight size={16} aria-hidden="true" />
            </Link>
          )}
          <Link to="/app/journal/new" className={`inline-flex min-h-11 items-center gap-2 rounded-full px-5 ${latest ? "border border-gold/70" : "bg-ink text-white"}`}>
            <PenLine size={16} aria-hidden="true" /> New reflection
          </Link>
        </div>
      </Card>

      <More title="Return to the Rosary" summary={session ? `${MYSTERIES[session.mystery].label} · decade ${session.decadeIndex + 1} of 5` : "A moment with Mary"}>
        {session ? (
          <p className="mb-3 text-muted">
            {MYSTERIES[session.mystery].label} Mysteries · {totalCounted(session)} of 50 beads{session.pausedAt ? " · paused" : ""}
          </p>
        ) : (
          <p className="mb-3 text-muted">Take your time. Your place is saved if you pause.</p>
        )}
        <Link to="/app/rosary" className="inline-flex min-h-11 items-center gap-2 rounded-full bg-ink px-5 text-white">
          {session ? "Continue where you left off" : "Begin"} <ArrowRight size={16} aria-hidden="true" />
        </Link>
      </More>

      <More title="A note of gratitude" summary={lastGrace ? excerpt(lastGrace.text, 48) : "In your own words"}>
        {lastGrace && <p className="mb-3 font-display text-xl leading-snug">“{excerpt(lastGrace.text, 200)}”</p>}
        <QuickGratitude date={today} />
      </More>

      {settings.routinesEnabled && (
        <More title="Gentle routines" summary="Tap a card to note it — no scores, no streaks">
          <div className="mb-3 flex justify-end">
            <Button variant="ghost" className="px-3" onClick={() => setManaging(true)}>
              <Settings2 size={17} aria-hidden="true" /> Edit routines
            </Button>
          </div>
          <RhythmList routines={dataOf(routines)} completions={dataOf(completions)} date={today} />
        </More>
      )}

      <p className="rounded-2xl border border-dashed border-line px-4 py-3 text-sm text-muted">
        <span className="font-medium text-ink">Liturgical notes · Coming later.</span> We'll show feasts and seasons only once a verified, properly licensed calendar source is in place.
      </p>

      {managing && <RoutineManager open onClose={() => setManaging(false)} routines={dataOf(routines)} />}
    </div>
  );
}

/** Secondary, collapsible section so the three primary cards stay in focus. */
function More({ title, summary, children }: { title: string; summary: string; children: React.ReactNode }) {
  return (
    <details className="group rounded-[20px] border border-line bg-surface">
      <summary className="flex min-h-16 cursor-pointer list-none items-center justify-between gap-3 px-5 py-3">
        <span className="min-w-0">
          <span className="block font-display text-xl">{title}</span>
          <span className="block truncate text-sm text-muted">{summary}</span>
        </span>
        <ChevronDown size={20} aria-hidden="true" className="shrink-0 text-muted transition-transform group-open:rotate-180" />
      </summary>
      <div className="px-5 pb-5">{children}</div>
    </details>
  );
}

function QuickGratitude({ date }: { date: string }) {
  const [text, setText] = useState("");
  const [status, setStatus] = useState("");
  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        if (!text.trim()) return setStatus("Write a few words first.");
        await saveGratitude({ text, localDate: date });
        setText("");
        setStatus("Saved to Journal → Gratitude.");
      }}
      className="flex flex-col gap-2"
    >
      <label htmlFor="quick-grace" className="text-sm font-medium">
        Something good from today (optional)
      </label>
      <textarea id="quick-grace" rows={2} value={text} onChange={(e) => setText(e.target.value)} className="w-full rounded-2xl border border-line bg-surface px-4 py-2.5 leading-relaxed focus:border-ink focus:outline-none" />
      <div className="flex items-center justify-between gap-2">
        <p role="status" className="text-sm text-success">
          {status}
        </p>
        <Button type="submit" variant="secondary">
          Save
        </Button>
      </div>
    </form>
  );
}
