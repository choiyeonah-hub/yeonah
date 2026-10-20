import { getAll } from "./db";
import { recoverJournalWal, writeWal } from "./journalWal";
import { deleteAllData } from "./backup";
import { saveJournalEntry } from "./repos";

describe("journal write-ahead recovery", () => {
  beforeEach(() => localStorage.clear());

  it("restores a reflection that never reached IndexedDB", async () => {
    writeWal({ id: "w1", localDate: "2026-10-20", body: "typed right before closing", tags: [], at: new Date().toISOString() });
    expect(await recoverJournalWal()).toBe("w1");
    expect((await getAll("journal"))[0].body).toBe("typed right before closing");
    expect(localStorage.getItem("hg-journal-unsaved")).toBeNull();
  });

  it("applies newer words over an older saved version, but never older over newer", async () => {
    await saveJournalEntry({ id: "w2", localDate: "2026-10-20", body: "saved", tags: [] });
    writeWal({ id: "w2", localDate: "2026-10-20", body: "saved + newer", tags: [], at: new Date(Date.now() + 1000).toISOString() });
    await recoverJournalWal();
    expect((await getAll("journal"))[0].body).toBe("saved + newer");

    writeWal({ id: "w2", localDate: "2026-10-20", body: "stale", tags: [], at: "2000-01-01T00:00:00.000Z" });
    expect(await recoverJournalWal()).toBeUndefined();
    expect((await getAll("journal"))[0].body).toBe("saved + newer");
  });

  it("is wiped by Delete all my data", async () => {
    writeWal({ id: "w3", localDate: "2026-10-20", body: "private", tags: [], at: new Date().toISOString() });
    await deleteAllData();
    expect(localStorage.getItem("hg-journal-unsaved")).toBeNull();
  });
});
