import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router";
import { ArrowLeft, BookOpen, Expand, PenLine, Shrink, Trash2, X } from "lucide-react";
import type { JournalEntry, SaveStatus } from "../../data/types";
import { useApp, useStore } from "../../lib/hooks";
import { Button, ErrorNote, IconButton, Loading } from "../../components/ui";
import { formatLong, isDateKey } from "../../lib/date";
import { parseTags } from "../../lib/validation";
import { remove, saveJournalEntry } from "../../lib/storage/repos";
import { downloadText } from "../../lib/storage/backup";
import { newId, nowIso } from "../../lib/storage/db";
import { clearWal, writeWal } from "../../lib/storage/journalWal";

export const WRITING_PROMPTS = ["Where did you notice grace today?", "What would you like to bring to prayer?", "What is weighing on your heart?"];
const AUTOSAVE_MS = 600;

interface Draft {
  id: string;
  localDate: string;
  title: string;
  body: string;
  tags: string;
  createdAt?: string;
  isSample?: boolean;
}

/**
 * Route: /app/journal/:entryId — "new" (optionally ?date=…) starts a reflection;
 * after the first autosave the URL is replaced with the real id, keeping the same editor mounted.
 */
export function EntryEditorPage() {
  const { entryId } = useParams();
  const [newEntryId] = useState(newId);
  const journal = useStore("journal");
  if (journal.status === "error") return <ErrorNote message={journal.error} />;
  if (journal.status === "loading") return <Loading label="Opening your journal…" />;
  const entry = journal.data.find((e) => e.id === entryId);
  if (entryId === "new" || entryId === newEntryId) return <Editor key={newEntryId} id={newEntryId} entry={entry} />;
  if (!entry)
    return (
      <div className="flex flex-col items-start gap-3">
        <h1 className="text-3xl">We couldn't find this reflection</h1>
        <p className="text-muted">It may have been deleted, or it was written in another browser. Entries live only on the device where they were written.</p>
        <Link to="/app/journal" className="inline-flex min-h-11 items-center rounded-full bg-ink px-5 text-white">
          Back to Journal
        </Link>
      </div>
    );
  return <Editor key={entry.id} id={entry.id} entry={entry} />;
}

function Editor({ id, entry }: { id: string; entry?: JournalEntry }) {
  const { today } = useApp();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const dateParam = params.get("date");
  const [draft, setDraft] = useState<Draft>(() =>
    entry
      ? { id: entry.id, localDate: entry.localDate, title: entry.title ?? "", body: entry.body, tags: entry.tags.join(", "), createdAt: entry.createdAt, isSample: entry.isSample }
      : { id, localDate: dateParam && isDateKey(dateParam) ? dateParam : today, title: "", body: "", tags: "" },
  );
  const [status, setStatus] = useState<SaveStatus>(entry ? "saved" : "idle");
  const [lastSavedAt, setLastSavedAt] = useState<string | undefined>(entry?.updatedAt);
  const [mode, setMode] = useState<"write" | "read">(params.get("mode") === "read" ? "read" : "write");
  const [focus, setFocus] = useState(false);
  const [prompt, setPrompt] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const bodyRef = useRef<HTMLTextAreaElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const pending = useRef<Draft | null>(null);
  const saved = useRef(!!entry);

  const persist = useCallback(
    async (d: Draft) => {
      pending.current = null;
      if (!saved.current && !d.body.trim() && !d.title.trim()) return; // don't create empty entries
      setStatus("saving");
      try {
        const e = await saveJournalEntry({ id: d.id, localDate: d.localDate, title: d.title.trim() || undefined, body: d.body, tags: parseTags(d.tags), createdAt: d.createdAt, isSample: d.isSample });
        if (!saved.current) {
          saved.current = true;
          setDraft((cur) => ({ ...cur, createdAt: e.createdAt }));
          // Give the new entry its own URL so a refresh reopens it.
          navigate(`/app/journal/${d.id}`, { replace: true });
        }
        setLastSavedAt(e.updatedAt);
        if (!pending.current) {
          clearWal(d.id); // IndexedDB now has the latest words
          setStatus("saved");
        }
      } catch {
        setStatus("error");
      }
    },
    [navigate],
  );

  const flush = useCallback(() => {
    clearTimeout(timer.current);
    if (pending.current) void persist(pending.current);
  }, [persist]);

  const change = (patch: Partial<Draft>) => {
    const next = { ...draft, ...patch };
    setDraft(next);
    pending.current = next;
    if (saved.current || next.body.trim() || next.title.trim()) {
      writeWal({ id: next.id, localDate: next.localDate, title: next.title.trim() || undefined, body: next.body, tags: parseTags(next.tags), createdAt: next.createdAt, isSample: next.isSample, at: nowIso() });
    }
    setStatus("saving");
    clearTimeout(timer.current);
    timer.current = setTimeout(() => pending.current && void persist(pending.current), AUTOSAVE_MS);
  };

  // Save immediately when the tab is hidden or the page is closing, and on leaving the editor.
  useEffect(() => {
    const onHide = () => document.visibilityState === "hidden" && flush();
    document.addEventListener("visibilitychange", onHide);
    window.addEventListener("pagehide", flush);
    return () => {
      document.removeEventListener("visibilitychange", onHide);
      window.removeEventListener("pagehide", flush);
      flush();
    };
  }, [flush]);

  // Grow the textarea with its content so long reflections read as a page, not a box.
  useLayoutEffect(() => {
    const el = bodyRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [draft.body, mode, focus]);

  useEffect(() => {
    if (!focus) return;
    bodyRef.current?.focus(); // keep the caret in the text when entering focus mode
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setFocus(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [focus]);

  const words = draft.body.trim() ? draft.body.trim().split(/\s+/).length : 0;
  const statusText =
    status === "saving"
      ? "Saving…"
      : status === "saved"
        ? `Saved locally${lastSavedAt ? ` · ${new Date(lastSavedAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}` : ""}`
        : status === "error"
          ? "Couldn't save. Your words are still here — download a copy to be safe."
          : "Start writing — it saves on this device as you go.";

  const statusBar = (
    <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
      <p role="status" aria-live="polite" className={status === "error" ? "text-warning" : "text-muted"}>
        {statusText}
      </p>
      <div className="flex items-center gap-1">
        {status === "error" && (
          <Button variant="secondary" className="px-3" onClick={() => downloadText(`reflection-${draft.localDate}.txt`, `${draft.title}\n\n${draft.body}`, "text/plain")}>
            Download copy
          </Button>
        )}
        <span className="px-2 text-muted">{words} words</span>
      </div>
    </div>
  );

  const editor = (
    <div className="flex flex-col gap-4">
      <label htmlFor="entry-title" className="sr-only">
        Title (optional)
      </label>
      <input
        id="entry-title"
        value={draft.title}
        onChange={(e) => change({ title: e.target.value })}
        placeholder="Title (optional)"
        className="w-full border-0 border-b border-line bg-transparent pb-2 font-display text-3xl text-ink placeholder:text-muted/70 focus:border-ink focus:outline-none sm:text-4xl"
      />
      {prompt && (
        <p className="flex items-start justify-between gap-2 rounded-2xl bg-tint px-4 py-3 text-ink">
          <span>
            <span className="sr-only">Writing prompt: </span>
            {prompt}
          </span>
          <IconButton label="Dismiss prompt" className="-my-2 -mr-2" onClick={() => setPrompt(null)}>
            <X size={18} aria-hidden="true" />
          </IconButton>
        </p>
      )}
      <label htmlFor="entry-body" className="sr-only">
        Reflection
      </label>
      <textarea
        id="entry-body"
        ref={bodyRef}
        value={draft.body}
        onChange={(e) => change({ body: e.target.value })}
        onBlur={flush}
        placeholder={prompt ?? "Stay a while. Write as much as you need."}
        spellCheck
        autoCapitalize="sentences"
        className="min-h-[24rem] w-full resize-none overflow-hidden border-0 bg-transparent p-0 text-[1.125rem] leading-[1.75] text-ink placeholder:text-muted/80 focus:outline-none focus-visible:outline-none"
      />
    </div>
  );

  if (focus)
    return (
      <div role="dialog" aria-modal="true" aria-label="Focus writing mode" className="fixed inset-0 z-50 overflow-y-auto bg-bg">
        <div className="mx-auto flex min-h-full max-w-[720px] flex-col gap-4 px-5 pb-24 pt-4">
          <div className="sticky top-0 z-10 -mx-5 flex items-center justify-between gap-2 bg-bg/95 px-5 py-2 backdrop-blur">
            <span className="text-sm text-muted">{formatLong(draft.localDate)}</span>
            <Button variant="secondary" className="px-4" onClick={() => setFocus(false)}>
              <Shrink size={17} aria-hidden="true" /> Exit focus
            </Button>
          </div>
          {editor}
          {statusBar}
        </div>
      </div>
    );

  return (
    <div className="mx-auto flex max-w-[760px] flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Link to="/app/journal" className="inline-flex min-h-11 items-center gap-1 text-sm text-gold-ink" onClick={flush}>
          <ArrowLeft size={16} aria-hidden="true" /> Journal
        </Link>
        <div role="group" aria-label="Mode" className="inline-flex rounded-full border border-line bg-surface p-1">
          <button type="button" aria-pressed={mode === "write"} onClick={() => setMode("write")} className={`inline-flex min-h-10 items-center gap-1.5 rounded-full px-4 text-sm ${mode === "write" ? "bg-ink text-white" : ""}`}>
            <PenLine size={15} aria-hidden="true" /> Write
          </button>
          <button
            type="button"
            aria-pressed={mode === "read"}
            onClick={() => {
              flush();
              setMode("read");
            }}
            className={`inline-flex min-h-10 items-center gap-1.5 rounded-full px-4 text-sm ${mode === "read" ? "bg-ink text-white" : ""}`}
          >
            <BookOpen size={15} aria-hidden="true" /> Read
          </button>
        </div>
      </div>

      {mode === "read" ? (
        <article className="rounded-[24px] border border-line bg-surface px-6 py-8 sm:px-12 sm:py-12">
          <p className="mb-2 text-sm uppercase tracking-[0.14em] text-gold-ink">{formatLong(draft.localDate)}</p>
          {draft.title && <h1 className="mb-6 text-4xl">{draft.title}</h1>}
          {draft.body.trim() ? (
            draft.body.split(/\n{2,}/).map((para, i) => (
              <p key={i} className="mb-5 whitespace-pre-wrap font-display text-[1.35rem] leading-[1.7] text-ink">
                {para}
              </p>
            ))
          ) : (
            <p className="text-muted">Nothing written yet.</p>
          )}
          {parseTags(draft.tags).length > 0 && <p className="mt-6 text-sm text-muted">#{parseTags(draft.tags).join(" #")}</p>}
        </article>
      ) : (
        <>
          <div className="flex flex-wrap items-end gap-3">
            <div className="flex flex-col gap-1">
              <label htmlFor="entry-date" className="text-sm font-medium">
                Date
              </label>
              <input id="entry-date" type="date" value={draft.localDate} onChange={(e) => isDateKey(e.target.value) && change({ localDate: e.target.value })} className="min-h-11 rounded-2xl border border-line bg-surface px-3" />
            </div>
            <div className="flex min-w-48 flex-1 flex-col gap-1">
              <label htmlFor="entry-tags" className="text-sm font-medium">
                Tags <span className="font-normal text-muted">(comma separated)</span>
              </label>
              <input id="entry-tags" value={draft.tags} onChange={(e) => change({ tags: e.target.value })} className="min-h-11 rounded-2xl border border-line bg-surface px-3" />
            </div>
            <Button variant="secondary" onClick={() => setFocus(true)}>
              <Expand size={17} aria-hidden="true" /> Focus mode
            </Button>
          </div>
          <div role="group" aria-label="Gentle writing prompts (optional)" className="flex flex-wrap gap-1.5">
            {WRITING_PROMPTS.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => {
                  setPrompt(p);
                  bodyRef.current?.focus();
                }}
                className="min-h-11 rounded-full border border-line bg-surface px-4 text-left text-sm text-muted hover:bg-tint"
              >
                {p}
              </button>
            ))}
          </div>
          <div className="rounded-[24px] border border-line bg-surface px-5 py-6 sm:px-10 sm:py-8">{editor}</div>
        </>
      )}

      {statusBar}

      {saved.current && (
        <div className="border-t border-line pt-3">
          {confirmDelete ? (
            <span className="inline-flex flex-wrap items-center gap-2 text-sm">
              Delete this reflection permanently?
              <Button
                variant="danger"
                onClick={() => {
                  clearTimeout(timer.current);
                  pending.current = null;
                  void remove("journal", draft.id).then(() => navigate("/app/journal", { replace: true }));
                }}
              >
                Delete
              </Button>
              <Button variant="ghost" onClick={() => setConfirmDelete(false)}>
                Keep it
              </Button>
            </span>
          ) : (
            <Button variant="ghost" className="text-sm text-muted" onClick={() => setConfirmDelete(true)}>
              <Trash2 size={16} aria-hidden="true" /> Delete reflection
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
