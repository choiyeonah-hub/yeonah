import { useState } from "react";
import { Link, useSearchParams } from "react-router";
import { BookOpen, CalendarDays, ChevronLeft, ChevronRight, Download, Lock, PenLine, Search, Star } from "lucide-react";
import type { GratitudeEntry, Intention, JournalEntry } from "../../data/types";
import { dataOf, useApp, useStore } from "../../lib/hooks";
import { Button, Card, CardTitle, Chip, EmptyState, ErrorNote, Field, IconButton, Loading } from "../../components/ui";
import { CalendarGrid } from "../../components/ui/CalendarGrid";
import { addDays, formatLong, formatMonth, isDateKey } from "../../lib/date";
import { hasErrors, validateGratitude, validateIntention } from "../../lib/validation";
import { latestEntry, remove, saveGratitude, saveIntention } from "../../lib/storage/repos";
import { downloadText, gratitudeCsv, intentionsCsv, journalCsv } from "../../lib/storage/backup";
import { nowIso } from "../../lib/storage/db";
import { IntentionForm } from "./IntentionForm";

const TABS = [
  { id: "reflections", label: "Reflections" },
  { id: "intentions", label: "Intentions" },
  { id: "gratitude", label: "Gratitude" },
  { id: "search", label: "Search" },
] as const;
type Tab = (typeof TABS)[number]["id"];

export function excerpt(body: string, n = 160): string {
  const flat = body.replace(/\s+/g, " ").trim();
  return flat.length > n ? flat.slice(0, n).replace(/\s+\S*$/, "") + "…" : flat;
}

export function entryLabel(e: JournalEntry): string {
  return e.title?.trim() || excerpt(e.body, 60) || "Untitled reflection";
}

export function JournalPage() {
  const [params, setParams] = useSearchParams();
  const tab = (TABS.find((t) => t.id === params.get("tab"))?.id ?? "reflections") as Tab;
  const journal = useStore("journal");
  const intentions = useStore("intentions");
  const gratitude = useStore("gratitude");

  const go = (patch: Record<string, string | null>) => {
    const p = new URLSearchParams(params);
    for (const [k, v] of Object.entries(patch)) {
      if (v === null) p.delete(k);
      else p.set(k, v);
    }
    setParams(p, { replace: true });
  };

  const err = [journal, intentions, gratitude].find((s) => s.status === "error");
  if (err?.status === "error") return <ErrorNote message={err.error} />;
  if (journal.status === "loading") return <Loading />;
  const latest = latestEntry(dataOf(journal));

  return (
    <div className="flex flex-col gap-5">
      <header>
        <p className="text-sm text-muted">Journal</p>
        <h1 className="text-[2.1rem] leading-tight sm:text-[2.6rem]">A place for your prayers and reflections.</h1>
        <p className="mt-1 text-muted">Stay a while. Write as much as you need.</p>
      </header>

      <div className="flex flex-wrap gap-2">
        <Link to="/app/journal/new" className="inline-flex min-h-12 items-center gap-2 rounded-full bg-ink px-5 font-medium text-white hover:bg-[#1b2a37]">
          <PenLine size={18} aria-hidden="true" /> New reflection
        </Link>
        {latest && (
          <Link to={`/app/journal/${latest.id}`} className="inline-flex min-h-12 items-center gap-2 rounded-full border border-gold/70 bg-surface px-5 font-medium hover:bg-tint">
            Continue writing
          </Link>
        )}
        <button type="button" onClick={() => go({ tab: "reflections", date: null })} className="inline-flex min-h-12 items-center gap-2 rounded-full border border-line bg-surface px-5 hover:bg-tint">
          <BookOpen size={18} aria-hidden="true" /> Read past entries
        </button>
      </div>

      <nav aria-label="Journal sections" className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1">
        {TABS.map((t) => (
          <Chip key={t.id} pressed={tab === t.id} onClick={() => go({ tab: t.id })}>
            {t.label}
          </Chip>
        ))}
      </nav>

      {tab === "reflections" && <ReflectionsPanel entries={dataOf(journal)} date={params.get("date")} setDate={(d) => go({ date: d })} />}
      {tab === "intentions" && <IntentionsPanel items={dataOf(intentions)} />}
      {tab === "gratitude" && <GratitudePanel items={dataOf(gratitude)} />}
      {tab === "search" && <SearchPanel entries={dataOf(journal)} intentions={dataOf(intentions)} gratitude={dataOf(gratitude)} />}

      <p className="text-sm text-muted">
        <Lock size={13} className="mr-1 inline" aria-hidden="true" />
        Everything here is saved only in this browser on this device and is not encrypted. Clearing browser data or losing the device can erase it — export a copy now and then.
      </p>
    </div>
  );
}

function groupByDate<T extends { localDate: string }>(items: T[]): [string, T[]][] {
  const map = new Map<string, T[]>();
  for (const i of [...items].sort((a, b) => b.localDate.localeCompare(a.localDate))) map.set(i.localDate, [...(map.get(i.localDate) ?? []), i]);
  return [...map.entries()];
}

function ReflectionsPanel({ entries, date, setDate }: { entries: JournalEntry[]; date: string | null; setDate: (d: string | null) => void }) {
  const { today, settings } = useApp();
  const [showCalendar, setShowCalendar] = useState(false);
  const [month, setMonth] = useState(date && isDateKey(date) ? date : today);
  const day = date && isDateKey(date) ? date : null;
  const shown = day ? entries.filter((e) => e.localDate === day) : entries;
  const days = new Set(entries.map((e) => e.localDate));

  return (
    <section aria-label="Reflections" className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        {day ? (
          <div className="flex items-center gap-1">
            <IconButton label="Previous day" onClick={() => setDate(addDays(day, -1))}>
              <ChevronLeft size={20} aria-hidden="true" />
            </IconButton>
            <p className="font-display text-xl">{formatLong(day)}</p>
            <IconButton label="Next day" onClick={() => setDate(addDays(day, 1))}>
              <ChevronRight size={20} aria-hidden="true" />
            </IconButton>
            <Button variant="ghost" className="px-3 text-sm" onClick={() => setDate(null)}>
              All entries
            </Button>
          </div>
        ) : (
          <p className="text-muted">
            {entries.length} reflection{entries.length === 1 ? "" : "s"}, newest first
          </p>
        )}
        <div className="flex gap-2">
          <Button variant="secondary" className="px-4" aria-pressed={showCalendar} onClick={() => setShowCalendar((s) => !s)}>
            <CalendarDays size={17} aria-hidden="true" /> {showCalendar ? "Hide calendar" : "Monthly light"}
          </Button>
        </div>
      </div>

      {showCalendar && (
        <Card>
          <div className="mb-2 flex items-center justify-between">
            <IconButton label="Previous month" onClick={() => setMonth(addDays(month.slice(0, 8) + "01", -1))}>
              <ChevronLeft size={20} aria-hidden="true" />
            </IconButton>
            <h2 className="text-2xl">{formatMonth(month)}</h2>
            <IconButton label="Next month" onClick={() => setMonth(addDays(month.slice(0, 8) + "28", 5))}>
              <ChevronRight size={20} aria-hidden="true" />
            </IconButton>
          </div>
          <CalendarGrid
            label={`Reflection days in ${formatMonth(month)}`}
            month={month}
            selected={day ?? today}
            today={today}
            weekStartsOn={settings.weekStartsOn}
            onSelect={(d) => {
              setMonth(d);
              setDate(d);
            }}
            renderDay={(d) =>
              days.has(d) ? (
                <span className="mt-0.5 inline-block h-2.5 w-2.5 rounded-full bg-gold">
                  <span className="sr-only">has a reflection</span>
                </span>
              ) : null
            }
          />
        </Card>
      )}

      {shown.length === 0 ? (
        <EmptyState
          title={day ? "Nothing written on this day" : "Your journal is waiting"}
          body="A reflection can be a single sentence or many pages."
          action={
            <Link to={`/app/journal/new${day ? `?date=${day}` : ""}`} className="inline-flex min-h-11 items-center rounded-full bg-ink px-5 text-white">
              Write {day ? "for this day" : "your first reflection"}
            </Link>
          }
        />
      ) : (
        <ol className="flex flex-col gap-5">
          {groupByDate(shown).map(([d, list]) => (
            <li key={d}>
              <h2 className="mb-2 font-sans text-sm font-medium uppercase tracking-[0.12em] text-gold-ink">{formatLong(d)}</h2>
              <ul className="flex flex-col gap-2">
                {list
                  .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
                  .map((e) => (
                    <li key={e.id}>
                      <Link to={`/app/journal/${e.id}?mode=read`} className="block rounded-[20px] border border-line bg-surface p-5 hover:bg-tint/60">
                        <span className="block font-display text-2xl leading-snug">{entryLabel(e)}</span>
                        {e.title?.trim() && <span className="mt-1 block text-muted">{excerpt(e.body)}</span>}
                        <span className="mt-2 block text-sm text-muted">
                          {e.body.trim() ? e.body.trim().split(/\s+/).length : 0} words
                          {e.tags.length > 0 && ` · #${e.tags.join(" #")}`}
                          {e.isSample && " · Sample"}
                        </span>
                      </Link>
                    </li>
                  ))}
              </ul>
            </li>
          ))}
        </ol>
      )}

      {entries.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" onClick={() => downloadText(`helena-grace-reflections-${today}.csv`, journalCsv(entries), "text/csv")}>
            <Download size={17} aria-hidden="true" /> Export reflections (CSV)
          </Button>
          <Button variant="secondary" onClick={() => downloadText(`helena-grace-reflections-${today}.json`, JSON.stringify(entries, null, 2), "application/json")}>
            <Download size={17} aria-hidden="true" /> Export reflections (JSON)
          </Button>
        </div>
      )}
    </section>
  );
}

function GratitudePanel({ items }: { items: GratitudeEntry[] }) {
  const { today, settings, updateSettings } = useApp();
  const [text, setText] = useState("");
  const [date, setDate] = useState(today);
  const [error, setError] = useState<string>();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs = validateGratitude(text);
    setError(errs.text);
    if (hasErrors(errs)) return;
    await saveGratitude({ text, localDate: date });
    setText("");
  };

  return (
    <section aria-label="Gratitude" className="flex flex-col gap-4">
      <Card>
        <CardTitle>Notice the good</CardTitle>
        <p className="mb-3 text-muted">In your own words — one moment or many. Nothing to fill in, nothing to keep up with.</p>
        <form onSubmit={submit} noValidate className="flex flex-col gap-3">
          <Field label="Something you're grateful for" error={error}>
            {(p) => <textarea {...p} rows={3} value={text} onChange={(e) => setText(e.target.value)} className={`${p.className} leading-relaxed`} />}
          </Field>
          <div className="flex flex-wrap items-end justify-between gap-2">
            <div className="flex flex-col gap-1">
              <label htmlFor="g-date" className="text-sm font-medium">
                Date
              </label>
              <input id="g-date" type="date" value={date} onChange={(e) => isDateKey(e.target.value) && setDate(e.target.value)} className="min-h-11 rounded-2xl border border-line bg-surface px-3" />
            </div>
            <Button type="submit">Save</Button>
          </div>
        </form>
      </Card>
      {items.length === 0 ? (
        <EmptyState title="No gratitude notes yet" body="Small things count: a kind word, a quiet minute, warm light." />
      ) : (
        <ol className="flex flex-col gap-4">
          {groupByDate(items).map(([d, list]) => (
            <li key={d}>
              <h2 className="mb-2 font-sans text-sm font-medium uppercase tracking-[0.12em] text-gold-ink">{formatLong(d)}</h2>
              <ul className="flex flex-col gap-2">
                {list.map((g) => (
                  <GratitudeItem key={g.id} item={g} isGraceNote={settings.graceNoteId === g.id} onGraceNote={(on) => updateSettings({ graceNoteId: on ? g.id : undefined })} />
                ))}
              </ul>
            </li>
          ))}
        </ol>
      )}
      {items.length > 0 && (
        <Button variant="secondary" className="self-start" onClick={() => downloadText(`helena-grace-gratitude-${today}.csv`, gratitudeCsv(items), "text/csv")}>
          <Download size={17} aria-hidden="true" /> Export gratitude (CSV)
        </Button>
      )}
    </section>
  );
}

function GratitudeItem({ item, isGraceNote, onGraceNote }: { item: GratitudeEntry; isGraceNote: boolean; onGraceNote: (on: boolean) => void }) {
  const [mode, setMode] = useState<"view" | "edit" | "delete">("view");
  const [text, setText] = useState(item.text);
  return (
    <li className="rounded-[20px] border border-line bg-surface p-4">
      {mode === "edit" ? (
        <div className="flex flex-col gap-2">
          <label htmlFor={`g-${item.id}`} className="sr-only">
            Edit gratitude
          </label>
          <textarea id={`g-${item.id}`} rows={3} value={text} onChange={(e) => setText(e.target.value)} className="w-full rounded-2xl border border-line px-4 py-2.5 leading-relaxed" />
          <div className="flex gap-2">
            <Button disabled={!text.trim()} onClick={() => saveGratitude({ ...item, text }).then(() => setMode("view"))}>
              Save
            </Button>
            <Button variant="ghost" onClick={() => setMode("view")}>
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <p className="whitespace-pre-wrap break-words font-display text-xl leading-snug">
          {item.text}
          {item.isSample && <span className="ml-2 rounded-full bg-celadon px-2 py-0.5 font-sans text-xs">Sample</span>}
        </p>
      )}
      {mode === "view" && (
        <div className="mt-2 flex flex-wrap gap-1">
          <Button variant="ghost" className="px-3 text-sm" aria-pressed={isGraceNote} onClick={() => onGraceNote(!isGraceNote)}>
            <Star size={15} aria-hidden="true" fill={isGraceNote ? "currentColor" : "none"} /> {isGraceNote ? "Your Grace Note" : "Use as Grace Note"}
          </Button>
          <Button variant="ghost" className="px-3 text-sm" onClick={() => setMode("edit")}>
            Edit
          </Button>
          <Button variant="ghost" className="px-3 text-sm text-warning" onClick={() => setMode("delete")}>
            Delete
          </Button>
        </div>
      )}
      {mode === "delete" && (
        <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
          Delete this note?
          <Button variant="danger" onClick={() => remove("gratitude", item.id)}>
            Delete
          </Button>
          <Button variant="ghost" onClick={() => setMode("view")}>
            Keep
          </Button>
        </div>
      )}
    </li>
  );
}

function IntentionsPanel({ items }: { items: Intention[] }) {
  const [filter, setFilter] = useState<"open" | "answered" | "archived">("open");
  const shown = items
    .filter((i) => (filter === "archived" ? i.archivedAt : filter === "answered" ? i.resolvedAt && !i.archivedAt : !i.resolvedAt && !i.archivedAt))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return (
    <section aria-label="Prayer intentions" className="flex flex-col gap-4">
      <Card>
        <CardTitle>Prayer intentions</CardTitle>
        <IntentionForm />
      </Card>
      <div className="flex items-center justify-between gap-2">
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Show intentions">
          <Chip pressed={filter === "open"} onClick={() => setFilter("open")}>
            Holding
          </Chip>
          <Chip pressed={filter === "answered"} onClick={() => setFilter("answered")}>
            Answered prayers
          </Chip>
          <Chip pressed={filter === "archived"} onClick={() => setFilter("archived")}>
            Archived
          </Chip>
        </div>
        <IconButton label="Download intentions as CSV" onClick={() => downloadText("helena-grace-intentions.csv", intentionsCsv(items), "text/csv")}>
          <Download size={18} aria-hidden="true" />
        </IconButton>
      </div>
      {shown.length === 0 ? (
        <EmptyState title={filter === "open" ? "No intentions yet" : filter === "answered" ? "Nothing marked answered" : "Nothing archived"} body={filter === "answered" ? "Only you decide when a prayer feels answered." : undefined} />
      ) : (
        <ul className="flex flex-col gap-2">
          {shown.map((i) => (
            <IntentionItem key={i.id} item={i} />
          ))}
        </ul>
      )}
    </section>
  );
}

function IntentionItem({ item }: { item: Intention }) {
  const [mode, setMode] = useState<"view" | "edit" | "delete">("view");
  const [text, setText] = useState(item.text);
  const [note, setNote] = useState(item.note ?? "");
  const [error, setError] = useState<string>();

  const saveEdit = async () => {
    const errs = validateIntention(text);
    setError(errs.text);
    if (hasErrors(errs)) return;
    await saveIntention({ ...item, text, note: note.trim() ? note : undefined });
    setMode("view");
  };

  return (
    <li className="rounded-[20px] border border-line bg-surface p-4">
      {mode === "edit" ? (
        <div className="flex flex-col gap-3">
          <Field label="Intention" error={error}>
            {(p) => <input {...p} value={text} onChange={(e) => setText(e.target.value)} />}
          </Field>
          <Field label="Note">{(p) => <textarea {...p} rows={5} value={note} onChange={(e) => setNote(e.target.value)} className={`${p.className} leading-relaxed`} />}</Field>
          <div className="flex gap-2">
            <Button onClick={saveEdit}>Save</Button>
            <Button variant="ghost" onClick={() => setMode("view")}>
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <>
          <p className="break-words text-[1.05rem] font-medium">
            {item.isPrivate && <Lock size={14} className="mr-1.5 inline text-muted" aria-label="Private" />}
            {item.text}
            {item.isSample && <span className="ml-2 rounded-full bg-celadon px-2 py-0.5 text-xs font-normal">Sample</span>}
          </p>
          {item.note && <p className="mt-1.5 whitespace-pre-wrap break-words leading-relaxed text-muted">{item.note}</p>}
          {item.resolvedAt && <p className="mt-1.5 text-sm text-success">You marked this answered.</p>}
        </>
      )}
      {mode === "view" && (
        <div className="mt-2 flex flex-wrap gap-1">
          <Button variant="ghost" className="px-3 text-sm" onClick={() => setMode("edit")}>
            Edit
          </Button>
          <Button variant="ghost" className="px-3 text-sm" onClick={() => saveIntention({ ...item, resolvedAt: item.resolvedAt ? undefined : nowIso() })}>
            {item.resolvedAt ? "Move back to holding" : "Mark as answered"}
          </Button>
          <Button variant="ghost" className="px-3 text-sm" onClick={() => saveIntention({ ...item, isPrivate: !item.isPrivate })}>
            {item.isPrivate ? "Allow in share cards" : "Make private"}
          </Button>
          <Button variant="ghost" className="px-3 text-sm" onClick={() => saveIntention({ ...item, archivedAt: item.archivedAt ? undefined : nowIso() })}>
            {item.archivedAt ? "Unarchive" : "Archive"}
          </Button>
          <Button variant="ghost" className="px-3 text-sm text-warning" onClick={() => setMode("delete")}>
            Delete
          </Button>
        </div>
      )}
      {mode === "delete" && (
        <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
          Delete this intention permanently?
          <Button variant="danger" onClick={() => remove("intentions", item.id)}>
            Delete
          </Button>
          <Button variant="ghost" onClick={() => setMode("view")}>
            Keep
          </Button>
        </div>
      )}
    </li>
  );
}

function SearchPanel({ entries, intentions, gratitude }: { entries: JournalEntry[]; intentions: Intention[]; gratitude: GratitudeEntry[] }) {
  const [q, setQ] = useState("");
  const term = q.trim().toLowerCase();
  const hit = (s?: string) => !!s && s.toLowerCase().includes(term);
  const entryHits = term ? entries.filter((e) => hit(e.title) || hit(e.body) || e.tags.some(hit)).sort((a, b) => b.localDate.localeCompare(a.localDate)) : [];
  const intentionHits = term ? intentions.filter((i) => hit(i.text) || hit(i.note)) : [];
  const gratitudeHits = term ? gratitude.filter((g) => hit(g.text)) : [];
  const total = entryHits.length + intentionHits.length + gratitudeHits.length;

  // Show the sentence around the match rather than the start of a long entry.
  const around = (body: string) => {
    const i = body.toLowerCase().indexOf(term);
    if (i < 0) return excerpt(body);
    const start = Math.max(0, i - 60);
    return (start > 0 ? "…" : "") + body.slice(start, i + term.length + 100).replace(/\s+/g, " ") + "…";
  };

  return (
    <section aria-label="Search" className="flex flex-col gap-4">
      <div className="relative">
        <Search size={18} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted" aria-hidden="true" />
        <label htmlFor="journal-search" className="sr-only">
          Search your reflections, intentions and gratitude
        </label>
        <input
          id="journal-search"
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search reflections, intentions, gratitude, tags…"
          className="w-full rounded-full border border-line bg-surface py-3 pl-11 pr-4 focus:border-ink focus:outline-none"
        />
      </div>
      <p role="status" className="text-sm text-muted">
        {term ? `${total} result${total === 1 ? "" : "s"}` : "Searching happens only on this device."}
      </p>
      {entryHits.length > 0 && (
        <ul className="flex flex-col gap-2">
          {entryHits.map((e) => (
            <li key={e.id}>
              <Link to={`/app/journal/${e.id}?mode=read`} className="block rounded-[20px] border border-line bg-surface p-4 hover:bg-tint">
                <span className="block text-sm text-muted">Reflection · {formatLong(e.localDate)}</span>
                <span className="block font-display text-xl">{entryLabel(e)}</span>
                <span className="block text-muted">{around(e.body)}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
      {(intentionHits.length > 0 || gratitudeHits.length > 0) && (
        <ul className="flex flex-col gap-2">
          {intentionHits.map((i) => (
            <li key={i.id} className="rounded-[20px] border border-line bg-surface p-4">
              <span className="block text-sm text-muted">Intention</span>
              {i.text}
            </li>
          ))}
          {gratitudeHits.map((g) => (
            <li key={g.id} className="rounded-[20px] border border-line bg-surface p-4">
              <span className="block text-sm text-muted">Gratitude · {formatLong(g.localDate)}</span>
              {g.text}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
