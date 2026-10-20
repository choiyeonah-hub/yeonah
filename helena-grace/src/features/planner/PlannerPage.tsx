import { useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router";
import { Check, ChevronLeft, ChevronRight, Palette, PenLine, Plus, Pencil, Repeat } from "lucide-react";
import type { EventCategory, LocalDate, PlannerEvent, Settings } from "../../data/types";
import { dataOf, useApp, useStore } from "../../lib/hooks";
import { Button, Card, CardTitle, Chip, Dialog, ErrorNote, IconButton, Loading } from "../../components/ui";
import { CalendarGrid } from "../../components/ui/CalendarGrid";
import { Sticker } from "../../components/ui/Sticker";
import { PageHeader } from "../../components/layout/AppShell";
import { CATEGORY_COLORS, EVENT_CATEGORIES } from "../../content/labels";
import { addDays, addMonths, formatLong, formatMonth, formatShort, formatTime, startOfWeek, weekDays, weekdayShort, weekday } from "../../lib/date";
import { eventsOn, eventTime, isEventDone, saveDayNote, saveWeekReview, toggleEventDone } from "../../lib/storage/repos";
import { RhythmList } from "../today/RhythmList";
import { entryLabel } from "../journal/JournalPage";
import { EventForm } from "./EventForm";

type View = "day" | "week" | "month";
const VIEWS: { id: View; label: string }[] = [
  { id: "day", label: "Today" },
  { id: "week", label: "Week" },
  { id: "month", label: "Month" },
];
const CATEGORIES = Object.keys(EVENT_CATEGORIES) as EventCategory[];

export function categoryColor(settings: Settings, c: EventCategory): string {
  return settings.categoryPrefs?.[c]?.color ?? EVENT_CATEGORIES[c].dot;
}

function categoryVisible(settings: Settings, c: EventCategory): boolean {
  return settings.categoryPrefs?.[c]?.visible ?? true;
}

export function PlannerPage() {
  const { today, settings, updateSettings } = useApp();
  const events = useStore("events");
  const routines = useStore("routines");
  const completions = useStore("completions");
  const [params, setParams] = useSearchParams();
  const [view, setView] = useState<View>("week");
  const [weekLayout, setWeekLayout] = useState<"list" | "calendar">("list");
  const [date, setDate] = useState<LocalDate>(today);
  const [editing, setEditing] = useState<{ event?: PlannerEvent; date?: LocalDate } | null>(() => (params.get("new") ? {} : null));
  const [categoriesOpen, setCategoriesOpen] = useState(false);
  const tabRefs = useRef<Record<View, HTMLButtonElement | null>>({ day: null, week: null, month: null });

  useEffect(() => {
    if (params.get("new")) setParams({}, { replace: true });
  }, [params, setParams]);

  const err = [events, routines, completions].find((s) => s.status === "error");
  if (err?.status === "error") return <ErrorNote message={err.error} />;
  if (events.status === "loading") return <Loading />;

  const shownEvents = dataOf(events).filter((e) => categoryVisible(settings, e.category));
  const step = (dir: 1 | -1) => setDate(view === "day" ? addDays(date, dir) : view === "week" ? addDays(date, 7 * dir) : addMonths(date, dir));
  const heading = view === "day" ? formatLong(date) : view === "week" ? `Week of ${formatShort(startOfWeek(date, settings.weekStartsOn))}` : formatMonth(date);
  const color = (c: EventCategory) => categoryColor(settings, c);

  const onTabKey = (e: React.KeyboardEvent, i: number) => {
    const delta = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
    if (!delta) return;
    const next = VIEWS[(i + delta + VIEWS.length) % VIEWS.length].id;
    setView(next);
    tabRefs.current[next]?.focus();
  };

  const setVisible = (c: EventCategory, visible: boolean) =>
    updateSettings({ categoryPrefs: { ...settings.categoryPrefs, [c]: { color: color(c), visible } } });

  return (
    <div>
      <PageHeader eyebrow="Planner" title={heading}>
        <Button onClick={() => setEditing({ date })}>
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

      <div className="-mx-1 mb-5 flex gap-1.5 overflow-x-auto px-1 pb-1" role="group" aria-label="Show categories">
        {CATEGORIES.map((c) => (
          <Chip key={c} pressed={categoryVisible(settings, c)} onClick={() => setVisible(c, !categoryVisible(settings, c))}>
            <span aria-hidden="true" className="h-2.5 w-2.5 rounded-full" style={{ background: color(c) }} />
            {EVENT_CATEGORIES[c].label}
          </Chip>
        ))}
        <Chip pressed={false} onClick={() => setCategoriesOpen(true)}>
          <Palette size={15} aria-hidden="true" /> Colors
        </Chip>
      </div>

      <div id="planner-panel" role="tabpanel" aria-labelledby={`tab-${view}`} className="flex flex-col gap-4">
        {view === "week" && (
          <>
            <div role="group" aria-label="Week layout" className="inline-flex self-start rounded-full border border-line bg-surface p-1">
              {(["list", "calendar"] as const).map((l) => (
                <button key={l} type="button" aria-pressed={weekLayout === l} onClick={() => setWeekLayout(l)} className={`min-h-10 rounded-full px-4 text-sm ${weekLayout === l ? "bg-ink text-white" : ""}`}>
                  {l === "list" ? "List" : "Calendar"}
                </button>
              ))}
            </div>
            {weekLayout === "list" ? (
              <WeekList days={weekDays(date, settings.weekStartsOn)} today={today} events={shownEvents} color={color} onEdit={(event) => setEditing({ event })} onAdd={(d) => setEditing({ date: d })} />
            ) : (
              <WeekStrip days={weekDays(date, settings.weekStartsOn)} selected={date} today={today} onSelect={setDate} countFor={(d) => eventsOn(shownEvents, d).filter((e) => !e.cancelled).length} />
            )}
          </>
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
                const n = eventsOn(shownEvents, d).filter((e) => !e.cancelled).length;
                return n > 0 ? (
                  <span className="mt-0.5 text-[0.65rem] leading-none" aria-hidden="true">
                    {"•".repeat(Math.min(n, 3))}
                  </span>
                ) : null;
              }}
            />
          </Card>
        )}

        {!(view === "week" && weekLayout === "list") && (
          <DayDetail date={date} events={eventsOn(shownEvents, date)} color={color} onEdit={(event) => setEditing({ event })} onAdd={() => setEditing({ date })} />
        )}

        {settings.routinesEnabled && view !== "month" && (
          <Card aria-labelledby="day-rhythms">
            <CardTitle id="day-rhythms" eyebrow={view === "week" && weekLayout === "list" ? formatLong(date) : undefined}>
              Gentle routines
            </CardTitle>
            <RhythmList routines={dataOf(routines)} completions={dataOf(completions)} date={date} />
          </Card>
        )}

        {view === "week" && <GentleWeek key={startOfWeek(date, settings.weekStartsOn)} weekStart={startOfWeek(date, settings.weekStartsOn)} />}
      </div>

      {editing && <EventForm open event={editing.event} date={editing.date ?? date} onClose={() => setEditing(null)} />}
      <CategoryColors open={categoriesOpen} onClose={() => setCategoriesOpen(false)} />
    </div>
  );
}

function EventRow({ e, date, color, onEdit }: { e: PlannerEvent; date: LocalDate; color: (c: EventCategory) => string; onEdit: (e: PlannerEvent) => void }) {
  const done = isEventDone(e, date);
  return (
    <li className="flex items-center gap-2 rounded-[18px] border border-line bg-surface py-1.5 pl-1.5 pr-1">
      <button
        type="button"
        aria-pressed={done}
        aria-label={`${done ? "Done" : "Mark done"}: ${e.title}`}
        disabled={e.cancelled}
        onClick={() => toggleEventDone(e, date)}
        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full border transition-colors disabled:opacity-40 ${done ? "border-gold bg-gold text-white" : "border-line hover:bg-tint"}`}
      >
        <Check size={18} aria-hidden="true" className={done ? "" : "text-line"} strokeWidth={2.4} />
      </button>
      <span aria-hidden="true" className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: color(e.category) }} />
      <span className="min-w-0 flex-1 py-1">
        <span className={`block text-[1.02rem] ${done || e.cancelled ? "text-muted line-through" : ""}`}>
          {e.title}
          {e.cancelled && <span className="ml-2 text-xs">(cancelled)</span>}
        </span>
        <span className="block text-sm text-muted">
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
      {e.sticker && <Sticker id={e.sticker} />}
      <IconButton label={`Edit ${e.title}`} onClick={() => onEdit(e)}>
        <Pencil size={17} aria-hidden="true" />
      </IconButton>
    </li>
  );
}

function WeekList({
  days,
  today,
  events,
  color,
  onEdit,
  onAdd,
}: {
  days: LocalDate[];
  today: LocalDate;
  events: PlannerEvent[];
  color: (c: EventCategory) => string;
  onEdit: (e: PlannerEvent) => void;
  onAdd: (d: LocalDate) => void;
}) {
  return (
    <ol className="flex flex-col gap-3">
      {days.map((d) => {
        const list = eventsOn(events, d);
        return (
          <li key={d} className={`rounded-[22px] border p-4 ${d === today ? "border-gold/70 bg-surface" : "border-line bg-surface/70"}`}>
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <h2 className="font-sans text-base font-medium">
                {formatLong(d).replace(/, \d{4}$/, "")}
                {d === today && <span className="ml-2 text-sm font-normal text-gold-ink">Today</span>}
              </h2>
              <div className="flex gap-1">
                <Link to={`/app/journal/new?date=${d}`} className="inline-flex min-h-11 items-center gap-1 rounded-full px-3 text-sm text-gold-ink hover:bg-tint" aria-label={`Write a reflection for ${formatLong(d)}`}>
                  <PenLine size={15} aria-hidden="true" /> Reflect
                </Link>
                <IconButton label={`Add a plan on ${formatLong(d)}`} onClick={() => onAdd(d)}>
                  <Plus size={18} aria-hidden="true" />
                </IconButton>
              </div>
            </div>
            {list.length === 0 ? (
              <p className="text-sm text-muted">Open day</p>
            ) : (
              <ul className="flex flex-col gap-1.5">
                {list.map((e) => (
                  <EventRow key={e.id} e={e} date={d} color={color} onEdit={onEdit} />
                ))}
              </ul>
            )}
          </li>
        );
      })}
    </ol>
  );
}

function WeekStrip({ days, selected, today, onSelect, countFor }: { days: LocalDate[]; selected: LocalDate; today: LocalDate; onSelect: (d: LocalDate) => void; countFor: (d: LocalDate) => number }) {
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
        return (
          <button
            key={d}
            data-day={d}
            type="button"
            tabIndex={sel ? 0 : -1}
            aria-pressed={sel}
            aria-current={d === today ? "date" : undefined}
            aria-label={`${formatLong(d)}: ${n} plan${n === 1 ? "" : "s"}${d === today ? ", today" : ""}`}
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

function DayDetail({ date, events, color, onEdit, onAdd }: { date: LocalDate; events: PlannerEvent[]; color: (c: EventCategory) => string; onEdit: (e: PlannerEvent) => void; onAdd: () => void }) {
  const journal = useStore("journal");
  const reflections = dataOf(journal).filter((j) => j.localDate === date);
  return (
    <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
      <Card aria-labelledby="day-plans">
        <CardTitle id="day-plans" eyebrow={formatLong(date)}>
          Plans
        </CardTitle>
        {events.length === 0 ? (
          <p className="mb-3 text-muted">Nothing planned yet.</p>
        ) : (
          <ul className="mb-3 flex flex-col gap-1.5">
            {events.map((e) => (
              <EventRow key={e.id} e={e} date={date} color={color} onEdit={onEdit} />
            ))}
          </ul>
        )}
        <Button variant="secondary" onClick={onAdd}>
          <Plus size={16} aria-hidden="true" /> Add a plan
        </Button>
      </Card>
      <div className="flex flex-col gap-4">
        <Card aria-labelledby="day-reflect">
          <CardTitle id="day-reflect">Reflection</CardTitle>
          {reflections.length > 0 && (
            <ul className="mb-3 flex flex-col gap-1">
              {reflections.map((r) => (
                <li key={r.id}>
                  <Link to={`/app/journal/${r.id}?mode=read`} className="inline-flex min-h-11 items-center text-gold-ink underline-offset-4 hover:underline">
                    {entryLabel(r)}
                  </Link>
                </li>
              ))}
            </ul>
          )}
          <Link to={`/app/journal/new?date=${date}`} className="inline-flex min-h-11 items-center gap-2 rounded-full bg-ink px-5 text-white">
            <PenLine size={16} aria-hidden="true" /> Write a reflection
          </Link>
        </Card>
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
        rows={4}
        value={value}
        onChange={(e) => setText(e.target.value)}
        onBlur={save}
        placeholder="Anything to remember about this day…"
        className="w-full rounded-2xl border border-line bg-surface px-4 py-2.5 leading-relaxed focus:border-ink focus:outline-none"
      />
      <p role="status" className="min-h-5 text-sm text-success">
        {status}
      </p>
    </Card>
  );
}

function GentleWeek({ weekStart }: { weekStart: LocalDate }) {
  const events = useStore("events");
  const journal = useStore("journal");
  const gratitude = useStore("gratitude");
  const reviews = useStore("weekReviews");
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const inWeek = (d: string) => days.includes(d);
  const plansDone = days.reduce((n, d) => n + eventsOn(dataOf(events), d).filter((e) => isEventDone(e, d)).length, 0);
  const reflections = dataOf(journal).filter((j) => inWeek(j.localDate)).length;
  const graces = dataOf(gratitude).filter((g) => inWeek(g.localDate)).length;
  const saved = dataOf(reviews).find((r) => r.weekStart === weekStart)?.text ?? "";
  const [text, setText] = useState<string | null>(null);
  const [status, setStatus] = useState("");
  useEffect(() => setText(null), [saved]);
  const plural = (n: number, w: string) => `${n} ${w}${n === 1 ? "" : "s"}`;

  return (
    <Card aria-labelledby="gentle-week">
      <CardTitle id="gentle-week" eyebrow="Weekly reflection">
        My gentle week
      </CardTitle>
      <p className="mb-3 text-muted">
        This week held {plural(plansDone, "finished plan")}, {plural(reflections, "reflection")} and {plural(graces, "note")} of gratitude.
      </p>
      <label htmlFor="week-review" className="mb-1.5 block text-sm font-medium">
        Where did you notice grace this week?
      </label>
      <textarea
        id="week-review"
        rows={4}
        value={text ?? saved}
        onChange={(e) => setText(e.target.value)}
        className="w-full rounded-2xl border border-line bg-surface px-4 py-2.5 leading-relaxed focus:border-ink focus:outline-none"
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

function CategoryColors({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { settings, updateSettings } = useApp();
  return (
    <Dialog open={open} onClose={onClose} title="Category colors">
      <p className="mb-4 text-sm text-muted">Colors are only a visual aid — every plan also shows its category name.</p>
      <ul className="flex flex-col gap-4">
        {CATEGORIES.map((c) => (
          <li key={c}>
            <fieldset>
              <legend className="mb-1.5 font-medium">{EVENT_CATEGORIES[c].label}</legend>
              <div className="flex flex-wrap gap-1.5">
                {CATEGORY_COLORS.map((col) => {
                  const selected = categoryColor(settings, c) === col;
                  return (
                    <button
                      key={col}
                      type="button"
                      aria-pressed={selected}
                      aria-label={`${EVENT_CATEGORIES[c].label}: color ${col}`}
                      onClick={() => updateSettings({ categoryPrefs: { ...settings.categoryPrefs, [c]: { color: col, visible: categoryVisible(settings, c) } } })}
                      className={`flex h-11 w-11 items-center justify-center rounded-full border-2 ${selected ? "border-ink" : "border-transparent"}`}
                    >
                      <span className="h-7 w-7 rounded-full" style={{ background: col }} />
                    </button>
                  );
                })}
              </div>
            </fieldset>
          </li>
        ))}
      </ul>
      <div className="mt-5 flex justify-end">
        <Button onClick={onClose}>Done</Button>
      </div>
    </Dialog>
  );
}
