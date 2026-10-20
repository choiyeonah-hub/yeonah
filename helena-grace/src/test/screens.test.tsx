import { act, fireEvent, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderApp } from "./render";
import { getAll } from "../lib/storage/db";
import { LONG_TEXT, saveEvent, saveGratitude, saveIntention, saveJournalEntry, saveRoutine, todayKeyForTests } from "./testUtils";

describe("landing & onboarding", () => {
  it("landing shows hero, CTAs and the non-affiliation note", async () => {
    await renderApp("/");
    expect(screen.getByRole("heading", { level: 1, name: /make room for grace/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /explore the planner/i })).toHaveAttribute("href", "/app/today");
    expect(screen.getByText(/write without limits/i)).toBeInTheDocument();
    expect(screen.getByText(/not affiliated with or endorsed by any diocese/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /join the early access list/i })).toBeDisabled();
  });

  it("first visit shows skippable onboarding", async () => {
    const user = userEvent.setup();
    await renderApp("/app/today", { onboarded: false });
    expect(await screen.findByText(/step 1 of 3/i)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /skip for now/i }));
    await waitFor(() => expect(screen.queryByText(/step 1 of 3/i)).not.toBeInTheDocument());
  });
});

describe("Journal long-form (scenario A)", () => {
  it("autosaves a 3,000+ character reflection and restores it after the editor is reopened", async () => {
    const user = userEvent.setup();
    const first = await renderApp("/app/journal/new");
    await user.type(await screen.findByLabelText(/title/i), "Evening prayer");
    const body = screen.getByLabelText("Reflection");
    await user.click(body);
    await user.paste(LONG_TEXT);
    await user.type(screen.getByLabelText(/^tags/i), "prayer, family");
    expect(await screen.findByText(/saved locally/i, {}, { timeout: 3000 })).toBeInTheDocument();
    // URL moves from /new to the entry's own id so a refresh reopens it.
    const id = first.router.state.location.pathname.split("/").pop()!;
    expect(id).not.toBe("new");
    first.unmount();

    // "Refresh": a brand-new render straight to the entry URL.
    await renderApp(`/app/journal/${id}`);
    expect(await screen.findByLabelText("Reflection")).toHaveValue(LONG_TEXT);
    expect(screen.getByLabelText(/title/i)).toHaveValue("Evening prayer");
    expect(screen.getByLabelText(/^tags/i)).toHaveValue("prayer, family");
    const [saved] = await getAll("journal");
    expect(saved.body).toBe(LONG_TEXT);
    expect(saved.tags).toEqual(["prayer", "family"]);
  });

  it("saves pending text immediately when leaving before the autosave delay", async () => {
    const first = await renderApp("/app/journal/new");
    fireEvent.change(await screen.findByLabelText("Reflection"), { target: { value: "written just before closing" } });
    first.unmount(); // leaving flushes the pending save
    await waitFor(async () => expect((await getAll("journal"))[0]?.body).toBe("written just before closing"));
  });

  it("has no short length limit and offers read mode and prompts that never overwrite", async () => {
    const user = userEvent.setup();
    await saveJournalEntry({ id: "r1", localDate: todayKeyForTests(), title: "Kept", body: "First paragraph.\n\nSecond paragraph.", tags: [] });
    await renderApp("/app/journal/r1");
    const body = await screen.findByLabelText("Reflection");
    expect(body).not.toHaveAttribute("maxlength");
    await user.click(screen.getByRole("button", { name: /what is weighing on your heart/i }));
    expect(body).toHaveValue("First paragraph.\n\nSecond paragraph.");
    await user.click(screen.getByRole("button", { name: /^read$/i }));
    expect(screen.getByText("Second paragraph.")).toBeInTheDocument();
  });

  it("lists past entries by date and finds them by keyword", async () => {
    const user = userEvent.setup();
    await saveJournalEntry({ id: "p1", localDate: "2026-10-01", title: "Retreat notes", body: "The silence at the abbey surprised me.", tags: ["retreat"] });
    await saveJournalEntry({ id: "p2", localDate: "2026-10-01", body: "A second entry the same day.", tags: [] });
    await renderApp("/app/journal");
    expect(await screen.findByText("Retreat notes")).toBeInTheDocument();
    expect(screen.getByText("A second entry the same day.")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /^search$/i }));
    await user.type(screen.getByLabelText(/search your reflections/i), "abbey");
    expect(await screen.findByText(/^1 result$/)).toBeInTheDocument();
  });

  it("gratitude accepts any number of free-form notes", async () => {
    const user = userEvent.setup();
    await renderApp("/app/journal?tab=gratitude");
    for (const t of ["warm bread", "a long call with my sister\nwho made me laugh", "rain"]) {
      await user.type(await screen.findByLabelText(/something you're grateful for/i), t.replace("\n", "{Enter}"));
      await user.click(screen.getByRole("button", { name: /^save$/i }));
    }
    await waitFor(async () => expect(await getAll("gratitude")).toHaveLength(3));
    expect((await getAll("gratitude")).some((g) => g.text.includes("\n"))).toBe(true);
  });
});

describe("Today, planner & prayer (scenario B)", () => {
  it("shows plans, intentions and continue-writing; journal body never leaks into widgets", async () => {
    const today = todayKeyForTests();
    await saveEvent({ title: "Dentist", startAt: `${today}T09:00`, category: "personal", completed: false });
    await saveEvent({ title: "Evening Mass", startAt: `${today}T18:00`, category: "mass", completed: false });
    await saveIntention({ text: "For Grandma", isPrivate: true });
    await saveGratitude({ localDate: today, text: "Sunlight" });
    await saveJournalEntry({ id: "j", localDate: today, title: "Night thoughts", body: "SECRET-PRIVATE-BODY", tags: [] });

    const t = await renderApp("/app/today");
    expect(await screen.findByText("Dentist")).toBeInTheDocument();
    expect(screen.getByText("Evening Mass")).toBeInTheDocument();
    expect(screen.getByText("For Grandma")).toBeInTheDocument();
    expect(screen.getByText("Night thoughts")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /continue writing/i })).toBeInTheDocument();
    t.unmount();

    const p = await renderApp("/app/planner");
    expect(await screen.findByText("Dentist")).toBeInTheDocument();
    expect(screen.getByText("Evening Mass")).toBeInTheDocument();
    p.unmount();

    await renderApp("/app/you/widgets");
    await screen.findByText(/a little light, at a glance/i);
    expect(document.body.textContent).not.toContain("SECRET-PRIVATE-BODY");
    expect(document.body.textContent).not.toContain("For Grandma");
    expect(document.body.textContent).not.toContain("Sunlight"); // not chosen as Grace Note
  });

  it("Planner: adds a plan with validation", async () => {
    const user = userEvent.setup();
    await renderApp("/app/planner");
    await user.click(await screen.findByRole("button", { name: /new plan/i }));
    const dialog = await screen.findByRole("dialog");
    await user.click(within(dialog).getByRole("button", { name: /^save$/i }));
    expect(within(dialog).getByText(/add a title/i)).toBeInTheDocument();
    await user.type(within(dialog).getByLabelText(/title/i), "Adoration");
    await user.click(within(dialog).getByRole("button", { name: /^save$/i }));
    expect(await screen.findByText("Adoration")).toBeInTheDocument();
    expect(await getAll("events")).toHaveLength(1);
  });

  it("Rosary: begin, count, pause and resume with saved progress", async () => {
    const user = userEvent.setup();
    await renderApp("/app/rosary");
    await user.click(await screen.findByRole("radio", { name: /sorrowful/i }));
    await user.click(screen.getByRole("button", { name: /begin the rosary/i }));
    const plus = await screen.findByRole("button", { name: /\+1 bead/i });
    await user.click(plus);
    await user.click(plus);
    expect(await screen.findByText(/bead 2 of 10/i)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /pause/i }));
    expect(await screen.findByText(/paused\. your place is saved/i)).toBeInTheDocument();
    const [saved] = await getAll("rosary");
    expect(saved).toMatchObject({ mystery: "sorrowful", beadIndex: 2, decadeIndex: 0 });
    await user.click(screen.getByRole("button", { name: /resume/i }));
    expect(await screen.findByText(/bead 2 of 10/i)).toBeInTheDocument();
  });
});

describe("optional routines (scenario C)", () => {
  it("routines are off by default: no routine UI and no checkboxes on Today", async () => {
    await saveRoutine({ name: "Morning offering", category: "prayer", recurrence: "daily", daysOfWeek: [] });
    await renderApp("/app/today", { routinesEnabled: false });
    await screen.findByText(/a little light for today/i);
    expect(screen.queryByText(/gentle routines/i)).not.toBeInTheDocument();
    expect(screen.queryByText("Morning offering")).not.toBeInTheDocument();
    expect(screen.queryAllByRole("checkbox")).toHaveLength(0);
  });

  it("when on, a large tap card notes a routine — no counts or streaks", async () => {
    const user = userEvent.setup();
    await saveRoutine({ name: "Morning offering", category: "prayer", recurrence: "daily", daysOfWeek: [] });
    await renderApp("/app/today", { routinesEnabled: true });
    await user.click(await screen.findByText(/gentle routines/i));
    const card = screen.getByRole("button", { name: /morning offering/i });
    expect(card).toHaveAttribute("aria-pressed", "false");
    await user.click(card);
    await waitFor(() => expect(screen.getByRole("button", { name: /morning offering/i })).toHaveAttribute("aria-pressed", "true"));
    expect(await getAll("completions")).toHaveLength(1);
    expect(document.body.textContent).not.toMatch(/\d+[- ]day streak|\d+ of \d+|\d+ ?%/i);
  });
});

describe("scope", () => {
  const ROUTES = ["/", "/app/today", "/app/planner", "/app/rosary", "/app/journal", "/app/journal/new", "/app/journal?tab=gratitude", "/app/journal?tab=intentions", "/app/you", "/app/you/widgets", "/brand"];
  it.each(ROUTES)("%s has zero meal-planning UI", async (path) => {
    const r = await renderApp(path);
    await act(async () => new Promise((res) => setTimeout(res, 50)));
    expect(document.body.textContent ?? "").not.toMatch(/\b(meals?|recipes?|grocer(y|ies)|diet|nutrition|calories?|shopping list|ingredients?)\b/i);
    r.unmount();
  });
});
