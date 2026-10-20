import { useState } from "react";
import { useApp } from "../../lib/hooks";
import { Button, Chip, Dialog, Field } from "../../components/ui";
import { SunMark } from "../../components/ui/Logo";
import { isValidTimezone } from "../../lib/date";
import { saveRoutine } from "../../lib/storage/repos";
import { addSampleData } from "../../data/sample";
import type { RoutineCategory, WeekStart } from "../../data/types";

const STARTERS: { name: string; category: RoutineCategory }[] = [
  { name: "Morning prayer", category: "prayer" },
  { name: "Read Scripture", category: "scripture" },
  { name: "A moment of gratitude", category: "gratitude" },
  { name: "Rosary", category: "prayer" },
  { name: "Evening examen", category: "prayer" },
];

export function Onboarding() {
  const { settings, updateSettings, today } = useApp();
  const [step, setStep] = useState(0);
  const [name, setName] = useState(settings.displayName ?? "");
  const [tz, setTz] = useState(settings.timezone);
  const [weekStartsOn, setWeekStartsOn] = useState<WeekStart>(settings.weekStartsOn);
  const [reminderTime, setReminderTime] = useState(settings.reminderTime ?? "07:30");
  const [picked, setPicked] = useState<string[]>([]);
  const [withSample, setWithSample] = useState(false);
  const [busy, setBusy] = useState(false);
  const tzError = isValidTimezone(tz) ? undefined : "Use a timezone like America/New_York.";

  const finish = async (skip = false) => {
    setBusy(true);
    if (!skip) {
      for (const s of STARTERS.filter((s) => picked.includes(s.name))) {
        await saveRoutine({ name: s.name, category: s.category, recurrence: "daily", daysOfWeek: [] });
      }
      if (withSample) await addSampleData(today);
      await updateSettings({ onboarded: true, routinesEnabled: picked.length > 0, displayName: name.trim() || undefined, timezone: tz, weekStartsOn, reminderTime });
    } else {
      await updateSettings({ onboarded: true });
    }
  };

  return (
    <Dialog open onClose={() => finish(true)} title={["Welcome", "Your days", "Optional routines"][step]}>
      <p className="mb-4 text-sm text-muted" aria-live="polite">
        Step {step + 1} of 3
      </p>
      {step === 0 && (
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <SunMark size={48} />
            <p className="text-muted">A gentle place to plan your days, hold your prayer intentions, and notice grace in the ordinary.</p>
          </div>
          <Field label="What should we call you? (optional)">
            {(p) => <input {...p} value={name} onChange={(e) => setName(e.target.value)} maxLength={40} autoComplete="given-name" />}
          </Field>
          <p className="rounded-2xl bg-tint px-4 py-3 text-sm text-ink">
            Everything you write stays in this browser on this device. There's no account and nothing is uploaded.
          </p>
        </div>
      )}
      {step === 1 && (
        <div className="flex flex-col gap-4">
          <Field label="Timezone" error={tzError} hint="Used to decide when your day begins.">
            {(p) => <input {...p} value={tz} onChange={(e) => setTz(e.target.value)} />}
          </Field>
          <fieldset>
            <legend className="mb-1.5 text-sm font-medium">Week starts on</legend>
            <div className="flex gap-2">
              <Chip pressed={weekStartsOn === 0} onClick={() => setWeekStartsOn(0)}>
                Sunday
              </Chip>
              <Chip pressed={weekStartsOn === 1} onClick={() => setWeekStartsOn(1)}>
                Monday
              </Chip>
            </div>
          </fieldset>
          <Field label="Preferred quiet time" hint="Saved for later. Reminders aren't sent in this demo yet.">
            {(p) => <input {...p} type="time" value={reminderTime} onChange={(e) => setReminderTime(e.target.value)} />}
          </Field>
        </div>
      )}
      {step === 2 && (
        <div className="flex flex-col gap-4">
          <fieldset>
            <legend className="mb-2 text-sm text-muted">
              If it helps, pick a few gentle routines to note with a tap. They're entirely optional — no scores or streaks — and you can skip this and turn them on later in You.
            </legend>
            <div className="flex flex-wrap gap-2">
              {STARTERS.map((s) => (
                <Chip key={s.name} pressed={picked.includes(s.name)} onClick={() => setPicked((p) => (p.includes(s.name) ? p.filter((x) => x !== s.name) : [...p, s.name]))}>
                  {s.name}
                </Chip>
              ))}
            </div>
          </fieldset>
          <label className="flex min-h-11 items-center gap-3 text-sm">
            <input type="checkbox" className="h-5 w-5 accent-[var(--hg-ink)]" checked={withSample} onChange={(e) => setWithSample(e.target.checked)} />
            Also add a few sample entries to explore (clearly marked, removable)
          </label>
        </div>
      )}
      <div className="mt-6 flex flex-wrap items-center justify-between gap-2">
        <Button variant="ghost" onClick={() => finish(true)} disabled={busy}>
          Skip for now
        </Button>
        <div className="flex gap-2">
          {step > 0 && (
            <Button variant="secondary" onClick={() => setStep(step - 1)} disabled={busy}>
              Back
            </Button>
          )}
          {step < 2 ? (
            <Button onClick={() => setStep(step + 1)} disabled={step === 1 && !!tzError}>
              Continue
            </Button>
          ) : (
            <Button onClick={() => finish()} disabled={busy}>
              Begin
            </Button>
          )}
        </div>
      </div>
    </Dialog>
  );
}
