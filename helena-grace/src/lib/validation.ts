import { isDateKey } from "./date";

export type Errors<K extends string = string> = Partial<Record<K, string>>;

export const LIMITS = {
  title: 120,
  intention: 500,
  note: 2000,
  tag: 30,
  tags: 8,
};

export function hasErrors(e: Errors): boolean {
  return Object.values(e).some(Boolean);
}

export function validateRoutine(v: { name: string; recurrence: string; daysOfWeek: number[] }): Errors<"name" | "daysOfWeek"> {
  const e: Errors<"name" | "daysOfWeek"> = {};
  const name = v.name.trim();
  if (!name) e.name = "Give this rhythm a short name.";
  else if (name.length > LIMITS.title) e.name = `Please keep it under ${LIMITS.title} characters.`;
  if (v.recurrence === "weekly" && v.daysOfWeek.length === 0) e.daysOfWeek = "Choose at least one day.";
  return e;
}

export function validateEvent(v: { title: string; date: string; start: string; end: string; note: string }): Errors<"title" | "date" | "start" | "end" | "note"> {
  const e: Errors<"title" | "date" | "start" | "end" | "note"> = {};
  const title = v.title.trim();
  if (!title) e.title = "Add a title for this plan.";
  else if (title.length > LIMITS.title) e.title = `Please keep it under ${LIMITS.title} characters.`;
  if (!isDateKey(v.date)) e.date = "Choose a valid date.";
  if (!/^\d{2}:\d{2}$/.test(v.start)) e.start = "Choose a start time.";
  if (v.end && !/^\d{2}:\d{2}$/.test(v.end)) e.end = "Choose a valid end time.";
  else if (v.end && v.start && v.end <= v.start) e.end = "End time should be after the start time.";
  if (v.note.length > LIMITS.note) e.note = `Notes can be up to ${LIMITS.note} characters.`;
  return e;
}

export function validateIntention(text: string): Errors<"text"> {
  const t = text.trim();
  if (!t) return { text: "Write a few words for your intention." };
  // The short headline stays short; longer thoughts go in the note.
  if (t.length > LIMITS.intention) return { text: `Please keep it under ${LIMITS.intention} characters.` };
  return {};
}

/** Long-form fields (reflections, gratitude, intention notes) have no length limit by design. */
export function validateGratitude(text: string): Errors<"text"> {
  return text.trim() ? {} : { text: "Write a few words about something good." };
}

/** "a, b ,  c" → ["a","b","c"], deduplicated and length-limited. */
export function parseTags(input: string): string[] {
  const seen = new Set<string>();
  for (const raw of input.split(",")) {
    const t = raw.trim().toLowerCase().slice(0, LIMITS.tag);
    if (t) seen.add(t);
  }
  return [...seen].slice(0, LIMITS.tags);
}
