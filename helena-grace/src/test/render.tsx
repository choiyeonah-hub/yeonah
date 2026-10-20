import { render } from "@testing-library/react";
import { createMemoryRouter, RouterProvider } from "react-router";
import { routes } from "../App";
import { saveSettings } from "../lib/storage/repos";
import type { Settings } from "../data/types";

/** Renders the real app routes at a path, with onboarding already completed. */
export async function renderApp(path: string, settings: Partial<Settings> = {}) {
  await saveSettings({ onboarded: true, timezone: "America/New_York", ...settings });
  const router = createMemoryRouter(routes, { initialEntries: [path] });
  return { router, ...render(<RouterProvider router={router} />) };
}
