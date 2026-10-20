import { useRef, useState } from "react";
import { Link } from "react-router";
import { ArrowRight, Bell, Database, Download, Palette, Shield, Sun, Upload } from "lucide-react";
import { dataOf, useApp, useStore } from "../../lib/hooks";
import { RoutineManager } from "../today/RoutineManager";
import { Button, Card, CardTitle, Chip, Field } from "../../components/ui";
import { PageHeader } from "../../components/layout/AppShell";
import { isValidTimezone, systemTimezone } from "../../lib/date";
import { deleteAllData, downloadText, exportAll, parseBackup, removeSampleData, restoreBackup } from "../../lib/storage/backup";
import { addSampleData } from "../../data/sample";
import { THEMES } from "../widgets/themes";

export function YouPage() {
  const { settings, updateSettings, today } = useApp();
  const [tz, setTz] = useState(settings.timezone);
  const [name, setName] = useState(settings.displayName ?? "");
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const [confirmWipe, setConfirmWipe] = useState("");
  const [managing, setManaging] = useState(false);
  const routines = useStore("routines");
  const [notifState, setNotifState] = useState(typeof Notification === "undefined" ? "unsupported" : Notification.permission);
  const fileRef = useRef<HTMLInputElement>(null);
  const tzError = isValidTimezone(tz) ? undefined : "That timezone isn't recognized. Try e.g. America/Chicago.";

  const say = (m: string) => {
    setErr("");
    setMsg(m);
  };

  const onImport = async (file: File) => {
    try {
      const backup = parseBackup(await file.text());
      const n = await restoreBackup(backup);
      say(`Restored ${n} records from your backup.`);
    } catch (e) {
      setMsg("");
      setErr(e instanceof Error ? e.message : "Couldn't read that file.");
    } finally {
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <PageHeader eyebrow="You" title="Settings & your data" />
      <div role="status" aria-live="polite">
        {msg && <p className="rounded-2xl bg-[#e9f1ec] px-4 py-3 text-sm text-success">{msg}</p>}
        {err && (
          <p role="alert" className="rounded-2xl bg-[#fbefe6] px-4 py-3 text-sm text-warning">
            {err}
          </p>
        )}
      </div>

      <Card aria-labelledby="privacy-title">
        <CardTitle id="privacy-title" eyebrow="Privacy & sync">
          <span className="inline-flex items-center gap-2">
            <Shield size={20} aria-hidden="true" /> Stored on this device only
          </span>
        </CardTitle>
        <ul className="list-disc space-y-1 pl-5 text-[0.95rem] text-muted">
          <li>Your plans, reflections, gratitude and intentions are saved in this browser's storage (IndexedDB). Nothing is uploaded, analysed or shared, and there's no account.</li>
          <li>Sync between devices is not available yet. Clearing browser data, or using a private window, can erase your entries — download a backup regularly.</li>
          <li>Browser storage isn't encrypted. Anyone using this device and browser profile could open your entries. If the browser's data is cleared or the device is lost, entries can't be recovered unless you kept a backup.</li>
        </ul>
        <p className="mt-3 text-sm">
          Sync status: <strong>Not available in demo</strong>
        </p>
      </Card>

      <Card aria-labelledby="profile-title">
        <CardTitle id="profile-title" eyebrow="Preferences">
          Your days
        </CardTitle>
        <div className="flex flex-col gap-4">
          <Field label="Name (optional)">{(p) => <input {...p} value={name} maxLength={40} onChange={(e) => setName(e.target.value)} onBlur={() => updateSettings({ displayName: name.trim() || undefined })} />}</Field>
          <Field label="Timezone" error={tzError} hint={`Today is ${today} in this timezone. Your device reports ${systemTimezone()}.`}>
            {(p) => <input {...p} value={tz} onChange={(e) => setTz(e.target.value)} onBlur={() => !tzError && updateSettings({ timezone: tz })} />}
          </Field>
          <fieldset>
            <legend className="mb-1.5 text-sm font-medium">Week starts on</legend>
            <div className="flex gap-2">
              <Chip pressed={settings.weekStartsOn === 0} onClick={() => updateSettings({ weekStartsOn: 0 })}>
                Sunday
              </Chip>
              <Chip pressed={settings.weekStartsOn === 1} onClick={() => updateSettings({ weekStartsOn: 1 })}>
                Monday
              </Chip>
            </div>
          </fieldset>
          <fieldset>
            <legend className="mb-1.5 text-sm font-medium">Language</legend>
            <div className="flex gap-2">
              <Chip pressed onClick={() => undefined}>
                English (US)
              </Chip>
              <span className="inline-flex min-h-11 items-center text-sm text-muted">한국어 — coming later</span>
            </div>
          </fieldset>
          <label className="flex min-h-11 items-center gap-3">
            <input type="checkbox" className="h-5 w-5 accent-[var(--hg-ink)]" checked={settings.reducedMotion} onChange={(e) => updateSettings({ reducedMotion: e.target.checked })} />
            Reduce motion (your device setting is also respected)
          </label>
        </div>
      </Card>

      <Card aria-labelledby="routines-title">
        <CardTitle id="routines-title" eyebrow="Optional">
          <span className="inline-flex items-center gap-2">
            <Sun size={20} aria-hidden="true" /> Gentle routines
          </span>
        </CardTitle>
        <p className="mb-3 text-[0.95rem] text-muted">Off by default. When on, Today and Planner show your routines as large cards you can tap to note. There are no scores, completion rates or streaks.</p>
        <label className="flex min-h-11 items-center gap-3">
          <input type="checkbox" role="switch" className="h-5 w-5 accent-[var(--hg-ink)]" checked={settings.routinesEnabled} onChange={(e) => updateSettings({ routinesEnabled: e.target.checked })} />
          Show gentle routines
        </label>
        {settings.routinesEnabled && (
          <Button variant="secondary" className="mt-2" onClick={() => setManaging(true)}>
            Edit routines
          </Button>
        )}
        {managing && <RoutineManager open onClose={() => setManaging(false)} routines={dataOf(routines)} />}
      </Card>

      <Card aria-labelledby="theme-title">
        <CardTitle id="theme-title" eyebrow="Look & feel">
          <span className="inline-flex items-center gap-2">
            <Palette size={20} aria-hidden="true" /> Theme
          </span>
        </CardTitle>
        <div className="flex flex-wrap gap-2">
          {THEMES.filter((t) => t.free).map((t) => (
            <Chip key={t.id} pressed={settings.themeId === t.id} onClick={() => updateSettings({ themeId: t.id as "luminous" | "celadon" })}>
              <span aria-hidden="true" className="h-4 w-4 rounded-full border border-line" style={{ background: t.swatch }} />
              {t.name}
            </Chip>
          ))}
        </div>
        <Link to="/app/you/widgets" className="mt-4 inline-flex min-h-11 items-center gap-1 font-medium text-gold-ink hover:underline">
          Widgets & themes gallery <ArrowRight size={16} aria-hidden="true" />
        </Link>
      </Card>

      <Card aria-labelledby="notif-title">
        <CardTitle id="notif-title" eyebrow="Reminders">
          <span className="inline-flex items-center gap-2">
            <Bell size={20} aria-hidden="true" /> Gentle reminders
          </span>
        </CardTitle>
        <p className="mb-3 text-[0.95rem] text-muted">
          Reminders aren't sent yet: reliable reminders while the app is closed need a server we haven't built. We save your preferred time so they can start, with your consent, when ready. They'll never use guilt or streak warnings.
        </p>
        <Field label="Preferred quiet time">
          {(p) => <input {...p} type="time" value={settings.reminderTime ?? ""} onChange={(e) => updateSettings({ reminderTime: e.target.value || undefined })} />}
        </Field>
        <p className="mt-3 text-sm">
          Browser notification permission: <strong>{notifState}</strong>
        </p>
        {notifState === "default" && (
          <Button variant="secondary" className="mt-2" onClick={() => Notification.requestPermission().then(setNotifState)}>
            Allow notifications for later
          </Button>
        )}
      </Card>

      <Card aria-labelledby="data-title">
        <CardTitle id="data-title" eyebrow="Your data">
          <span className="inline-flex items-center gap-2">
            <Database size={20} aria-hidden="true" /> Backup, restore, delete
          </span>
        </CardTitle>
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap gap-2">
            <Button
              onClick={async () => {
                downloadText(`helena-grace-backup-${today}.json`, JSON.stringify(await exportAll(), null, 2), "application/json");
                say("Backup downloaded. Keep it somewhere safe — it contains your private entries.");
              }}
            >
              <Download size={17} aria-hidden="true" /> Download backup (JSON)
            </Button>
            <Button variant="secondary" onClick={() => fileRef.current?.click()}>
              <Upload size={17} aria-hidden="true" /> Restore from backup
            </Button>
            <input ref={fileRef} type="file" accept="application/json,.json" className="sr-only" aria-label="Choose a backup file" onChange={(e) => e.target.files?.[0] && onImport(e.target.files[0])} />
          </div>
          <p className="text-sm text-muted">The backup keeps every word, line break and emoji. Restoring replaces the entries currently on this device with the backup's contents. CSV exports are in Journal.</p>
          <div className="flex flex-wrap gap-2 border-t border-line pt-3">
            <Button variant="secondary" onClick={() => addSampleData(today).then(() => say("Sample entries added. They're labeled “Sample”."))}>
              Add sample data
            </Button>
            <Button variant="secondary" onClick={() => removeSampleData().then((n) => say(`Removed ${n} sample records. Your own entries were not touched.`))}>
              Remove sample data
            </Button>
          </div>
          <div className="border-t border-line pt-3">
            <label htmlFor="wipe" className="mb-1.5 block text-sm">
              To delete everything on this device, type <strong>DELETE</strong>:
            </label>
            <div className="flex flex-wrap gap-2">
              <input id="wipe" value={confirmWipe} onChange={(e) => setConfirmWipe(e.target.value)} className="min-h-11 rounded-2xl border border-line bg-surface px-4" autoComplete="off" />
              <Button
                variant="danger"
                disabled={confirmWipe !== "DELETE"}
                onClick={async () => {
                  await deleteAllData();
                  setConfirmWipe("");
                  say("All data on this device has been deleted.");
                  await updateSettings({ onboarded: false });
                }}
              >
                Delete all my data
              </Button>
            </div>
          </div>
        </div>
      </Card>

      <Card aria-labelledby="plan-title">
        <CardTitle id="plan-title" eyebrow="Plan">
          Subscription
        </CardTitle>
        <p className="text-[0.95rem]">
          Status: <strong>Free</strong> · Helena Plus: <strong>Not available in demo</strong>
        </p>
        <p className="mt-1 text-sm text-muted">Praying, tracking intentions and journaling will always be free. Nothing can be purchased in this demo.</p>
      </Card>

      <Card aria-labelledby="about-title">
        <CardTitle id="about-title" eyebrow="About">
          Notices
        </CardTitle>
        <ul className="list-disc space-y-1 pl-5 text-sm text-muted">
          <li>Independently created. Not affiliated with or endorsed by any diocese or official Catholic organization.</li>
          <li>Helena Grace is a personal planning companion, not a substitute for the sacraments, your parish, or spiritual direction.</li>
          <li>No official liturgical texts, Scripture translations or prayer texts are included in this version.</li>
          <li>Fonts: Cormorant Garamond and Inter, both under the SIL Open Font License 1.1. Icons: Lucide (ISC License). Brand marks are original SVG.</li>
        </ul>
        <div className="mt-3 flex gap-4 text-sm">
          <Link className="inline-flex min-h-11 items-center text-gold-ink underline" to="/privacy">
            Privacy
          </Link>
          <Link className="inline-flex min-h-11 items-center text-gold-ink underline" to="/terms">
            Terms
          </Link>
          <Link className="inline-flex min-h-11 items-center text-gold-ink underline" to="/">
            Landing page
          </Link>
        </div>
      </Card>
    </div>
  );
}
