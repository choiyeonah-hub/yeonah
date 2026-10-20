import { useCallback, useEffect, useMemo, useState } from "react";
import { createBrowserRouter, Navigate, RouterProvider, Outlet, ScrollRestoration, useLocation, useNavigate } from "react-router";
import type { Settings } from "./data/types";
import { AppContext } from "./lib/hooks";
import { loadSettings, saveSettings } from "./lib/storage/repos";
import { recoverJournalWal } from "./lib/storage/journalWal";
import { todayKey } from "./lib/date";
import { AppShell } from "./components/layout/AppShell";
import { Landing } from "./features/landing/Landing";
import { LegalPage } from "./features/landing/LegalPage";
import { BrandPage } from "./features/landing/BrandPage";
import { TodayPage } from "./features/today/TodayPage";
import { PlannerPage } from "./features/planner/PlannerPage";
import { RosaryPage } from "./features/rosary/RosaryPage";
import { JournalPage } from "./features/journal/JournalPage";
import { EntryEditorPage } from "./features/journal/EntryEditor";
import { YouPage } from "./features/you/YouPage";
import { WidgetsPage } from "./features/widgets/WidgetsPage";
import { Onboarding } from "./features/onboarding/Onboarding";
import { NotFound } from "./features/landing/NotFound";

function AppProvider() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState(() => new Date());
  const navigate = useNavigate();
  const { pathname } = useLocation();

  useEffect(() => {
    (async () => {
      // Restore words typed just before a reload/close that IndexedDB hadn't stored yet.
      const restored = await recoverJournalWal();
      if (restored && pathname === "/app/journal/new") navigate(`/app/journal/${restored}`, { replace: true });
      setSettings(await loadSettings());
    })().catch((e: unknown) => setError(e instanceof Error ? e.message : String(e)));
    // Re-evaluate "today" every minute so the app rolls over at local midnight.
    const t = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (!settings) return;
    document.documentElement.dataset.theme = settings.themeId;
    document.documentElement.dataset.reducedMotion = String(settings.reducedMotion);
  }, [settings]);

  const updateSettings = useCallback(async (patch: Partial<Settings>) => {
    setSettings(await saveSettings(patch));
  }, []);

  const value = useMemo(
    () => (settings ? { settings, today: todayKey(settings.timezone, now), updateSettings } : null),
    [settings, now, updateSettings],
  );

  if (error)
    return (
      <div role="alert" className="mx-auto max-w-md p-6 text-center">
        <h1 className="mb-2 text-3xl">We couldn't open your local storage</h1>
        <p className="text-muted">
          Helena Grace keeps your data in this browser (IndexedDB). It may be disabled in private browsing or by a browser setting. Details: {error}
        </p>
      </div>
    );
  if (!value)
    return (
      <p role="status" className="p-6 text-muted">
        Opening your planner…
      </p>
    );
  return (
    <AppContext.Provider value={value}>
      <Outlet />
      {!value.settings.onboarded && <Onboarding />}
    </AppContext.Provider>
  );
}

function Root() {
  return (
    <>
      <ScrollRestoration />
      <Outlet />
    </>
  );
}

export const routes = [
  {
    element: <Root />,
    children: [
      { path: "/", element: <Landing /> },
      { path: "/privacy", element: <LegalPage kind="privacy" /> },
      { path: "/terms", element: <LegalPage kind="terms" /> },
      { path: "/brand", element: <BrandPage /> },
      {
        path: "/app",
        element: <AppProvider />,
        children: [
          {
            element: <AppShell />,
            children: [
              { index: true, element: <Navigate to="today" replace /> },
              { path: "today", element: <TodayPage /> },
              { path: "planner", element: <PlannerPage /> },
              { path: "rosary", element: <RosaryPage /> },
              { path: "journal", element: <JournalPage /> },
              { path: "journal/:entryId", element: <EntryEditorPage /> },
              { path: "you", element: <YouPage /> },
              { path: "you/widgets", element: <WidgetsPage /> },
            ],
          },
        ],
      },
      { path: "*", element: <NotFound /> },
    ],
  },
];

const router = createBrowserRouter(routes);

export default function App() {
  return <RouterProvider router={router} />;
}
