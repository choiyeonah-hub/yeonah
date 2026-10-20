import { Check } from "lucide-react";
import type { LocalDate, Routine, RoutineCompletion } from "../../data/types";
import { ROUTINE_CATEGORIES } from "../../content/labels";
import { isRoutineDue, toggleRoutine } from "../../lib/storage/repos";

export function dueRoutines(routines: Routine[], date: LocalDate): Routine[] {
  return routines.filter((r) => isRoutineDue(r, date));
}

export function RhythmList({ routines, completions, date }: { routines: Routine[]; completions: RoutineCompletion[]; date: LocalDate }) {
  const due = dueRoutines(routines, date);
  const done = new Set(completions.filter((c) => c.localDate === date).map((c) => c.routineId));
  if (due.length === 0) return <p className="text-sm text-muted">No rhythms for this day.</p>;
  return (
    <ul className="flex flex-col gap-1.5">
      {due.map((r) => {
        const checked = done.has(r.id);
        return (
          <li key={r.id}>
            <label className={`flex min-h-12 cursor-pointer items-center gap-3 rounded-2xl border px-3 transition-colors ${checked ? "border-gold/60 bg-tint" : "border-line hover:bg-tint/60"}`}>
              <input type="checkbox" className="peer sr-only" checked={checked} onChange={() => toggleRoutine(r.id, date)} />
              <span
                aria-hidden="true"
                className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-ink ${
                  checked ? "border-gold bg-gold text-white" : "border-gold/70"
                }`}
              >
                {checked && <Check size={15} strokeWidth={3} />}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate">{r.name}</span>
                <span className="block text-xs text-muted">
                  {ROUTINE_CATEGORIES[r.category]}
                  {r.isSample ? " · Sample" : ""}
                </span>
              </span>
              <span className="text-xs text-muted">{checked ? "Done" : ""}</span>
            </label>
          </li>
        );
      })}
    </ul>
  );
}
