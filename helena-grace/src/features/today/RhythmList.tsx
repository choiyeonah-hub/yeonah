import { Sun } from "lucide-react";
import type { LocalDate, Routine, RoutineCompletion } from "../../data/types";
import { ROUTINE_CATEGORIES } from "../../content/labels";
import { isRoutineDue, toggleRoutine } from "../../lib/storage/repos";

export function dueRoutines(routines: Routine[], date: LocalDate): Routine[] {
  return routines.filter((r) => isRoutineDue(r, date));
}

/**
 * Optional routines as large tap cards — no tiny checkboxes, no counts, scores or streaks.
 * Tapping again simply removes the note for that day.
 */
export function RhythmList({ routines, completions, date }: { routines: Routine[]; completions: RoutineCompletion[]; date: LocalDate }) {
  const due = dueRoutines(routines, date);
  const done = new Set(completions.filter((c) => c.localDate === date).map((c) => c.routineId));
  if (due.length === 0) return <p className="text-muted">No routines for this day.</p>;
  return (
    <ul className="grid gap-2 sm:grid-cols-2">
      {due.map((r) => {
        const noted = done.has(r.id);
        return (
          <li key={r.id}>
            <button
              type="button"
              aria-pressed={noted}
              onClick={() => toggleRoutine(r.id, date)}
              className={`flex min-h-16 w-full items-center gap-3 rounded-[20px] border px-4 py-3 text-left transition-colors ${
                noted ? "border-gold/70 bg-tint" : "border-line bg-surface hover:bg-tint/60"
              }`}
            >
              <Sun size={22} aria-hidden="true" className={noted ? "text-gold-ink" : "text-line"} strokeWidth={noted ? 2.2 : 1.6} />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[1.02rem]">{r.name}</span>
                <span className="block text-sm text-muted">
                  {noted ? "Noted for today" : ROUTINE_CATEGORIES[r.category]}
                  {r.isSample ? " · Sample" : ""}
                </span>
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
