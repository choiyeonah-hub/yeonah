import type { Intention, JournalEntry, LocalDate, PlannerEvent, Routine, RoutineCompletion } from "./types";
import { addDays } from "../lib/date";
import { getDB, notifyChange } from "../lib/storage/db";

/**
 * Demo records, always tagged `isSample: true` so "Remove sample data" deletes
 * exactly these and never the user's own entries. Contains no prayer texts,
 * readings or saint content — only neutral planner examples.
 */
export function buildSample(today: LocalDate) {
  const created = new Date().toISOString();
  const routines: Routine[] = [
    { id: "sample-r1", name: "Morning offering", recurrence: "daily", daysOfWeek: [], category: "prayer", createdAt: created, isSample: true },
    { id: "sample-r2", name: "Read a short Scripture passage", recurrence: "daily", daysOfWeek: [], category: "scripture", createdAt: created, isSample: true },
    { id: "sample-r3", name: "Sunday Mass", recurrence: "weekly", daysOfWeek: [0], category: "mass", createdAt: created, isSample: true },
    { id: "sample-r4", name: "Three graces before bed", recurrence: "daily", daysOfWeek: [], category: "gratitude", createdAt: created, isSample: true },
  ];
  const completions: RoutineCompletion[] = [
    { id: `sample-r1:${addDays(today, -1)}`, routineId: "sample-r1", localDate: addDays(today, -1), completedAt: created, isSample: true },
    { id: `sample-r4:${addDays(today, -1)}`, routineId: "sample-r4", localDate: addDays(today, -1), completedAt: created, isSample: true },
  ];
  const events: PlannerEvent[] = [
    { id: "sample-e1", title: "Coffee with Anna", startAt: `${today}T08:30`, category: "personal", completed: false, repeat: "none", sticker: "flower", isSample: true },
    { id: "sample-e2", title: "Quiet time in the chapel", startAt: `${addDays(today, 1)}T18:00`, endAt: `${addDays(today, 1)}T18:30`, category: "mass", completed: false, repeat: "none", sticker: "sun", isSample: true },
    { id: "sample-e3", title: "Call Mom", startAt: `${today}T19:00`, category: "personal", completed: false, repeat: "weekly", tags: ["family"], isSample: true },
  ];
  const intentions: Intention[] = [
    { id: "sample-i1", text: "For my grandmother's recovery", isPrivate: true, createdAt: created, isSample: true },
    { id: "sample-i2", text: "For patience with my team this week", isPrivate: true, createdAt: created, isSample: true },
  ];
  const journal: JournalEntry[] = [
    {
      id: addDays(today, -1),
      localDate: addDays(today, -1),
      gratitude: ["Morning light on the kitchen table", "A kind message from a friend", "A slow walk after dinner"],
      reflection: "Felt rushed in the afternoon, but the evening was calm.",
      mood: "peaceful",
      updatedAt: created,
      isSample: true,
    },
  ];
  return { routines, completions, events, intentions, journal };
}

export async function addSampleData(today: LocalDate): Promise<void> {
  const s = buildSample(today);
  const db = await getDB();
  const tx = db.transaction(["routines", "completions", "events", "intentions", "journal"], "readwrite");
  for (const r of s.routines) await tx.objectStore("routines").put(r);
  for (const c of s.completions) await tx.objectStore("completions").put(c);
  for (const e of s.events) await tx.objectStore("events").put(e);
  for (const i of s.intentions) await tx.objectStore("intentions").put(i);
  // Never overwrite a real journal entry with sample text.
  for (const j of s.journal) if (!(await tx.objectStore("journal").get(j.id))) await tx.objectStore("journal").put(j);
  await tx.done;
  notifyChange();
}
