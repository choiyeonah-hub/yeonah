import type { GratitudeEntry, Intention, JournalEntry, LocalDate, PlannerEvent, Routine, RoutineCompletion } from "./types";
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
    { id: "sample-r4", name: "A moment of gratitude before bed", recurrence: "daily", daysOfWeek: [], category: "gratitude", createdAt: created, isSample: true },
  ];
  const completions: RoutineCompletion[] = [
    { id: `sample-r1:${addDays(today, -1)}`, routineId: "sample-r1", localDate: addDays(today, -1), completedAt: created, isSample: true },
    { id: `sample-r4:${addDays(today, -1)}`, routineId: "sample-r4", localDate: addDays(today, -1), completedAt: created, isSample: true },
  ];
  const events: PlannerEvent[] = [
    { id: "sample-e1", title: "Coffee with Anna", startAt: `${today}T08:30`, category: "personal", completed: false, repeat: "none", sticker: "flower", isSample: true },
    { id: "sample-e2", title: "Evening Mass", startAt: `${today}T18:00`, endAt: `${today}T18:45`, category: "mass", completed: false, repeat: "none", sticker: "sun", isSample: true },
    { id: "sample-e4", title: "Quiet time in the chapel", startAt: `${addDays(today, 2)}T07:30`, category: "prayer", completed: false, repeat: "none", sticker: "star", isSample: true },
    { id: "sample-e3", title: "Call Mom", startAt: `${today}T19:00`, category: "personal", completed: false, repeat: "weekly", tags: ["family"], isSample: true },
  ];
  const intentions: Intention[] = [
    {
      id: "sample-i1",
      text: "For my grandmother's recovery",
      note: "She's been in the hospital since Sunday. Praying for her doctors, for peace for my mom, and for patience for all of us while we wait.",
      isPrivate: true,
      createdAt: created,
      isSample: true,
    },
    { id: "sample-i2", text: "For patience with my team this week", isPrivate: true, createdAt: created, isSample: true },
  ];
  const yesterday = addDays(today, -1);
  const journal: JournalEntry[] = [
    {
      id: "sample-j1",
      localDate: yesterday,
      title: "A slower evening",
      body: [
        "The afternoon felt rushed. Three meetings back to back, and I noticed how quickly I stopped breathing deeply.",
        "But the evening was different. I walked home the long way, past the church, and sat on the steps for a few minutes. Nothing dramatic happened. It was just quiet, and that was enough.",
        "I want to remember that I don't have to earn rest. Tomorrow I'll try to pause before the first meeting, even for one minute.",
      ].join("\n\n"),
      tags: ["rest", "work"],
      createdAt: created,
      updatedAt: created,
      isSample: true,
    },
  ];
  const gratitude: GratitudeEntry[] = [
    { id: "sample-g1", localDate: yesterday, text: "Morning light on the kitchen table", createdAt: created, updatedAt: created, isSample: true },
    { id: "sample-g2", localDate: yesterday, text: "A kind message from a friend who remembered my grandmother", createdAt: created, updatedAt: created, isSample: true },
  ];
  return { routines, completions, events, intentions, journal, gratitude };
}

export async function addSampleData(today: LocalDate): Promise<void> {
  const s = buildSample(today);
  const db = await getDB();
  const tx = db.transaction(["routines", "completions", "events", "intentions", "journal", "gratitude"], "readwrite");
  for (const r of s.routines) await tx.objectStore("routines").put(r);
  for (const c of s.completions) await tx.objectStore("completions").put(c);
  for (const e of s.events) await tx.objectStore("events").put(e);
  for (const i of s.intentions) await tx.objectStore("intentions").put(i);
  // Sample ids are prefixed "sample-", so they can never overwrite the user's own entries.
  for (const j of s.journal) await tx.objectStore("journal").put(j);
  for (const g of s.gratitude) await tx.objectStore("gratitude").put(g);
  await tx.done;
  notifyChange();
}
