import { openDB } from "idb";
import { addSampleData } from "../../data/sample";
import { closeDB, DB_NAME, getAll } from "./db";
import { csvCell, deleteAllData, exportAll, journalCsv, parseBackup, removeSampleData, restoreBackup } from "./backup";
import { deleteRoutine, eventsOn, isEventDone, latestEntry, loadSettings, saveEvent, saveGratitude, saveJournalEntry, saveRoutine, saveSettings, toggleEventDone, toggleRoutine } from "./repos";

import { LONG_TEXT } from "../../test/testUtils";

const TODAY = "2026-10-20";

describe("storage", () => {
  it("long sample text is really long", () => expect(LONG_TEXT.length).toBeGreaterThan(3000));

  it("persists settings with defaults (routines off by default)", async () => {
    const d = await loadSettings();
    expect(d.onboarded).toBe(false);
    expect(d.routinesEnabled).toBe(false);
    await saveSettings({ onboarded: true, weekStartsOn: 1 });
    const s = await loadSettings();
    expect(s.onboarded).toBe(true);
    expect(s.weekStartsOn).toBe(1);
  });

  it("stores long reflections verbatim, several per day", async () => {
    await saveJournalEntry({ id: "a", localDate: TODAY, title: "Morning", body: LONG_TEXT, tags: ["rest"] });
    await saveJournalEntry({ id: "b", localDate: TODAY, body: "  second entry\n\n  keeps its spacing  ", tags: [] });
    const all = await getAll("journal");
    expect(all).toHaveLength(2);
    expect(all.find((e) => e.id === "a")!.body).toBe(LONG_TEXT);
    expect(all.find((e) => e.id === "b")!.body).toBe("  second entry\n\n  keeps its spacing  ");
    expect(latestEntry(all)?.id).toBe("b");
  });

  it("allows any number of gratitude notes per day", async () => {
    for (let i = 0; i < 5; i++) await saveGratitude({ localDate: TODAY, text: `grace ${i}` });
    expect(await getAll("gratitude")).toHaveLength(5);
  });

  it("toggles one routine completion per day and cleans up on delete", async () => {
    const r = await saveRoutine({ name: "Morning prayer", category: "prayer", recurrence: "daily", daysOfWeek: [] });
    expect(await toggleRoutine(r.id, TODAY)).toBe(true);
    expect(await toggleRoutine(r.id, TODAY)).toBe(false);
    await toggleRoutine(r.id, TODAY);
    await deleteRoutine(r.id);
    expect(await getAll("completions")).toHaveLength(0);
  });

  it("expands weekly events and tracks completion per occurrence", async () => {
    const e = await saveEvent({ title: "Call Mom", startAt: `${TODAY}T19:00`, category: "personal", repeat: "weekly", completed: false });
    expect(eventsOn([e], "2026-10-27")).toHaveLength(1);
    expect(eventsOn([e], "2026-10-21")).toHaveLength(0);
    await toggleEventDone(e, "2026-10-27");
    const [saved] = await getAll("events");
    expect(isEventDone(saved, "2026-10-27")).toBe(true);
    expect(isEventDone(saved, TODAY)).toBe(false);
  });

  it("removes only sample data, never the user's own records", async () => {
    await saveJournalEntry({ id: "mine", localDate: "2026-10-19", body: "my own", tags: [] });
    await saveGratitude({ localDate: "2026-10-19", text: "my own grace" });
    await addSampleData(TODAY);
    expect((await getAll("journal")).length).toBe(2);
    await removeSampleData();
    expect((await getAll("journal")).map((j) => j.body)).toEqual(["my own"]);
    expect((await getAll("gratitude")).map((g) => g.text)).toEqual(["my own grace"]);
    expect(await getAll("events")).toHaveLength(0);
  });

  it("round-trips a backup with long text, line breaks and emoji", async () => {
    await saveJournalEntry({ id: "long", localDate: TODAY, title: "Évening ✨", body: LONG_TEXT, tags: ["prayer", "family"] });
    await saveGratitude({ localDate: TODAY, text: "Line one\nLine two 🌿" });
    const file = JSON.stringify(await exportAll());
    await deleteAllData();
    expect(await getAll("journal")).toHaveLength(0);
    await restoreBackup(parseBackup(file));
    const [entry] = await getAll("journal");
    expect(entry).toMatchObject({ title: "Évening ✨", body: LONG_TEXT, tags: ["prayer", "family"], localDate: TODAY });
    expect((await getAll("gratitude"))[0].text).toBe("Line one\nLine two 🌿");
  });

  it("rejects foreign or malformed backups", () => {
    expect(() => parseBackup("{")).toThrow(/valid JSON/);
    expect(() => parseBackup('{"app":"other"}')).toThrow(/Helena Grace/);
    expect(() => parseBackup('{"app":"helena-grace","version":2,"data":{"journal":[{}]}}')).toThrow(/id/);
  });

  it("CSV keeps the full body and neutralizes formulas", () => {
    const csv = journalCsv([{ id: "x", localDate: TODAY, body: LONG_TEXT, tags: [], createdAt: "t", updatedAt: "t" }]);
    expect(csv).toContain(LONG_TEXT.replace(/"/g, '""'));
    expect(csvCell('say "hi"')).toBe('"say ""hi"""');
    expect(csvCell("=SUM(A1)")).toBe(`"'=SUM(A1)"`);
  });

  it("migrates a v1 database (3-line journal) to v2 without losing words", async () => {
    await closeDB();
    const v1 = await openDB(DB_NAME, 1, {
      upgrade(db) {
        for (const s of ["routines", "events", "intentions", "rosary", "journal", "dayNotes", "weekReviews", "drafts"]) db.createObjectStore(s, { keyPath: "id" });
        db.createObjectStore("completions", { keyPath: "id" }).createIndex("byDate", "localDate");
        db.createObjectStore("settings");
      },
    });
    await v1.put("journal", { id: "2026-10-01", localDate: "2026-10-01", gratitude: ["sun", "", "tea"], reflection: "Long day.\n\nGood night.", tags: ["x"], updatedAt: "2026-10-01T22:00:00Z" });
    await v1.put("intentions", { id: "i1", text: "For Mom", isPrivate: true, createdAt: "c", answeredAt: "a", answeredNote: "She is home" });
    await v1.put("events", { id: "e1", title: "Thanks", startAt: "2026-10-01T09:00", category: "gratitude", completed: false });
    v1.close();

    const [entry] = await getAll("journal");
    expect(entry).toMatchObject({ localDate: "2026-10-01", body: "Long day.\n\nGood night.", tags: ["x"] });
    expect((await getAll("gratitude")).map((g) => g.text).sort()).toEqual(["sun", "tea"]);
    expect((await getAll("intentions"))[0]).toMatchObject({ resolvedAt: "a", note: "She is home" });
    expect((await getAll("events"))[0].category).toBe("reflection");
  });
});
