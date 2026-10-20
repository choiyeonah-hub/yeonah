import { openDB, type DBSchema, type IDBPDatabase } from "idb";
import type {
  DayNote,
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
const DB_VERSION = 1;

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
  dayNotes: { key: string; value: DayNote };
  weekReviews: { key: string; value: WeekReview };
  settings: { key: string; value: Settings };
  drafts: { key: string; value: Draft };
}

export type StoreName = "routines" | "completions" | "events" | "intentions" | "rosary" | "journal" | "dayNotes" | "weekReviews" | "settings" | "drafts";
export type StoreValue<S extends StoreName> = HelenaDB[S]["value"];

/** Stores that hold user records (exported, imported, sample-tagged). */
export const DATA_STORES = [
  "routines",
  "completions",
  "events",
  "intentions",
  "rosary",
  "journal",
  "dayNotes",
  "weekReviews",
] as const satisfies readonly StoreName[];
export type DataStore = (typeof DATA_STORES)[number];

let dbPromise: Promise<IDBPDatabase<HelenaDB>> | null = null;

export function getDB(): Promise<IDBPDatabase<HelenaDB>> {
  if (!dbPromise) {
    dbPromise = openDB<HelenaDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
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
      },
    });
  }
  return dbPromise;
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
