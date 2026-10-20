import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Plus, Pencil, Repeat } from "lucide-react";
import type { EventCategory, LocalDate, PlannerEvent } from "../../data/types";
import { dataOf, useApp, useStore } from "../../lib/hooks";
import { Button, Card, CardTitle, Chip, ErrorNote, IconButton, Loading } from "../../components/ui";
import { CalendarGrid } from "../../components/ui/CalendarGrid";
import { Sticker } from "../../components/ui/Sticker";
import { PageHeader } from "../../components/layout/AppShell";
import { EVENT_CATEGORIES } from "../../content/labels";
import { addDays, addMonths, formatLong, formatMonth, formatShort, formatTime, startOfWeek, weekDays, weekdayShort, weekday } from "../../lib/date";
import { eventsOn, eventTime, isEventDone, isRoutineDue, saveDayNote, saveWeekReview, toggleEventDone } from "../../lib/storage/repos";
import { RhythmList } from "../today/RhythmList";
import { EventForm } from "./EventForm";

type View = "day" | "week" | "month";
const VIEWS: { id: View; label: string }[] = [
  { id: "day", label: "Today" },
  { id: "week", label: "Week" },
  { id: "month", label: "Month" },
];

export function PlannerPage() {
  const { today, settings } = useApp();
  const events = useStore("events");
  const routines = useStore("routines");
  const completions = useStore("completions");
  const [view, setView] = useState<View>("week");
  const [date, setDate] = useState<LocalDate>(today);
  const [filters, setFilters] = useState<EventCategory[]>([]);
  const [showRhythms, setShowRhythms] = useState(true);
  const [editing, setEditing] = useState<{ event?: PlannerEvent } | null>(null);
  const tabRefs = useRef<Record<View, HTMLButtonElement | null>>({ day: null, week: null, month: null });

  const err = [events, routines, completions].find((s) => s.status === "error");
  if (err?.status === "error") return <ErrorNote message={err.error} />;
  if (events.status === "loading") return <Loading />;

  const allEvents = dataOf(events).filter((e) => filters.length === 0 || filters.includes(e.category));
  const step = (dir: 1 | -1) => setDate(view === "day" ? addDays(date, dir) : view === "week" ? addDays(date, 7 * dir) : addMonths(date, dir));
  const heading = view === "day" ? formatLong(date) : view === "week" ? `Week of ${formatShort(startOfWeek(date, settings.weekStartsOn))}` : formatMonth(date);

  const onTabKey = (e: React.KeyboardEvent, i: number) => {
    const delta = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
    if (!delta) return;
    const next = VIEWS[(i + delta + VIEWS.length) % VIEWS.length].id;
    setView(next);
    tabRefs.current[next]?.focus();
  };

  return (
    <div>
      <PageHeader eyebrow="Planner" title={heading}>
        <Button onClick={() => setEditing({})}>
          <Plus size={18} aria-hidden="true" /> New plan
        </Button>
      </PageHeader>

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div role="tablist" aria-label="Planner view" className="inline-flex rounded-full border border-line bg-surface p-1">
          {VIEWS.map((v, i) => (
            <button
              key={v.id}
              ref={(el) => {
                tabRefs.current[v.id] = el;
              }}
              role="tab"
              id={`tab-${v.id}`}
              aria-selected={view === v.id}
              aria-controls="planner-panel"
              tabIndex={view === v.id ? 0 : -1}
              onKeyDown={(e) => onTabKey(e, i)}
              onClick={() => setView(v.id)}
              className={`min-h-10 rounded-full px-4 text-sm ${view === v.id ? "bg-ink text-white" : "text-ink hover:bg-tint"}`}
            >
              {v.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-1">
          <IconButton label={`Previous ${view}`} onClick={() => step(-1)}>
            <ChevronLeft size={20} aria-hidden="true" />
          </IconButton>
          <Button variant="secondary" className="px-4" onClick={() => setDate(today)}>
            Today
          </Button>
          <IconButton label={`Next ${view}`} onClick={() => step(1)}>
            <ChevronRight size={20} aria-hidden="true" />
          </IconButton>
        </div>
      </div>

      <div className="mb-5 flex flex-wrap gap-1.5" role="group" aria-label="Filter by category">
        {(Object.keys(EVENT_CATEGORIES) as EventCategory[]).map((c) => (
          <Chip key={c} pressed={filters.includes(c)} onClick={() => setFilters((f) => (f.includes(c) ? f.filter((x) => x !== c) : [...f, c]))}>
            <span aria-hidden="true" className="h-2.5 w-2.5 rounded-full" style={{ background: EVENT_CATEGORIES[c].dot }} />
            {EVENT_CATEGORIES[c].label}
          </Chip>
        ))}
        <Chip pressed={showRhythms} onClick={() => setShowRhythms((s) => !s)}>
          Show rhythms
        </Chip>
      </div>

      <div id="planner-panel" role="tabpanel" aria-labelledby={`tab-${view}`} className="flex flex-col gap-4">
        {view === "week" && (
          <WeekStrip
            days={weekDays(date, settings.weekStartsOn)}
            selected={date}
            today={today}
            onSelect={setDate}
            countFor={(d) => eventsOn(allEvents, d).filter((e) => !e.cancelled).length}
            rhythmFor={(d) => (showRhythms ? dataOf(routines).filter((r) => isRoutineDue(r, d)).length : 0)}
          />
        )}
        {view === "month" && (
          <Card>
            <CalendarGrid
              label={formatMonth(date)}
              month={date}
              selected={date}
              today={today}
              weekStartsOn={settings.weekStartsOn}
              onSelect={setDate}
              renderDay={(d) => {
                const n = eventsOn(allEvents, d).filter((e) => !e.cancelled).length;
                return n > 0 ? (
                  <span className="mt-0.5 text-[0.65rem] leading-none" aria-hidden="true">
                    {"•".repeat(Math.min(n, 3))}
                  </span>
                ) : null;
              }}
            />
          </Card>
        )}

        <DayDetail
          date={date}
          events={eventsOn(allEvents, date)}
          showRhythms={showRhythms}
          onEdit={(event) => setEditing({ event })}
          onAdd={() => setEditing({})}
          rhythms={<RhythmList routines={dataOf(routines)} completions={dataOf(completions)} date={date} />}
        />

        {view === "week" && <GentleWeek key={startOfWeek(date, settings.weekStartsOn)} weekStart={startOfWeek(date, settings.weekStartsOn)} />}
      </div>

      {editing && <EventForm open event={editing.event} date={date} onClose={() => setEditing(null)} />}
    </div>
  );
}

function WeekStrip({
  days,
  selected,
  today,
  onSelect,
  countFor,
  rhythmFor,
}: {
  days: LocalDate[];
  selected: LocalDate;
  today: LocalDate;
  onSelect: (d: LocalDate) => void;
  countFor: (d: LocalDate) => number;
  rhythmFor: (d: LocalDate) => number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const onKey = (e: React.KeyboardEvent, i: number) => {
    const delta = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
    if (!delta) return;
    e.preventDefault();
    const next = days[(i + delta + 7) % 7];
    onSelect(next);
    requestAnimationFrame(() => ref.current?.querySelector<HTMLElement>(`[data-day="${next}"]`)?.focus());
  };
  return (
    <div ref={ref} role="group" aria-label="Days of this week" className="grid grid-cols-7 gap-1.5">
      {days.map((d, i) => {
        const sel = d === selected;
        const n = countFor(d);
        const r = rhythmFor(d);
        return (
          <button
            key={d}
            data-day={d}
            type="button"
            tabIndex={sel ? 0 : -1}
            aria-pressed={sel}
            aria-current={d === today ? "date" : undefined}
            aria-label={`${formatLong(d)}: ${n} plan${n === 1 ? "" : "s"}${r ? `, ${r} rhythm${r === 1 ? "" : "s"}` : ""}${d === today ? ", today" : ""}`}
            onClick={() => onSelect(d)}
            onKeyDown={(e) => onKey(e, i)}
            className={`flex min-h-20 flex-col items-center gap-1 rounded-2xl border py-2 transition-colors ${
              sel ? "border-ink bg-ink text-white" : d === today ? "border-gold bg-surface" : "border-line bg-surface hover:bg-tint"
            }`}
          >
            <span className="text-xs">{weekdayShort(weekday(d))}</span>
            <span className="font-display text-xl leading-none">{Number(d.slice(8))}</span>
            <span className="text-[0.7rem]" aria-hidden="true">
              {n > 0 ? `${n} plan${n === 1 ? "" : "s"}` : "·"}
            </span>
          </button>
        );
      })}
    </div>
  );
}

function DayDetail({
  date,
  events,
  showRhythms,
  rhythms,
  onEdit,
  onAdd,
}: {
  date: LocalDate;
  events: PlannerEvent[];
  showRhythms: boolean;
  rhythms: React.ReactNode;
  onEdit: (e: PlannerEvent) => void;
  onAdd: () => void;
}) {
  return (
    <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
      <Card aria-labelledby="day-plans">
        <CardTitle id="day-plans" eyebrow={formatLong(date)}>
          Plans
        </CardTitle>
        {events.length === 0 ? (
          <div className="flex flex-col items-start gap-2">
            <p className="text-muted">Nothing planned yet.</p>
            <Button variant="secondary" onClick={onAdd}>
              <Plus size={16} aria-hidden="true" /> Add a plan
            </Button>
          </div>
        ) : (
          <ul className="flex flex-col gap-1.5">
            {events.map((e) => {
              const done = isEventDone(e, date);
              return (
                <li key={e.id} className="flex items-center gap-2 rounded-2xl border border-line px-2 py-1.5">
                  <label className="flex min-h-11 min-w-0 flex-1 cursor-pointer items-center gap-3 pl-1">
                    <input type="checkbox" className="h-5 w-5 shrink-0 accent-[var(--hg-ink)]" checked={done} disabled={e.cancelled} onChange={() => toggleEventDone(e, date)} />
                    <span aria-hidden="true" className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: EVENT_CATEGORIES[e.category].dot }} />
                    <span className="min-w-0">
                      <span className={`block truncate ${done || e.cancelled ? "text-muted line-through" : ""}`}>
                        {e.title}
                        {e.cancelled && <span className="ml-2 text-xs no-underline">(cancelled)</span>}
                      </span>
                      <span className="block text-xs text-muted">
                        {formatTime(eventTime(e))}
                        {e.endAt && `–${formatTime(e.endAt.slice(11, 16))}`} · {EVENT_CATEGORIES[e.category].label}
                        {e.repeat && e.repeat !== "none" && (
                          <>
                            {" · "}
                            <Repeat size={12} className="inline align-[-1px]" aria-hidden="true" /> {e.repeat}
                          </>
                        )}
                        {e.isSample && " · Sample"}
                        {e.tags?.length ? ` · #${e.tags.join(" #")}` : ""}
                      </span>
                    </span>
                  </label>
                  {e.sticker && <Sticker id={e.sticker} />}
                  <IconButton label={`Edit ${e.title}`} onClick={() => onEdit(e)}>
                    <Pencil size={17} aria-hidden="true" />
                  </IconButton>
                </li>
              );
            })}
          </ul>
        )}
      </Card>
      <div className="flex flex-col gap-4">
        {showRhythms && (
          <Card aria-labelledby="day-rhythms">
            <CardTitle id="day-rhythms">Rhythms</CardTitle>
            {rhythms}
          </Card>
        )}
        <DayMemo key={date} date={date} />
      </div>
    </div>
  );
}

function DayMemo({ date }: { date: LocalDate }) {
  const notes = useStore("dayNotes");
  const saved = dataOf(notes).find((n) => n.localDate === date)?.text ?? "";
  const [text, setText] = useState<string | null>(null);
  const [status, setStatus] = useState("");
  const value = text ?? saved;
  const save = async () => {
    if (text === null || text === saved) return;
    await saveDayNote(date, text);
    setStatus("Note saved");
  };
  return (
    <Card aria-labelledby="day-memo">
      <CardTitle id="day-memo">Day note</CardTitle>
      <label htmlFor={`memo-${date}`} className="sr-only">
        Note for {formatLong(date)}
      </label>
      <textarea
        id={`memo-${date}`}
        rows={3}
        maxLength={2000}
        value={value}
        onChange={(e) => setText(e.target.value)}
        onBlur={save}
        placeholder="Anything to remember about this day…"
        className="w-full rounded-2xl border border-line bg-surface px-4 py-2.5 focus:border-ink focus:outline-none"
      />
      <p role="status" className="min-h-5 text-sm text-success">
        {status}
      </p>
    </Card>
  );
}

function GentleWeek({ weekStart }: { weekStart: LocalDate }) {
  const completions = useStore("completions");
  const events = useStore("events");
  const journal = useStore("journal");
  const reviews = useStore("weekReviews");
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const inWeek = (d: string) => days.includes(d);
  const kept = dataOf(completions).filter((c) => inWeek(c.localDate)).length;
  const plansDone = days.reduce((n, d) => n + eventsOn(dataOf(events), d).filter((e) => isEventDone(e, d)).length, 0);
  const graceDays = dataOf(journal).filter((j) => inWeek(j.localDate) && j.gratitude.some((g) => g.trim())).length;
  const saved = dataOf(reviews).find((r) => r.weekStart === weekStart)?.text ?? "";
  const [text, setText] = useState<string | null>(null);
  const [status, setStatus] = useState("");
  useEffect(() => setText(null), [saved]);

  return (
    <Card aria-labelledby="gentle-week">
      <CardTitle id="gentle-week" eyebrow="Weekly reflection">
        My gentle week
      </CardTitle>
      <p className="mb-3 text-muted">
        This week held {kept} rhythm moment{kept === 1 ? "" : "s"}, {plansDone} finished plan{plansDone === 1 ? "" : "s"}, and {graceDays} day{graceDays === 1 ? "" : "s"} with written graces.
      </p>
      <label htmlFor="week-review" className="mb-1.5 block text-sm font-medium">
        Where did you notice grace this week?
      </label>
      <textarea
        id="week-review"
        rows={3}
        maxLength={2000}
        value={text ?? saved}
        onChange={(e) => setText(e.target.value)}
        className="w-full rounded-2xl border border-line bg-surface px-4 py-2.5 focus:border-ink focus:outline-none"
      />
      <div className="mt-2 flex items-center justify-between">
        <p role="status" className="text-sm text-success">
          {status}
        </p>
        <Button
          variant="secondary"
          onClick={async () => {
            await saveWeekReview(weekStart, text ?? saved);
            setStatus("Reflection saved");
          }}
        >
          Save reflection
        </Button>
      </div>
    </Card>
  );
}
