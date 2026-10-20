import type { LocalDate, WeekStart } from "../data/types";

/**
 * Calendar-day helpers keyed by "yyyy-mm-dd" in the user's timezone.
 * Never derive a day from `toISOString().slice(0, 10)` — that is the UTC day,
 * which is "tomorrow" for a US evening.
 */

const keyFormatters = new Map<string, Intl.DateTimeFormat>();

export function systemTimezone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
}

export function isValidTimezone(tz: string): boolean {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

export function toLocalDateKey(instant: Date, timeZone: string): LocalDate {
  let fmt = keyFormatters.get(timeZone);
  if (!fmt) {
    fmt = new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" });
    keyFormatters.set(timeZone, fmt);
  }
  const parts = Object.fromEntries(fmt.formatToParts(instant).map((p) => [p.type, p.value]));
  return `${parts.year}-${parts.month}-${parts.day}`;
}

export function todayKey(timeZone: string, now: Date = new Date()): LocalDate {
  return toLocalDateKey(now, timeZone);
}

/** Hour (0–23) of the wall clock in the given timezone. */
export function localHour(timeZone: string, now: Date = new Date()): number {
  const h = new Intl.DateTimeFormat("en-US", { timeZone, hour: "numeric", hourCycle: "h23" }).format(now);
  return Number(h);
}

export function isDateKey(s: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const [y, m, d] = s.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
}

// Keys are pure calendar values, so arithmetic runs in UTC where no DST exists.
function keyToUtc(key: LocalDate): Date {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

function utcToKey(dt: Date): LocalDate {
  return dt.toISOString().slice(0, 10); // safe: dt is a UTC calendar date, not a real instant
}

export function addDays(key: LocalDate, n: number): LocalDate {
  const dt = keyToUtc(key);
  dt.setUTCDate(dt.getUTCDate() + n);
  return utcToKey(dt);
}

export function addMonths(key: LocalDate, n: number): LocalDate {
  const [y, m] = key.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1 + n, 1));
  return utcToKey(dt);
}

/** 0 = Sunday … 6 = Saturday */
export function weekday(key: LocalDate): number {
  return keyToUtc(key).getUTCDay();
}

export function startOfWeek(key: LocalDate, weekStartsOn: WeekStart): LocalDate {
  const diff = (weekday(key) - weekStartsOn + 7) % 7;
  return addDays(key, -diff);
}

export function weekDays(key: LocalDate, weekStartsOn: WeekStart): LocalDate[] {
  const start = startOfWeek(key, weekStartsOn);
  return Array.from({ length: 7 }, (_, i) => addDays(start, i));
}

export function startOfMonth(key: LocalDate): LocalDate {
  return key.slice(0, 8) + "01";
}

/** 6×7 grid of days covering the month containing `key`. */
export function monthGrid(key: LocalDate, weekStartsOn: WeekStart): LocalDate[] {
  const first = startOfWeek(startOfMonth(key), weekStartsOn);
  return Array.from({ length: 42 }, (_, i) => addDays(first, i));
}

export function sameMonth(a: LocalDate, b: LocalDate): boolean {
  return a.slice(0, 7) === b.slice(0, 7);
}

export function compareKeys(a: LocalDate, b: LocalDate): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

const WEEKDAY_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const WEEKDAY_LONG = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

export function weekdayShort(i: number): string {
  return WEEKDAY_SHORT[i];
}

export function formatLong(key: LocalDate): string {
  const [y, m, d] = key.split("-").map(Number);
  return `${WEEKDAY_LONG[weekday(key)]}, ${MONTHS[m - 1]} ${d}, ${y}`;
}

export function formatShort(key: LocalDate): string {
  const [, m, d] = key.split("-").map(Number);
  return `${MONTHS[m - 1].slice(0, 3)} ${d}`;
}

export function formatMonth(key: LocalDate): string {
  const [y, m] = key.split("-").map(Number);
  return `${MONTHS[m - 1]} ${y}`;
}

export function formatTime(hhmm: string): string {
  const [h, m] = hhmm.split(":").map(Number);
  const suffix = h < 12 ? "AM" : "PM";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(m).padStart(2, "0")} ${suffix}`;
}

export function greeting(hour: number): string {
  if (hour < 5) return "Peace be with you tonight";
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}
