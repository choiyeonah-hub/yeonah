import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router";
import { ChevronLeft, ChevronRight, Download, Lock, Search } from "lucide-react";
import type { Intention, JournalEntry, LocalDate, Mood } from "../../data/types";
import { dataOf, useApp, useStore } from "../../lib/hooks";
import { Button, Card, CardTitle, Chip, EmptyState, ErrorNote, Field, IconButton, Loading } from "../../components/ui";
import { CalendarGrid } from "../../components/ui/CalendarGrid";
import { PageHeader } from "../../components/layout/AppShell";
import { MOODS } from "../../content/labels";
import { addDays, compareKeys, formatLong, formatMonth, isDateKey } from "../../lib/date";
import { hasErrors, parseTags, validateIntention, validateJournal, type Errors } from "../../lib/validation";
import { clearDraft, loadDraft, remove, saveDraft, saveIntention, saveJournal } from "../../lib/storage/repos";
import { downloadText, intentionsCsv, journalCsv } from "../../lib/storage/backup";
import { nowIso } from "../../lib/storage/db";
import { IntentionForm } from "./IntentionForm";

const TABS = [
  { id: "page", label: "Three graces" },
  { id: "intentions", label: "Intentions" },
  { id: "month", label: "Monthly light" },
  { id: "search", label: "Search" },
] as const;
type Tab = (typeof TABS)[number]["id"];

export function JournalPage() {
  const { today } = useApp();
  const [params, setParams] = useSearchParams();
  const tab = (TABS.find((t) => t.id === params.get("tab"))?.id ?? "page") as Tab;
  const dateParam = params.get("date");
  const date = dateParam && isDateKey(dateParam) ? dateParam : today;
  const journal = useStore("journal");
  const intentions = useStore("intentions");

  const go = (next: { tab?: Tab; date?: LocalDate }) => {
    const p = new URLSearchParams(params);
    if (next.tab) p.set("tab", next.tab);
    if (next.date) p.set("date", next.date);
    setParams(p, { replace: true });
  };

  if (journal.status === "error") return <ErrorNote message={journal.error} />;
  if (journal.status === "loading") return <Loading />;

  return (
    <div className="flex flex-col gap-4">
      <PageHeader eyebrow="Journal" title="Notice the good">
        <Button variant="secondary" onClick={() => downloadText(`helena-grace-journal-${today}.csv`, journalCsv(journal.data), "text/csv")}>
          <Download size={17} aria-hidden="true" /> Journal CSV
        </Button>
      </PageHeader>
      <nav aria-label="Journal sections" className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1">
        {TABS.map((t) => (
          <Chip key={t.id} pressed={tab === t.id} onClick={() => go({ tab: t.id })}>
            {t.label}
          </Chip>
        ))}
      </nav>

      {tab === "page" && (
        <>
          <div className="flex items-center justify-between gap-2">
            <IconButton label="Previous day" onClick={() => go({ date: addDays(date, -1) })}>
              <ChevronLeft size={20} aria-hidden="true" />
            </IconButton>
            <div className="text-center">
              <p className="font-display text-xl">{formatLong(date)}</p>
              {date !== today && (
                <button type="button" className="min-h-8 text-sm text-gold-ink underline-offset-4 hover:underline" onClick={() => go({ date: today })}>
                  Back to today
                </button>
              )}
            </div>
            <IconButton label="Next day" onClick={() => go({ date: addDays(date, 1) })} disabled={compareKeys(date, today) >= 0}>
              <ChevronRight size={20} aria-hidden="true" />
            </IconButton>
          </div>
          <EntryEditor key={date} date={date} entry={journal.data.find((j) => j.localDate === date)} />
        </>
      )}
      {tab === "intentions" && <IntentionsPanel items={dataOf(intentions)} />}
      {tab === "month" && <MonthlyLight entries={journal.data} date={date} onOpen={(d) => go({ tab: "page", date: d })} />}
      {tab === "search" && <SearchPanel entries={journal.data} intentions={dataOf(intentions)} onOpen={(d) => go({ tab: "page", date: d })} />}
    </div>
  );
}

type EntryForm = { gratitude: [string, string, string]; reflection: string; mood: Mood | ""; tags: string };

function EntryEditor({ date, entry }: { date: LocalDate; entry?: JournalEntry }) {
  const fromEntry = (): EntryForm => ({
    gratitude: entry ? [...entry.gratitude] : ["", "", ""],
    reflection: entry?.reflection ?? "",
    mood: entry?.mood ?? "",
    tags: (entry?.tags ?? []).join(", "),
  });
  const [f, setF] = useState<EntryForm>(fromEntry);
  const [errors, setErrors] = useState<Errors>({});
  const [status, setStatus] = useState("");
  const [dirty, setDirty] = useState(false);
  const draftKey = `journal:${date}`;
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    loadDraft<EntryForm>(draftKey).then((d) => {
      if (d) {
        setF(d);
        setDirty(true);
        setStatus("Restored your unsaved draft.");
      }
    });
  }, [draftKey]);

  const change = (next: EntryForm) => {
    setF(next);
    setDirty(true);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => saveDraft(draftKey, next).then(() => setStatus("Draft kept on this device")), 600);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs = validateJournal(f);
    setErrors(errs);
    if (hasErrors(errs)) return;
    clearTimeout(timer.current);
    await saveJournal({
      localDate: date,
      gratitude: f.gratitude.map((g) => g.trim()) as [string, string, string],
      reflection: f.reflection.trim() || undefined,
      mood: f.mood || undefined,
      tags: parseTags(f.tags),
    });
    await clearDraft(draftKey);
    setDirty(false);
    setStatus("Saved. Thank you for noticing.");
  };

  return (
    <Card as="div">
      <form onSubmit={submit} noValidate className="flex flex-col gap-4">
        <fieldset aria-describedby={errors.gratitude ? "grat-err" : undefined}>
          <legend className="mb-2 font-display text-2xl">Three graces today</legend>
          <div className="flex flex-col gap-2">
            {f.gratitude.map((g, i) => (
              <div key={i} className="flex items-center gap-3">
                <span aria-hidden="true" className="font-display text-xl text-gold-ink">
                  {i + 1}
                </span>
                <label htmlFor={`grace-${i}`} className="sr-only">
                  Grace {i + 1}
                </label>
                <input
                  id={`grace-${i}`}
                  value={g}
                  maxLength={300}
                  onChange={(e) => {
                    const gratitude = [...f.gratitude] as EntryForm["gratitude"];
                    gratitude[i] = e.target.value;
                    change({ ...f, gratitude });
                  }}
                  placeholder={["Something small that made you smile", "Someone you're thankful for", "A moment of quiet or beauty"][i]}
                  className="w-full rounded-2xl border border-line bg-surface px-4 py-2.5 focus:border-ink focus:outline-none"
                />
              </div>
            ))}
          </div>
          {errors.gratitude && (
            <p id="grat-err" role="alert" className="mt-1 text-sm text-warning">
              {errors.gratitude}
            </p>
          )}
        </fieldset>
        <Field label="Reflection (optional)" error={errors.reflection}>
          {(p) => <textarea {...p} rows={4} value={f.reflection} onChange={(e) => change({ ...f, reflection: e.target.value })} placeholder="What stayed with you today?" />}
        </Field>
        <fieldset>
          <legend className="mb-1.5 text-sm font-medium">How was your heart today? (optional)</legend>
          <div className="flex flex-wrap gap-1.5">
            {(Object.keys(MOODS) as Mood[]).map((m) => (
              <Chip key={m} pressed={f.mood === m} onClick={() => change({ ...f, mood: f.mood === m ? "" : m })}>
                {MOODS[m]}
              </Chip>
            ))}
          </div>
        </fieldset>
        <Field label="Tags (optional)" hint="Separate with commas">
          {(p) => <input {...p} value={f.tags} onChange={(e) => change({ ...f, tags: e.target.value })} />}
        </Field>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p role="status" aria-live="polite" className="text-sm text-success">
            {status}
          </p>
          <div className="flex gap-2">
            {entry && <DeleteEntry id={entry.id} />}
            <Button type="submit" disabled={!dirty}>
              Save
            </Button>
          </div>
        </div>
        {entry?.isSample && <p className="text-sm text-muted">This is a sample entry. You can remove all samples in You → Data.</p>}
      </form>
    </Card>
  );
}

function DeleteEntry({ id }: { id: string }) {
  const [confirm, setConfirm] = useState(false);
  return confirm ? (
    <Button variant="danger" onClick={() => remove("journal", id)}>
      Confirm delete
    </Button>
  ) : (
    <Button variant="ghost" onClick={() => setConfirm(true)}>
      Delete entry
    </Button>
  );
}

function IntentionsPanel({ items }: { items: Intention[] }) {
  const [filter, setFilter] = useState<"open" | "answered" | "archived">("open");
  const shown = items
    .filter((i) => (filter === "archived" ? i.archivedAt : filter === "answered" ? i.answeredAt && !i.archivedAt : !i.answeredAt && !i.archivedAt))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return (
    <div className="flex flex-col gap-4">
      <Card aria-labelledby="new-int">
        <CardTitle id="new-int">Prayer intentions</CardTitle>
        <IntentionForm />
      </Card>
      <div className="flex items-center justify-between gap-2">
        <div className="flex gap-1.5" role="group" aria-label="Show intentions">
          <Chip pressed={filter === "open"} onClick={() => setFilter("open")}>
            Holding
          </Chip>
          <Chip pressed={filter === "answered"} onClick={() => setFilter("answered")}>
            Answered
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
    </div>
  );
}

function IntentionItem({ item }: { item: Intention }) {
  const [mode, setMode] = useState<"view" | "edit" | "answer" | "delete">("view");
  const [text, setText] = useState(item.text);
  const [note, setNote] = useState(item.answeredNote ?? "");
  const [error, setError] = useState<string>();

  const saveEdit = async () => {
    const errs = validateIntention(text);
    setError(errs.text);
    if (hasErrors(errs)) return;
    await saveIntention({ ...item, text });
    setMode("view");
  };

  return (
    <li className="rounded-2xl border border-line bg-surface p-4">
      {mode === "edit" ? (
        <div className="flex flex-col gap-2">
          <Field label="Intention" error={error}>
            {(p) => <input {...p} value={text} onChange={(e) => setText(e.target.value)} />}
          </Field>
          <div className="flex gap-2">
            <Button onClick={saveEdit}>Save</Button>
            <Button variant="ghost" onClick={() => setMode("view")}>
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <>
          <p className="break-words">
            {item.isPrivate && <Lock size={14} className="mr-1.5 inline text-muted" aria-label="Private" />}
            {item.text}
            {item.isSample && <span className="ml-2 rounded-full bg-celadon px-2 py-0.5 text-xs">Sample</span>}
          </p>
          {item.answeredAt && (
            <p className="mt-1 text-sm text-success">
              You marked this answered{item.answeredNote ? `: ${item.answeredNote}` : "."}
            </p>
          )}
        </>
      )}
      {mode === "answer" && (
        <div className="mt-3 flex flex-col gap-2">
          <Field label="A note for yourself (optional)">{(p) => <input {...p} value={note} onChange={(e) => setNote(e.target.value)} />}</Field>
          <div className="flex gap-2">
            <Button onClick={() => saveIntention({ ...item, answeredAt: nowIso(), answeredNote: note.trim() || undefined }).then(() => setMode("view"))}>Mark answered</Button>
            <Button variant="ghost" onClick={() => setMode("view")}>
              Cancel
            </Button>
          </div>
        </div>
      )}
      {mode === "view" && (
        <div className="mt-2 flex flex-wrap gap-1">
          <Button variant="ghost" className="px-3 text-sm" onClick={() => setMode("edit")}>
            Edit
          </Button>
          {item.answeredAt ? (
            <Button variant="ghost" className="px-3 text-sm" onClick={() => saveIntention({ ...item, answeredAt: undefined, answeredNote: undefined })}>
              Move back to holding
            </Button>
          ) : (
            <Button variant="ghost" className="px-3 text-sm" onClick={() => setMode("answer")}>
              Mark answered
            </Button>
          )}
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

function MonthlyLight({ entries, date, onOpen }: { entries: JournalEntry[]; date: LocalDate; onOpen: (d: LocalDate) => void }) {
  const { today, settings } = useApp();
  const [month, setMonth] = useState(date);
  const byDate = new Map(entries.map((e) => [e.localDate, e]));
  const count = entries.filter((e) => e.localDate.slice(0, 7) === month.slice(0, 7)).length;
  return (
    <Card aria-labelledby="month-light">
      <div className="mb-3 flex items-center justify-between">
        <IconButton label="Previous month" onClick={() => setMonth(addDays(month.slice(0, 8) + "01", -1))}>
          <ChevronLeft size={20} aria-hidden="true" />
        </IconButton>
        <h2 id="month-light" className="text-2xl">
          {formatMonth(month)}
        </h2>
        <IconButton label="Next month" onClick={() => setMonth(addDays(month.slice(0, 8) + "28", 5))}>
          <ChevronRight size={20} aria-hidden="true" />
        </IconButton>
      </div>
      <p className="mb-3 text-sm text-muted">
        {count} day{count === 1 ? "" : "s"} of light written this month. Choose a day to open it.
      </p>
      <CalendarGrid
        label={`Journal days in ${formatMonth(month)}`}
        month={month}
        selected={month}
        today={today}
        weekStartsOn={settings.weekStartsOn}
        onSelect={(d) => (d.slice(0, 7) === month.slice(0, 7) ? onOpen(d) : setMonth(d))}
        renderDay={(d) =>
          byDate.has(d) ? (
            <span className="mt-0.5 inline-block h-2.5 w-2.5 rounded-full bg-gold">
              <span className="sr-only">has an entry</span>
            </span>
          ) : null
        }
      />
    </Card>
  );
}

function SearchPanel({ entries, intentions, onOpen }: { entries: JournalEntry[]; intentions: Intention[]; onOpen: (d: LocalDate) => void }) {
  const [q, setQ] = useState("");
  const term = q.trim().toLowerCase();
  const hit = (s?: string) => !!s && s.toLowerCase().includes(term);
  const entryHits = term ? entries.filter((e) => e.gratitude.some(hit) || hit(e.reflection) || (e.tags ?? []).some(hit)).sort((a, b) => b.localDate.localeCompare(a.localDate)) : [];
  const intentionHits = term ? intentions.filter((i) => hit(i.text) || hit(i.answeredNote)) : [];
  return (
    <div className="flex flex-col gap-4">
      <div className="relative">
        <Search size={18} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted" aria-hidden="true" />
        <label htmlFor="journal-search" className="sr-only">
          Search your journal and intentions
        </label>
        <input
          id="journal-search"
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search graces, reflections, tags, intentions…"
          className="w-full rounded-full border border-line bg-surface py-3 pl-11 pr-4 focus:border-ink focus:outline-none"
        />
      </div>
      <p role="status" className="text-sm text-muted">
        {term ? `${entryHits.length + intentionHits.length} result${entryHits.length + intentionHits.length === 1 ? "" : "s"}` : "Searching happens only on this device."}
      </p>
      {entryHits.length > 0 && (
        <ul className="flex flex-col gap-2">
          {entryHits.map((e) => (
            <li key={e.id}>
              <button type="button" onClick={() => onOpen(e.localDate)} className="w-full rounded-2xl border border-line bg-surface p-4 text-left hover:bg-tint">
                <span className="block text-sm text-muted">{formatLong(e.localDate)}</span>
                <span className="block">{[...e.gratitude, e.reflection].filter(hit).join(" · ")}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
      {intentionHits.length > 0 && (
        <ul className="flex flex-col gap-2">
          {intentionHits.map((i) => (
            <li key={i.id} className="rounded-2xl border border-line bg-surface p-4">
              <span className="block text-sm text-muted">Intention</span>
              {i.text}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
