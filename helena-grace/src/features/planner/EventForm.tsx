import { useState } from "react";
import type { EventCategory, LocalDate, PlannerEvent, StickerId } from "../../data/types";
import { Button, Dialog, Field } from "../../components/ui";
import { Sticker } from "../../components/ui/Sticker";
import { EVENT_CATEGORIES, STICKERS } from "../../content/labels";
import { hasErrors, parseTags, validateEvent, type Errors } from "../../lib/validation";
import { eventDate, eventTime, remove, saveEvent } from "../../lib/storage/repos";

interface FormState {
  title: string;
  date: string;
  start: string;
  end: string;
  category: EventCategory;
  repeat: "none" | "daily" | "weekly";
  note: string;
  tags: string;
  sticker: StickerId;
}

function toForm(e: PlannerEvent | undefined, date: LocalDate): FormState {
  if (!e) return { title: "", date, start: "09:00", end: "", category: "personal", repeat: "none", note: "", tags: "", sticker: "none" };
  return {
    title: e.title,
    date: eventDate(e),
    start: eventTime(e),
    end: e.endAt?.slice(11, 16) ?? "",
    category: e.category,
    repeat: e.repeat ?? "none",
    note: e.note ?? "",
    tags: (e.tags ?? []).join(", "),
    sticker: e.sticker ?? "none",
  };
}

export function EventForm({ event, date, open, onClose }: { event?: PlannerEvent; date: LocalDate; open: boolean; onClose: () => void }) {
  const [f, setF] = useState<FormState>(() => toForm(event, date));
  const [errors, setErrors] = useState<Errors>({});
  const [confirmDelete, setConfirmDelete] = useState(false);
  const set = <K extends keyof FormState>(k: K, v: FormState[K]) => setF((s) => ({ ...s, [k]: v }));

  const submit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    const errs = validateEvent(f);
    setErrors(errs);
    if (hasErrors(errs)) return;
    await saveEvent({
      ...(event ?? { completed: false }),
      id: event?.id,
      title: f.title,
      startAt: `${f.date}T${f.start}`,
      endAt: f.end ? `${f.date}T${f.end}` : undefined,
      category: f.category,
      repeat: f.repeat,
      note: f.note.trim() || undefined,
      tags: parseTags(f.tags),
      sticker: f.sticker,
      completed: event?.completed ?? false,
    });
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} title={event ? "Edit plan" : "New plan"}>
      <form onSubmit={submit} noValidate className="flex flex-col gap-3">
        <Field label="Title" error={errors.title}>
          {(p) => <input {...p} value={f.title} onChange={(e) => set("title", e.target.value)} autoFocus />}
        </Field>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Field label="Date" error={errors.date}>
            {(p) => <input {...p} type="date" value={f.date} onChange={(e) => set("date", e.target.value)} />}
          </Field>
          <Field label="Starts" error={errors.start}>
            {(p) => <input {...p} type="time" value={f.start} onChange={(e) => set("start", e.target.value)} />}
          </Field>
          <Field label="Ends (optional)" error={errors.end}>
            {(p) => <input {...p} type="time" value={f.end} onChange={(e) => set("end", e.target.value)} />}
          </Field>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Category">
            {(p) => (
              <select {...p} value={f.category} onChange={(e) => set("category", e.target.value as EventCategory)}>
                {Object.entries(EVENT_CATEGORIES).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v.label}
                  </option>
                ))}
              </select>
            )}
          </Field>
          <Field label="Repeats">
            {(p) => (
              <select {...p} value={f.repeat} onChange={(e) => set("repeat", e.target.value as FormState["repeat"])}>
                <option value="none">Does not repeat</option>
                <option value="daily">Every day</option>
                <option value="weekly">Every week</option>
              </select>
            )}
          </Field>
        </div>
        <Field label="Note (optional)" error={errors.note}>
          {(p) => <textarea {...p} rows={2} value={f.note} onChange={(e) => set("note", e.target.value)} />}
        </Field>
        <Field label="Tags (optional)" hint="Separate with commas, e.g. family, parish">
          {(p) => <input {...p} value={f.tags} onChange={(e) => set("tags", e.target.value)} />}
        </Field>
        <fieldset>
          <legend className="mb-1.5 text-sm font-medium">Sticker</legend>
          <div className="flex flex-wrap gap-1.5">
            {(Object.keys(STICKERS) as StickerId[]).map((s) => (
              <button
                key={s}
                type="button"
                aria-pressed={f.sticker === s}
                aria-label={STICKERS[s]}
                onClick={() => set("sticker", s)}
                className={`flex h-11 min-w-11 items-center justify-center rounded-full border px-2 text-xs ${f.sticker === s ? "border-ink bg-tint" : "border-line"}`}
              >
                {s === "none" ? "None" : <Sticker id={s} size={20} />}
              </button>
            ))}
          </div>
        </fieldset>
        <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
          <div className="flex gap-2">
            {event &&
              (confirmDelete ? (
                <Button variant="danger" onClick={() => remove("events", event.id).then(onClose)}>
                  Confirm delete
                </Button>
              ) : (
                <Button variant="danger" onClick={() => setConfirmDelete(true)}>
                  Delete
                </Button>
              ))}
            {event && (
              <Button variant="ghost" onClick={() => saveEvent({ ...event, cancelled: !event.cancelled }).then(onClose)}>
                {event.cancelled ? "Restore plan" : "Mark as cancelled"}
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={onClose}>
              Close
            </Button>
            <Button type="submit">Save</Button>
          </div>
        </div>
      </form>
    </Dialog>
  );
}
