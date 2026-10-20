import type { GratitudeEntry, Intention, JournalEntry } from "../../data/types";
import { DATA_STORES, type DataStore, getDB, notifyChange } from "./db";
import { discardWal } from "./journalWal";

export const BACKUP_APP = "helena-grace";
export const BACKUP_VERSION = 2;

export interface Backup {
  app: typeof BACKUP_APP;
  version: number;
  exportedAt: string;
  data: Record<DataStore, unknown[]>;
}

export async function exportAll(): Promise<Backup> {
  const db = await getDB();
  const data = {} as Record<DataStore, unknown[]>;
  for (const s of DATA_STORES) data[s] = await db.getAll(s);
  return { app: BACKUP_APP, version: BACKUP_VERSION, exportedAt: new Date().toISOString(), data };
}

/** Throws a user-readable Error when the file is not a Helena Grace backup. */
export function parseBackup(text: string): Backup {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new Error("This file isn't valid JSON.");
  }
  const b = raw as Partial<Backup>;
  if (!b || typeof b !== "object" || b.app !== BACKUP_APP) throw new Error("This doesn't look like a Helena Grace backup.");
  if (b.version !== BACKUP_VERSION) throw new Error(`Unsupported backup version (${String(b.version)}).`);
  if (!b.data || typeof b.data !== "object") throw new Error("The backup has no data section.");
  for (const s of DATA_STORES) {
    const rows = (b.data as Record<string, unknown>)[s] ?? [];
    if (!Array.isArray(rows)) throw new Error(`"${s}" should be a list.`);
    for (const r of rows) {
      if (!r || typeof r !== "object" || typeof (r as { id?: unknown }).id !== "string") {
        throw new Error(`A record in "${s}" is missing its id.`);
      }
    }
  }
  return b as Backup;
}

/** Replaces all records with the backup's content (settings are kept). */
export async function restoreBackup(b: Backup): Promise<number> {
  const db = await getDB();
  const tx = db.transaction([...DATA_STORES], "readwrite");
  let count = 0;
  for (const s of DATA_STORES) {
    const store = tx.objectStore(s);
    await store.clear();
    for (const r of b.data[s] ?? []) {
      await store.put(r as never);
      count++;
    }
  }
  await tx.done;
  notifyChange();
  return count;
}

export async function deleteAllData(): Promise<void> {
  const db = await getDB();
  const stores = [...DATA_STORES, "settings", "drafts"] as const;
  const tx = db.transaction([...stores], "readwrite");
  for (const s of stores) await tx.objectStore(s).clear();
  await tx.done;
  discardWal();
  notifyChange();
}

export async function removeSampleData(): Promise<number> {
  const db = await getDB();
  const tx = db.transaction([...DATA_STORES], "readwrite");
  let removed = 0;
  for (const s of DATA_STORES) {
    const store = tx.objectStore(s);
    for (const r of await store.getAll()) {
      if ((r as { isSample?: boolean }).isSample) {
        await store.delete(r.id);
        removed++;
      }
    }
  }
  await tx.done;
  notifyChange();
  return removed;
}

// ---------- CSV ----------
export function csvCell(v: unknown): string {
  const s = v == null ? "" : String(v);
  // Guard against spreadsheet formula injection, then quote.
  const safe = /^[=+\-@\t\r]/.test(s) ? `'${s}` : s;
  return `"${safe.replace(/"/g, '""')}"`;
}

export function toCsv(header: string[], rows: unknown[][]): string {
  return [header, ...rows].map((r) => r.map(csvCell).join(",")).join("\r\n");
}

/** Full text is kept: line breaks stay inside quoted cells (RFC 4180). */
export function journalCsv(entries: JournalEntry[]): string {
  const rows = [...entries]
    .sort((a, b) => a.localDate.localeCompare(b.localDate) || a.createdAt.localeCompare(b.createdAt))
    .map((e) => [e.localDate, e.title ?? "", e.body, e.tags.join("; "), e.createdAt, e.updatedAt]);
  return toCsv(["date", "title", "body", "tags", "created_at", "updated_at"], rows);
}

export function gratitudeCsv(items: GratitudeEntry[]): string {
  const rows = [...items].sort((a, b) => a.localDate.localeCompare(b.localDate)).map((g) => [g.localDate, g.text, g.createdAt]);
  return toCsv(["date", "gratitude", "created_at"], rows);
}

export function intentionsCsv(items: Intention[]): string {
  const rows = items.map((i) => [i.createdAt, i.text, i.note ?? "", i.isPrivate ? "yes" : "no", i.resolvedAt ?? "", i.archivedAt ?? ""]);
  return toCsv(["created_at", "intention", "note", "private", "answered_at", "archived_at"], rows);
}

export function downloadText(filename: string, text: string, mime: string): void {
  const url = URL.createObjectURL(new Blob([text], { type: mime }));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
