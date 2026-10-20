import { useState } from "react";
import { Lock } from "lucide-react";
import { Button, Field } from "../../components/ui";
import { hasErrors, validateIntention } from "../../lib/validation";
import { saveIntention } from "../../lib/storage/repos";

/** Intentions are private by default; "private" means never included in share images or widgets. */
export function IntentionForm({ onSaved }: { onSaved?: () => void }) {
  const [text, setText] = useState("");
  const [note, setNote] = useState("");
  const [isPrivate, setIsPrivate] = useState(true);
  const [error, setError] = useState<string>();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs = validateIntention(text);
    setError(errs.text);
    if (hasErrors(errs)) return;
    await saveIntention({ text, note: note.trim() ? note : undefined, isPrivate });
    setText("");
    setNote("");
    onSaved?.();
  };

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-3">
      <Field label="Prayer intention" error={error}>
        {(p) => <input {...p} value={text} onChange={(e) => setText(e.target.value)} placeholder="For…" />}
      </Field>
      <Field label="Anything more you'd like to hold (optional)" hint="Write as much as you need.">
        {(p) => <textarea {...p} rows={4} value={note} onChange={(e) => setNote(e.target.value)} className={`${p.className} leading-relaxed`} />}
      </Field>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <label className="flex min-h-11 items-center gap-2 text-sm text-muted">
          <input type="checkbox" className="h-5 w-5 accent-[var(--hg-ink)]" checked={isPrivate} onChange={(e) => setIsPrivate(e.target.checked)} />
          <Lock size={14} aria-hidden="true" /> Keep private (never shown in widgets or share cards)
        </label>
        <Button type="submit">Save intention</Button>
      </div>
    </form>
  );
}
