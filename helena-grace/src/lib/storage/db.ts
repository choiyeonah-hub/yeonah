import { openDB, type DBSchema, type IDBPDatabase, type IDBPTransaction } from "idb";
import type {
  DayNote,
  GratitudeEntry,
  Intention,
  JournalEntry,
  PlannerEvent,
  RosarySession,
  Routine,
  RoutineCompletion,
  Settings,
  WeekReview,
} from "../../data/types";

/**
 * All user data lives only in this browser's IndexedDB. Nothing is sent to a server.
 * Bump DB_VERSION and extend `upgrade` when adding stores.
 */
export const DB_NAME = "helena-grace";
const DB_VERSION = 2;

export interface Draft {
  id: string;
  value: unknown;
  updatedAt: string;
}

interface HelenaDB extends DBSchema {
  routines: { key: string; value: Routine };
  completions: { key: string; value: RoutineCompletion; indexes: { byDate: string } };
  events: { key: string; value: PlannerEvent };
  intentions: { key: string; value: Intention };
  rosary: { key: string; value: RosarySession };
  journal: { key: string; value: JournalEntry };
  gratitude: { key: string; value: GratitudeEntry };
  dayNotes: { key: string; value: DayNote };
  weekReviews: { key: string; value: WeekReview };
  settings: { key: string; value: Settings };
  drafts: { key: string; value: Draft };
}

export type StoreName =
  | "routines"
  | "completions"
  | "events"
  | "intentions"
  | "rosary"
  | "journal"
  | "gratitude"
  | "dayNotes"
  | "weekReviews"
  | "settings"
  | "drafts";
export type StoreValue<S extends StoreName> = HelenaDB[S]["value"];

/** Stores that hold user records (exported, imported, sample-tagged). */
export const DATA_STORES = [
  "routines",
  "completions",
  "events",
  "intentions",
  "rosary",
  "journal",
  "gratitude",
  "dayNotes",
  "weekReviews",
] as const satisfies readonly StoreName[];
export type DataStore = (typeof DATA_STORES)[number];

let dbPromise: Promise<IDBPDatabase<HelenaDB>> | null = null;

export function getDB(): Promise<IDBPDatabase<HelenaDB>> {
  if (!dbPromise) {
    dbPromise = openDB<HelenaDB>(DB_NAME, DB_VERSION, {
      async upgrade(db, oldVersion, _newVersion, tx) {
        if (oldVersion < 1) {
          db.createObjectStore("routines", { keyPath: "id" });
          db.createObjectStore("completions", { keyPath: "id" }).createIndex("byDate", "localDate");
          db.createObjectStore("events", { keyPath: "id" });
          db.createObjectStore("intentions", { keyPath: "id" });
          db.createObjectStore("rosary", { keyPath: "id" });
          db.createObjectStore("journal", { keyPath: "id" });
          db.createObjectStore("dayNotes", { keyPath: "id" });
          db.createObjectStore("weekReviews", { keyPath: "id" });
          db.createObjectStore("settings"); // single out-of-line key "prefs"
          db.createObjectStore("drafts", { keyPath: "id" });
        }
        if (oldVersion < 2) {
          db.createObjectStore("gratitude", { keyPath: "id" });
          if (oldVersion === 1) await migrateV1(tx as unknown as IDBPTransaction<HelenaDB, StoreName[], "versionchange">);
        }
      },
    });
  }
  return dbPromise;
}

/**
 * v1 → v2: one journal page per day (3 gratitude lines + reflection) becomes
 * a long-form JournalEntry plus separate GratitudeEntry records; intention
 * "answered" fields are renamed; the removed "gratitude" event category maps to "reflection".
 */
async function migrateV1(tx: IDBPTransaction<HelenaDB, StoreName[], "versionchange">): Promise<void> {
  type V1Journal = { id: string; localDate: string; gratitude?: string[]; reflection?: string; tags?: string[]; updatedAt: string; isSample?: boolean };
  const journal = tx.objectStore("journal");
  for (const old of (await journal.getAll()) as unknown as V1Journal[]) {
    await journal.delete(old.id);
    for (const [i, text] of (old.gratitude ?? []).entries()) {
      if (!text?.trim()) continue;
      await tx.objectStore("gratitude").put({ id: `${old.id}-g${i}`, localDate: old.localDate, text, createdAt: old.updatedAt, updatedAt: old.updatedAt, isSample: old.isSample });
    }
    if (old.reflection?.trim()) {
      await journal.put({ id: old.id, localDate: old.localDate, body: old.reflection, tags: old.tags ?? [], createdAt: old.updatedAt, updatedAt: old.updatedAt, isSample: old.isSample });
    }
  }
  const intentions = tx.objectStore("intentions");
  for (const i of (await intentions.getAll()) as (Intention & { answeredAt?: string; answeredNote?: string })[]) {
    const { answeredAt, answeredNote, ...rest } = i;
    if (answeredAt || answeredNote) await intentions.put({ ...rest, resolvedAt: answeredAt, note: rest.note ?? answeredNote });
  }
  const events = tx.objectStore("events");
  for (const e of await events.getAll()) {
    if ((e.category as string) === "gratitude") await events.put({ ...e, category: "reflection" });
  }
}

/** Test helper: forget the cached connection so a fresh fake DB can be opened. */
export async function closeDB(): Promise<void> {
  if (dbPromise) (await dbPromise).close();
  dbPromise = null;
}

// --- change notifications so views re-read after writes ---
type Listener = () => void;
const listeners = new Set<Listener>();

export function subscribe(fn: Listener): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function notifyChange(): void {
  listeners.forEach((fn) => fn());
}

export async function getAll<S extends StoreName>(store: S): Promise<StoreValue<S>[]> {
  return (await getDB()).getAll(store);
}

export async function getOne<S extends StoreName>(store: S, id: string): Promise<StoreValue<S> | undefined> {
  return (await getDB()).get(store, id);
}

export async function put<S extends StoreName>(store: S, value: StoreValue<S>): Promise<void> {
  await (await getDB()).put(store, value);
  notifyChange();
}

export async function remove(store: StoreName, id: string): Promise<void> {
  await (await getDB()).delete(store, id);
  notifyChange();
}

export function newId(): string {
  return crypto.randomUUID();
}

export function nowIso(): string {
  return new Date().toISOString();
}
