import { useState } from "react";
import { Archive, Pencil, RotateCcw, Trash2 } from "lucide-react";
import type { Routine, RoutineCategory } from "../../data/types";
import { Button, Chip, Dialog, Field, IconButton } from "../../components/ui";
import { ROUTINE_CATEGORIES } from "../../content/labels";
import { hasErrors, validateRoutine, type Errors } from "../../lib/validation";
import { deleteRoutine, saveRoutine } from "../../lib/storage/repos";
import { nowIso } from "../../lib/storage/db";
import { weekdayShort } from "../../lib/date";

type Draft = { id?: string; createdAt?: string; name: string; category: RoutineCategory; recurrence: "daily" | "weekly"; daysOfWeek: number[]; isSample?: boolean };
const EMPTY: Draft = { name: "", category: "prayer", recurrence: "daily", daysOfWeek: [] };

export function describeRecurrence(r: Pick<Routine, "recurrence" | "daysOfWeek">): string {
  if (r.recurrence === "daily") return "Every day";
  return [...r.daysOfWeek].sort().map(weekdayShort).join(", ");
}

export function RoutineManager({ open, onClose, routines }: { open: boolean; onClose: () => void; routines: Routine[] }) {
  const [draft, setDraft] = useState<Draft>(EMPTY);
  const [errors, setErrors] = useState<Errors>({});
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs = validateRoutine(draft);
    setErrors(errs);
    if (hasErrors(errs)) return;
    await saveRoutine({ ...draft, daysOfWeek: draft.recurrence === "weekly" ? draft.daysOfWeek : [] });
    setDraft(EMPTY);
  };

  const active = routines.filter((r) => !r.archivedAt);
  const archived = routines.filter((r) => r.archivedAt);

  return (
    <Dialog open={open} onClose={onClose} title="My daily rhythm">
      <form onSubmit={submit} noValidate className="mb-6 flex flex-col gap-3 rounded-2xl bg-tint p-4">
        <p className="text-sm font-medium">{draft.id ? "Edit rhythm" : "Add a rhythm"}</p>
        <Field label="Name" error={errors.name}>
          {(p) => <input {...p} value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} placeholder="e.g. Morning offering" />}
        </Field>
        <Field label="Category">
          {(p) => (
            <select {...p} value={draft.category} onChange={(e) => setDraft({ ...draft, category: e.target.value as RoutineCategory })}>
              {Object.entries(ROUTINE_CATEGORIES).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
          )}
        </Field>
        <fieldset>
          <legend className="mb-1.5 text-sm font-medium">Repeats</legend>
          <div className="flex gap-2">
            <Chip pressed={draft.recurrence === "daily"} onClick={() => setDraft({ ...draft, recurrence: "daily" })}>
              Daily
            </Chip>
            <Chip pressed={draft.recurrence === "weekly"} onClick={() => setDraft({ ...draft, recurrence: "weekly" })}>
              On certain days
            </Chip>
          </div>
        </fieldset>
        {draft.recurrence === "weekly" && (
          <fieldset aria-describedby={errors.daysOfWeek ? "days-err" : undefined}>
            <legend className="mb-1.5 text-sm font-medium">Days</legend>
            <div className="flex flex-wrap gap-1.5">
              {[0, 1, 2, 3, 4, 5, 6].map((d) => (
                <Chip
                  key={d}
                  pressed={draft.daysOfWeek.includes(d)}
                  onClick={() => setDraft({ ...draft, daysOfWeek: draft.daysOfWeek.includes(d) ? draft.daysOfWeek.filter((x) => x !== d) : [...draft.daysOfWeek, d] })}
                >
                  {weekdayShort(d)}
                </Chip>
              ))}
            </div>
            {errors.daysOfWeek && (
              <p id="days-err" role="alert" className="mt-1 text-sm text-warning">
                {errors.daysOfWeek}
              </p>
            )}
          </fieldset>
        )}
        <div className="flex gap-2">
          <Button type="submit">{draft.id ? "Save changes" : "Add rhythm"}</Button>
          {draft.id && (
            <Button variant="ghost" onClick={() => setDraft(EMPTY)}>
              Cancel
            </Button>
          )}
        </div>
      </form>

      <h3 className="mb-2 font-sans text-sm font-semibold">Current rhythms</h3>
      {active.length === 0 && <p className="text-sm text-muted">No rhythms yet. Add one above.</p>}
      <ul className="divide-y divide-line">
        {active.map((r) => (
          <li key={r.id} className="flex items-center gap-2 py-2">
            <div className="min-w-0 flex-1">
              <p className="truncate">
                {r.name} {r.isSample && <span className="ml-1 rounded-full bg-celadon px-2 py-0.5 text-xs">Sample</span>}
              </p>
              <p className="text-sm text-muted">
                {ROUTINE_CATEGORIES[r.category]} · {describeRecurrence(r)}
              </p>
            </div>
            <IconButton label={`Edit ${r.name}`} onClick={() => setDraft({ ...r })}>
              <Pencil size={18} aria-hidden="true" />
            </IconButton>
            <IconButton label={`Archive ${r.name}`} onClick={() => saveRoutine({ ...r, archivedAt: nowIso() })}>
              <Archive size={18} aria-hidden="true" />
            </IconButton>
          </li>
        ))}
      </ul>

      {archived.length > 0 && (
        <>
          <h3 className="mb-2 mt-5 font-sans text-sm font-semibold">Archived</h3>
          <ul className="divide-y divide-line">
            {archived.map((r) => (
              <li key={r.id} className="flex items-center gap-2 py-2">
                <p className="min-w-0 flex-1 truncate text-muted">{r.name}</p>
                <IconButton label={`Restore ${r.name}`} onClick={() => saveRoutine({ ...r, archivedAt: undefined })}>
                  <RotateCcw size={18} aria-hidden="true" />
                </IconButton>
                {confirmDelete === r.id ? (
                  <Button variant="danger" className="px-3" onClick={() => deleteRoutine(r.id).then(() => setConfirmDelete(null))}>
                    Delete for good
                  </Button>
                ) : (
                  <IconButton label={`Delete ${r.name}`} onClick={() => setConfirmDelete(r.id)}>
                    <Trash2 size={18} aria-hidden="true" />
                  </IconButton>
                )}
              </li>
            ))}
          </ul>
        </>
      )}
    </Dialog>
  );
}
