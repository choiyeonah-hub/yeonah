import type { JournalEntry } from "../../data/types";
import { getOne } from "./db";
import { saveJournalEntry } from "./repos";

/**
 * Write-ahead copy of the reflection being typed.
 * IndexedDB writes are async and can be cut off when a tab is closed or reloaded,
 * so every keystroke is also written synchronously to localStorage (same device,
 * same privacy). On the next app start, anything newer than IndexedDB is restored.
 */
const KEY = "hg-journal-unsaved";

export type Wal = Pick<JournalEntry, "id" | "localDate" | "title" | "body" | "tags" | "isSample"> & { createdAt?: string; at: string };

function read(): Wal | undefined {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Wal) : undefined;
  } catch {
    return undefined;
  }
}

export function writeWal(w: Wal): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(w));
  } catch {
    /* storage full or blocked: the IndexedDB autosave still runs */
  }
}

export function clearWal(id: string): void {
  try {
    if (read()?.id === id) localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}

/** Used by "Delete all my data". */
export function discardWal(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}

/** Returns the id of a reflection that was restored, if any. */
export async function recoverJournalWal(): Promise<string | undefined> {
  const w = read();
  if (!w) return undefined;
  const existing = await getOne("journal", w.id);
  let restored: string | undefined;
  if (!existing || existing.updatedAt < w.at) {
    const { at: _at, ...entry } = w;
    await saveJournalEntry(entry);
    restored = w.id;
  }
  clearWal(w.id);
  return restored;
}
