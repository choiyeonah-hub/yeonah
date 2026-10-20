import { addDays, addMonths, isDateKey, monthGrid, startOfWeek, toLocalDateKey, weekday, weekDays } from "./date";

describe("toLocalDateKey", () => {
  it("uses the user's timezone, not UTC", () => {
    const instant = new Date("2026-03-08T03:30:00Z"); // Saturday evening in New York
    expect(toLocalDateKey(instant, "America/New_York")).toBe("2026-03-07");
    expect(toLocalDateKey(instant, "Asia/Seoul")).toBe("2026-03-08");
    expect(instant.toISOString().slice(0, 10)).toBe("2026-03-08"); // the trap we avoid
  });
  it("handles the US DST switch day", () => {
    expect(toLocalDateKey(new Date("2026-03-08T07:30:00Z"), "America/Los_Angeles")).toBe("2026-03-07");
    expect(toLocalDateKey(new Date("2026-03-08T09:30:00Z"), "America/Los_Angeles")).toBe("2026-03-08");
  });
});

describe("key arithmetic", () => {
  it("adds days across month/year and DST boundaries", () => {
    expect(addDays("2026-03-07", 1)).toBe("2026-03-08");
    expect(addDays("2026-03-08", 1)).toBe("2026-03-09");
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
    expect(addDays("2028-03-01", -1)).toBe("2028-02-29");
  });
  it("adds months from any day", () => {
    expect(addMonths("2026-01-31", 1)).toBe("2026-02-01");
    expect(addMonths("2026-01-15", -1)).toBe("2025-12-01");
  });
  it("computes weekdays and week starts", () => {
    expect(weekday("2026-10-20")).toBe(2); // Tuesday
    expect(startOfWeek("2026-10-20", 0)).toBe("2026-10-18");
    expect(startOfWeek("2026-10-20", 1)).toBe("2026-10-19");
    expect(startOfWeek("2026-10-18", 1)).toBe("2026-10-12");
    expect(weekDays("2026-10-20", 0)).toHaveLength(7);
  });
  it("builds a 6-week month grid starting on the week start", () => {
    const g = monthGrid("2026-10-20", 0);
    expect(g).toHaveLength(42);
    expect(g[0]).toBe("2026-09-27");
    expect(g).toContain("2026-10-31");
  });
  it("validates keys", () => {
    expect(isDateKey("2026-02-29")).toBe(false);
    expect(isDateKey("2028-02-29")).toBe(true);
    expect(isDateKey("2026-1-01")).toBe(false);
  });
});
