import { addSampleData } from "../../data/sample";
import { getAll } from "./db";
import { csvCell, exportAll, parseBackup, removeSampleData, restoreBackup, deleteAllData } from "./backup";
import { eventsOn, isEventDone, loadSettings, saveEvent, saveJournal, saveRoutine, saveSettings, toggleEventDone, toggleRoutine, deleteRoutine } from "./repos";

const TODAY = "2026-10-20";

describe("storage", () => {
  it("persists settings with defaults", async () => {
    expect((await loadSettings()).onboarded).toBe(false);
    await saveSettings({ onboarded: true, weekStartsOn: 1 });
    const s = await loadSettings();
    expect(s.onboarded).toBe(true);
    expect(s.weekStartsOn).toBe(1);
  });

  it("toggles one routine completion per day and cleans up on delete", async () => {
    const r = await saveRoutine({ name: "Morning prayer", category: "prayer", recurrence: "daily", daysOfWeek: [] });
    expect(await toggleRoutine(r.id, TODAY)).toBe(true);
    expect(await getAll("completions")).toHaveLength(1);
    expect(await toggleRoutine(r.id, TODAY)).toBe(false);
    expect(await getAll("completions")).toHaveLength(0);
    await toggleRoutine(r.id, TODAY);
    await deleteRoutine(r.id);
    expect(await getAll("completions")).toHaveLength(0);
  });

  it("expands weekly events and tracks completion per occurrence", async () => {
    const e = await saveEvent({ title: "Call Mom", startAt: `${TODAY}T19:00`, category: "personal", repeat: "weekly", completed: false });
    expect(eventsOn([e], "2026-10-27")).toHaveLength(1);
    expect(eventsOn([e], "2026-10-21")).toHaveLength(0);
    expect(eventsOn([e], "2026-10-13")).toHaveLength(0);
    await toggleEventDone(e, "2026-10-27");
    const [saved] = await getAll("events");
    expect(isEventDone(saved, "2026-10-27")).toBe(true);
    expect(isEventDone(saved, TODAY)).toBe(false);
  });

  it("removes only sample data, never the user's own records", async () => {
    await saveJournal({ localDate: "2026-10-19", gratitude: ["my own", "", ""] });
    await saveRoutine({ name: "Mine", category: "personal", recurrence: "daily", daysOfWeek: [] });
    await addSampleData(TODAY);
    const journal = await getAll("journal");
    expect(journal.find((j) => j.localDate === "2026-10-19")?.gratitude[0]).toBe("my own"); // not overwritten
    expect((await getAll("routines")).length).toBeGreaterThan(1);
    await removeSampleData();
    expect((await getAll("routines")).map((r) => r.name)).toEqual(["Mine"]);
    expect(await getAll("journal")).toHaveLength(1);
    expect(await getAll("events")).toHaveLength(0);
  });

  it("round-trips a backup and rejects foreign files", async () => {
    await addSampleData(TODAY);
    const backup = JSON.stringify(await exportAll());
    await deleteAllData();
    expect(await getAll("routines")).toHaveLength(0);
    const n = await restoreBackup(parseBackup(backup));
    expect(n).toBeGreaterThan(5);
    expect((await getAll("routines")).length).toBe(4);
    expect(() => parseBackup("{")).toThrow(/valid JSON/);
    expect(() => parseBackup('{"app":"other"}')).toThrow(/Helena Grace/);
    expect(() => parseBackup('{"app":"helena-grace","version":1,"data":{"routines":[{}]}}')).toThrow(/id/);
  });

  it("escapes CSV cells and neutralizes formulas", () => {
    expect(csvCell('say "hi"')).toBe('"say ""hi"""');
    expect(csvCell("=SUM(A1)")).toBe(`"'=SUM(A1)"`);
  });
});
