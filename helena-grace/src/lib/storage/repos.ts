import type {
  DayNote,
  GratitudeEntry,
  Intention,
  JournalEntry,
  LocalDate,
  Mystery,
  PlannerEvent,
  RosarySession,
  Routine,
  Settings,
  WeekReview,
} from "../../data/types";
import { compareKeys, systemTimezone, weekday } from "../date";
import { getAll, getDB, getOne, newId, notifyChange, nowIso, put, remove } from "./db";

// ---------- settings ----------
export function defaultSettings(): Settings {
  return { themeId: "luminous", reducedMotion: false, weekStartsOn: 0, timezone: systemTimezone(), onboarded: false, routinesEnabled: false };
}

export async function loadSettings(): Promise<Settings> {
  const saved = await (await getDB()).get("settings", "prefs");
  return { ...defaultSettings(), ...saved };
}

export async function saveSettings(patch: Partial<Settings>): Promise<Settings> {
  const next = { ...(await loadSettings()), ...patch };
  await (await getDB()).put("settings", next, "prefs");
  notifyChange();
  return next;
}

// ---------- routines ----------
export function isRoutineDue(r: Routine, date: LocalDate): boolean {
  if (r.archivedAt) return false;
  return r.recurrence === "daily" || r.daysOfWeek.includes(weekday(date));
}

export async function saveRoutine(r: Omit<Routine, "id" | "createdAt"> & Partial<Pick<Routine, "id" | "createdAt">>): Promise<Routine> {
  const value: Routine = { ...r, id: r.id ?? newId(), createdAt: r.createdAt ?? nowIso(), name: r.name.trim() };
  await put("routines", value);
  return value;
}

export async function deleteRoutine(id: string): Promise<void> {
  const db = await getDB();
  const tx = db.transaction(["routines", "completions"], "readwrite");
  await tx.objectStore("routines").delete(id);
  for (const c of await tx.objectStore("completions").getAll()) {
    if (c.routineId === id) await tx.objectStore("completions").delete(c.id);
  }
  await tx.done;
  notifyChange();
}

export async function toggleRoutine(routineId: string, date: LocalDate): Promise<boolean> {
  const id = `${routineId}:${date}`; // one completion per routine per day
  const existing = await getOne("completions", id);
  if (existing) {
    await remove("completions", id);
    return false;
  }
  await put("completions", { id, routineId, localDate: date, completedAt: nowIso() });
  return true;
}

// ---------- planner events ----------
export function eventDate(e: PlannerEvent): LocalDate {
  return e.startAt.slice(0, 10);
}

export function eventTime(e: PlannerEvent): string {
  return e.startAt.slice(11, 16);
}

export function occursOn(e: PlannerEvent, date: LocalDate): boolean {
  const start = eventDate(e);
  if (date === start) return true;
  if (compareKeys(date, start) < 0) return false;
  if (e.repeat === "daily") return true;
  if (e.repeat === "weekly") return weekday(date) === weekday(start);
  return false;
}

export function isEventDone(e: PlannerEvent, date: LocalDate): boolean {
  return e.repeat && e.repeat !== "none" ? (e.completedDates ?? []).includes(date) : e.completed;
}

export function eventsOn(events: PlannerEvent[], date: LocalDate): PlannerEvent[] {
  return events.filter((e) => occursOn(e, date)).sort((a, b) => eventTime(a).localeCompare(eventTime(b)));
}

export async function saveEvent(e: Omit<PlannerEvent, "id"> & { id?: string }): Promise<PlannerEvent> {
  const value: PlannerEvent = { ...e, id: e.id ?? newId(), title: e.title.trim() };
  await put("events", value);
  return value;
}

export async function toggleEventDone(e: PlannerEvent, date: LocalDate): Promise<void> {
  if (e.repeat && e.repeat !== "none") {
    const dates = new Set(e.completedDates ?? []);
    if (dates.has(date)) dates.delete(date);
    else dates.add(date);
    await put("events", { ...e, completedDates: [...dates] });
  } else {
    await put("events", { ...e, completed: !e.completed });
  }
}

// ---------- intentions ----------
export async function saveIntention(i: Omit<Intention, "id" | "createdAt"> & Partial<Pick<Intention, "id" | "createdAt">>): Promise<Intention> {
  const value: Intention = { ...i, id: i.id ?? newId(), createdAt: i.createdAt ?? nowIso(), text: i.text.trim() };
  await put("intentions", value);
  return value;
}

// ---------- rosary ----------
export function activeSession(sessions: RosarySession[]): RosarySession | undefined {
  return sessions.filter((s) => !s.completedAt).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0];
}

export async function startRosary(mystery: Mystery, localDate: LocalDate, intentionId?: string): Promise<RosarySession> {
  const now = nowIso();
  const s: RosarySession = { id: newId(), mystery, decadeIndex: 0, beadIndex: 0, intentionId, startedAt: now, updatedAt: now, localDate };
  await put("rosary", s);
  return s;
}

export async function updateRosary(s: RosarySession, patch: Partial<RosarySession>): Promise<RosarySession> {
  const next = { ...s, ...patch, updatedAt: nowIso() };
  await put("rosary", next);
  return next;
}

// ---------- journal / gratitude / notes ----------
/** Saves a reflection as-is: no trimming or length limit, so whitespace and line breaks survive. */
export async function saveJournalEntry(e: Omit<JournalEntry, "updatedAt" | "createdAt"> & { createdAt?: string }): Promise<JournalEntry> {
  const now = nowIso();
  const value: JournalEntry = { ...e, createdAt: e.createdAt ?? now, updatedAt: now };
  await put("journal", value);
  return value;
}

export function latestEntry(entries: JournalEntry[]): JournalEntry | undefined {
  return [...entries].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0];
}

export async function saveGratitude(g: Omit<GratitudeEntry, "id" | "createdAt" | "updatedAt"> & Partial<Pick<GratitudeEntry, "id" | "createdAt">>): Promise<GratitudeEntry> {
  const now = nowIso();
  const value: GratitudeEntry = { ...g, id: g.id ?? newId(), createdAt: g.createdAt ?? now, updatedAt: now };
  await put("gratitude", value);
  return value;
}

export async function saveDayNote(localDate: LocalDate, text: string): Promise<void> {
  if (!text.trim()) return remove("dayNotes", localDate);
  const value: DayNote = { id: localDate, localDate, text, updatedAt: nowIso() };
  await put("dayNotes", value);
}

export async function saveWeekReview(weekStart: LocalDate, text: string): Promise<void> {
  if (!text.trim()) return remove("weekReviews", weekStart);
  const value: WeekReview = { id: weekStart, weekStart, text, updatedAt: nowIso() };
  await put("weekReviews", value);
}

export { getAll, remove, put };
