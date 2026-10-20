import { useEffect, useState } from "react";
import { Link } from "react-router";
import { ArrowRight, Lock, Settings2 } from "lucide-react";
import { dataOf, useApp, useStore } from "../../lib/hooks";
import { Card, CardTitle, EmptyState, ErrorNote, Loading, SunPetals, Button } from "../../components/ui";
import { SunMark } from "../../components/ui/Logo";
import { formatLong, formatTime, greeting, localHour } from "../../lib/date";
import { activeSession, eventsOn, eventTime, isEventDone, saveDayNote } from "../../lib/storage/repos";
import { MYSTERIES, totalCounted } from "../../lib/rosary";
import { RhythmList, dueRoutines } from "./RhythmList";
import { RoutineManager } from "./RoutineManager";
import { IntentionForm } from "../journal/IntentionForm";

export function TodayPage() {
  const { settings, today } = useApp();
  const routines = useStore("routines");
  const completions = useStore("completions");
  const intentions = useStore("intentions");
  const journal = useStore("journal");
  const rosary = useStore("rosary");
  const notes = useStore("dayNotes");
  const events = useStore("events");
  const [managing, setManaging] = useState(false);

  const loadErr = [routines, completions, intentions, journal, rosary, notes, events].find((s) => s.status === "error");
  if (loadErr?.status === "error") return <ErrorNote message={loadErr.error} />;
  if (routines.status === "loading" || completions.status === "loading") return <Loading />;

  const due = dueRoutines(dataOf(routines), today);
  const doneCount = dataOf(completions).filter((c) => c.localDate === today && due.some((r) => r.id === c.routineId)).length;
  const openIntentions = dataOf(intentions).filter((i) => !i.archivedAt && !i.answeredAt);
  const entry = dataOf(journal).find((j) => j.localDate === today);
  const session = activeSession(dataOf(rosary));
  const note = dataOf(notes).find((n) => n.localDate === today);
  const todays = eventsOn(dataOf(events), today).filter((e) => !e.cancelled);

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
          <h1 className="mt-1 text-[2.2rem] sm:text-[2.6rem]">Your quiet moment</h1>
        </div>
      </header>

      <Card aria-labelledby="begin-title">
        <CardTitle id="begin-title" eyebrow="Morning">
          A small beginning
        </CardTitle>
        <MorningNote key={today} date={today} initial={note?.text ?? ""} />
      </Card>

      <Card aria-labelledby="rhythm-title">
        <CardTitle
          id="rhythm-title"
          eyebrow="Rhythm"
          action={
            <Button variant="ghost" className="px-3" onClick={() => setManaging(true)}>
              <Settings2 size={17} aria-hidden="true" /> Edit
            </Button>
          }
        >
          My daily rhythm
        </CardTitle>
        {due.length > 0 && (
          <div className="mb-3 flex items-center gap-3">
            <SunPetals done={doneCount} total={due.length} />
            <p className="text-sm text-muted">
              {doneCount} of {due.length} gently kept today
            </p>
          </div>
        )}
        {dataOf(routines).filter((r) => !r.archivedAt).length === 0 ? (
          <EmptyState title="Begin with one small rhythm" body="Morning prayer, a Scripture passage, three graces — whatever fits this season." action={<Button variant="secondary" onClick={() => setManaging(true)}>Add a rhythm</Button>} />
        ) : (
          <RhythmList routines={dataOf(routines)} completions={dataOf(completions)} date={today} />
        )}
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card aria-labelledby="intent-title">
          <CardTitle id="intent-title" eyebrow="Prayer" action={<Link to="/app/journal?tab=intentions" className="inline-flex min-h-11 items-center text-sm text-gold-ink underline-offset-4 hover:underline">All</Link>}>
            Today's intentions
          </CardTitle>
          {openIntentions.length === 0 ? (
            <p className="mb-3 text-sm text-muted">Who or what would you like to hold in prayer today?</p>
          ) : (
            <ul className="mb-3 flex flex-col gap-1.5">
              {openIntentions.slice(0, 3).map((i) => (
                <li key={i.id} className="flex items-start gap-2 rounded-2xl bg-tint px-3 py-2">
                  {i.isPrivate && <Lock size={14} className="mt-1.5 shrink-0 text-muted" aria-label="Private" />}
                  <span className="min-w-0 break-words">{i.text}</span>
                </li>
              ))}
              {openIntentions.length > 3 && <li className="text-sm text-muted">+{openIntentions.length - 3} more in Journal</li>}
            </ul>
          )}
          <IntentionForm compact />
        </Card>

        <Card aria-labelledby="grace-title">
          <CardTitle id="grace-title" eyebrow="Gratitude">
            Today's grace
          </CardTitle>
          {entry?.gratitude.find((g) => g.trim()) ? (
            <blockquote className="font-display text-2xl leading-snug text-ink">“{entry.gratitude.find((g) => g.trim())}”</blockquote>
          ) : (
            <p className="text-muted">What's one small good thing from today?</p>
          )}
          <Link to="/app/journal" className="mt-4 inline-flex min-h-11 items-center gap-1 text-sm font-medium text-gold-ink hover:underline">
            {entry ? "Open today's page" : "Write three graces"} <ArrowRight size={16} aria-hidden="true" />
          </Link>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card aria-labelledby="rosary-title">
          <CardTitle id="rosary-title" eyebrow="Rosary">
            {session ? "Return to the Rosary" : "A moment with Mary"}
          </CardTitle>
          {session ? (
            <p className="mb-3 text-muted">
              {MYSTERIES[session.mystery].label} Mysteries · decade {session.decadeIndex + 1} of 5 · {totalCounted(session)} of 50 beads
              {session.pausedAt ? " · paused" : ""}
            </p>
          ) : (
            <p className="mb-3 text-muted">Take your time. Your place is saved if you pause.</p>
          )}
          <Link to="/app/rosary" className="inline-flex min-h-11 items-center gap-2 rounded-full bg-ink px-5 text-white">
            {session ? "Continue where you left off" : "Begin"} <ArrowRight size={16} aria-hidden="true" />
          </Link>
        </Card>

        <Card aria-labelledby="plans-title">
          <CardTitle id="plans-title" eyebrow="Planner" action={<Link to="/app/planner" className="inline-flex min-h-11 items-center text-sm text-gold-ink hover:underline">Open</Link>}>
            Today's plans
          </CardTitle>
          {todays.length === 0 ? (
            <p className="text-muted">Nothing scheduled. Room to breathe.</p>
          ) : (
            <ul className="flex flex-col gap-1">
              {todays.slice(0, 4).map((e) => (
                <li key={e.id} className="flex gap-3 text-[0.95rem]">
                  <span className="w-20 shrink-0 text-muted">{formatTime(eventTime(e))}</span>
                  <span className={isEventDone(e, today) ? "text-muted line-through" : ""}>{e.title}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <p className="rounded-2xl border border-dashed border-line px-4 py-3 text-sm text-muted">
        <span className="font-medium text-ink">Liturgical notes · Coming later.</span> We'll show feasts and seasons only once a verified, properly licensed calendar source is in place.
      </p>

      <RoutineManager open={managing} onClose={() => setManaging(false)} routines={dataOf(routines)} />
    </div>
  );
}

function MorningNote({ date, initial }: { date: string; initial: string }) {
  const [text, setText] = useState(initial);
  const [status, setStatus] = useState("");
  useEffect(() => setText(initial), [initial]);
  const save = async () => {
    if (text === initial) return;
    await saveDayNote(date, text);
    setStatus("Saved");
    setTimeout(() => setStatus(""), 1600);
  };
  return (
    <div>
      <label htmlFor="morning-note" className="mb-1.5 block text-muted">
        One line for this morning — a prayer, a hope, a word to carry.
      </label>
      <textarea
        id="morning-note"
        rows={2}
        value={text}
        maxLength={2000}
        onChange={(e) => setText(e.target.value)}
        onBlur={save}
        className="w-full resize-y rounded-2xl border border-line bg-surface px-4 py-2.5 text-base focus:border-ink focus:outline-none"
        placeholder="Lord, help me to…"
      />
      <div className="mt-1 flex items-center justify-between">
        <p role="status" aria-live="polite" className="text-sm text-success">
          {status}
        </p>
        <Button variant="ghost" className="px-3" onClick={save}>
          Save
        </Button>
      </div>
    </div>
  );
}
