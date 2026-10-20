import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderApp } from "./render";
import { getAll } from "../lib/storage/db";
import { saveRoutine } from "../lib/storage/repos";

describe("screens", () => {
  it("landing shows hero, CTAs and the non-affiliation note", async () => {
    await renderApp("/");
    expect(screen.getByRole("heading", { level: 1, name: /make room for grace/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /explore the planner/i })).toHaveAttribute("href", "/app/today");
    expect(screen.getByText(/not affiliated with or endorsed by any diocese/i)).toBeInTheDocument();
    // waitlist is honestly disabled
    expect(screen.getByRole("button", { name: /join the early access list/i })).toBeDisabled();
  });

  it("first visit shows skippable onboarding", async () => {
    const user = userEvent.setup();
    await renderApp("/app/today", false);
    expect(await screen.findByText(/step 1 of 3/i)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /skip for now/i }));
    await waitFor(() => expect(screen.queryByText(/step 1 of 3/i)).not.toBeInTheDocument());
  });

  it("Today: checking a rhythm is saved", async () => {
    const user = userEvent.setup();
    await saveRoutine({ name: "Morning offering", category: "prayer", recurrence: "daily", daysOfWeek: [] });
    await renderApp("/app/today");
    const box = await screen.findByRole("checkbox", { name: /morning offering/i });
    await user.click(box);
    expect(await screen.findByText(/1 of 1 gently kept today/i)).toBeInTheDocument();
    expect(await getAll("completions")).toHaveLength(1);
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
    expect(saved.pausedAt).toBeTruthy();
    await user.click(screen.getByRole("button", { name: /resume/i }));
    expect(await screen.findByText(/bead 2 of 10/i)).toBeInTheDocument();
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

  it("Journal: saves three graces and finds them via search", async () => {
    const user = userEvent.setup();
    await renderApp("/app/journal");
    await user.type(await screen.findByLabelText("Grace 1"), "Warm bread");
    await user.click(screen.getByRole("button", { name: /^save$/i }));
    expect(await screen.findByText(/thank you for noticing/i)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /^search$/i }));
    await user.type(screen.getByLabelText(/search your journal/i), "bread");
    expect(await screen.findByText(/1 result/)).toBeInTheDocument();
  });
});
