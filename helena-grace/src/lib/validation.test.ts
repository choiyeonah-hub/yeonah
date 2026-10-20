import { parseTags, validateEvent, validateGratitude, validateIntention, validateRoutine } from "./validation";

describe("validation", () => {
  it("requires a routine name and days for weekly routines", () => {
    expect(validateRoutine({ name: " ", recurrence: "daily", daysOfWeek: [] }).name).toBeTruthy();
    expect(validateRoutine({ name: "Mass", recurrence: "weekly", daysOfWeek: [] }).daysOfWeek).toBeTruthy();
    expect(validateRoutine({ name: "Mass", recurrence: "weekly", daysOfWeek: [0] })).toEqual({});
  });
  it("checks event times", () => {
    const ok = { title: "Mass", date: "2026-10-20", start: "09:00", end: "", note: "" };
    expect(validateEvent(ok)).toEqual({});
    expect(validateEvent({ ...ok, end: "08:00" }).end).toBeTruthy();
    expect(validateEvent({ ...ok, date: "2026-02-30" }).date).toBeTruthy();
  });
  it("gratitude needs words but has no length limit", () => {
    expect(validateGratitude("  ").text).toBeTruthy();
    expect(validateGratitude("x".repeat(20_000))).toEqual({});
  });
  it("validates intentions and tags", () => {
    expect(validateIntention("").text).toBeTruthy();
    expect(parseTags(" Family, parish,family ,, ")).toEqual(["family", "parish"]);
  });
});
