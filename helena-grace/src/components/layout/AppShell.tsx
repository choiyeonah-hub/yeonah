import { NavLink, Outlet, Link } from "react-router";
import { BookHeart, CalendarDays, CircleDot, Sun, UserRound } from "lucide-react";
import { Logo } from "../ui/Logo";

const TABS = [
  { to: "/app/today", label: "Today", icon: Sun },
  { to: "/app/planner", label: "Planner", icon: CalendarDays },
  { to: "/app/rosary", label: "Rosary", icon: CircleDot },
  { to: "/app/journal", label: "Journal", icon: BookHeart },
  { to: "/app/you", label: "You", icon: UserRound },
];

export function AppShell() {
  return (
    <div className="paper min-h-dvh bg-bg">
      <a href="#main" className="sr-only-focusable fixed left-3 top-3 z-50 rounded-full bg-ink px-4 py-2 text-white">
        Skip to content
      </a>
      {/* Desktop / tablet sidebar */}
      <aside className="fixed inset-y-0 left-0 hidden w-60 flex-col border-r border-line bg-surface/80 px-4 py-6 md:flex">
        <Link to="/" className="mb-8 px-2" aria-label="Helena Grace home">
          <Logo size={24} textClass="text-[0.95rem]" />
        </Link>
        <nav aria-label="Main">
          <ul className="flex flex-col gap-1">
            {TABS.map(({ to, label, icon: Icon }) => (
              <li key={to}>
                <NavLink
                  to={to}
                  className={({ isActive }) =>
                    `flex min-h-11 items-center gap-3 rounded-full px-4 text-[0.95rem] transition-colors ${isActive ? "bg-ink text-white" : "text-ink hover:bg-tint"}`
                  }
                >
                  <Icon size={19} aria-hidden="true" />
                  {label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
        <p className="mt-auto px-2 text-xs text-muted">Demo · data stays in this browser</p>
      </aside>

      <main id="main" tabIndex={-1} className="mx-auto max-w-3xl px-4 pb-28 pt-5 sm:px-6 md:ml-60 md:max-w-none md:px-10 md:pb-12 lg:pr-16">
        <div className="mx-auto max-w-3xl">
          <Outlet />
        </div>
      </main>

      {/* Mobile bottom tabs */}
      <nav aria-label="Main" className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden">
        <ul className="mx-auto grid max-w-lg grid-cols-5">
          {TABS.map(({ to, label, icon: Icon }) => (
            <li key={to}>
              <NavLink
                to={to}
                className={({ isActive }) =>
                  `flex min-h-14 flex-col items-center justify-center gap-0.5 text-[0.72rem] font-medium ${isActive ? "text-ink" : "text-muted"}`
                }
              >
                {({ isActive }) => (
                  <>
                    <span className={`flex h-7 w-12 items-center justify-center rounded-full ${isActive ? "bg-tint" : ""}`}>
                      <Icon size={20} aria-hidden="true" strokeWidth={isActive ? 2.2 : 1.7} />
                    </span>
                    {label}
                  </>
                )}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}

export function PageHeader({ eyebrow, title, children }: { eyebrow?: string; title: string; children?: React.ReactNode }) {
  return (
    <header className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div>
        {eyebrow && <p className="text-sm text-muted">{eyebrow}</p>}
        <h1 className="text-[2.1rem] sm:text-[2.5rem]">{title}</h1>
      </div>
      {children}
    </header>
  );
}
