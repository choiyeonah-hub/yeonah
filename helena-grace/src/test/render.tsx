import { render } from "@testing-library/react";
import { createMemoryRouter, RouterProvider } from "react-router";
import { routes } from "../App";
import { saveSettings } from "../lib/storage/repos";

/** Renders the real app routes at a path, with onboarding already completed. */
export async function renderApp(path: string, onboarded = true) {
  await saveSettings({ onboarded, timezone: "America/New_York" });
  const router = createMemoryRouter(routes, { initialEntries: [path] });
  return render(<RouterProvider router={router} />);
}
