import { useState } from "react";
import { Minus, Pause, Play, Plus, Check } from "lucide-react";
import type { Mystery, RosarySession } from "../../data/types";
import { dataOf, useApp, useStore } from "../../lib/hooks";
import { Button, Card, CardTitle, ErrorNote, Loading } from "../../components/ui";
import { PageHeader } from "../../components/layout/AppShell";
import { formatLong, weekday } from "../../lib/date";
import { BEADS_PER_DECADE, DECADES, MYSTERIES, advance, back, isDecadeDone, isFinished, suggestedMystery, totalCounted } from "../../lib/rosary";
import { activeSession, remove, startRosary, updateRosary } from "../../lib/storage/repos";
import { nowIso } from "../../lib/storage/db";

/*
 * DEV NOTE: Prayer text requires licensing review. The Rosary flow intentionally ships
 * without bundled English prayer texts or audio; it keeps the user's place and intention only.
 */

export function RosaryPage() {
  const sessions = useStore("rosary");
  const intentions = useStore("intentions");
  if (sessions.status === "error") return <ErrorNote message={sessions.error} />;
  if (sessions.status === "loading") return <Loading />;
  const active = activeSession(sessions.data);
  const completed = sessions.data.filter((s) => s.completedAt).sort((a, b) => b.completedAt!.localeCompare(a.completedAt!));
  const intentionText = (id?: string) => dataOf(intentions).find((i) => i.id === id)?.text;

  return (
    <div className="flex flex-col gap-4">
      <PageHeader eyebrow="Rosary" title={active ? "Take your time" : "A moment with Mary"} />
      {active ? <ActiveRosary key={active.id} session={active} intention={intentionText(active.intentionId)} /> : <StartRosary />}

      <Card aria-labelledby="rosary-history">
        <CardTitle id="rosary-history">Prayed Rosaries</CardTitle>
        {completed.length === 0 ? (
          <p className="text-muted">When you complete a Rosary, it will be gently noted here.</p>
        ) : (
          <ul className="divide-y divide-line">
            {completed.slice(0, 10).map((s) => (
              <li key={s.id} className="py-2">
                <p>
                  {MYSTERIES[s.mystery].label} Mysteries <span className="text-muted">· {formatLong(s.localDate)}</span>
                </p>
                {intentionText(s.intentionId) && <p className="text-sm text-muted">For: {intentionText(s.intentionId)}</p>}
              </li>
            ))}
          </ul>
        )}
      </Card>
      <p className="text-sm text-muted">
        Prayer texts aren't included yet while we complete a rights review. Pray from memory or your own prayer book — Helena Grace keeps your place and your intention.
      </p>
    </div>
  );
}

function StartRosary() {
  const { today } = useApp();
  const intentions = useStore("intentions");
  const suggested = suggestedMystery(weekday(today));
  const [mystery, setMystery] = useState<Mystery>(suggested);
  const [intentionId, setIntentionId] = useState("");
  const open = dataOf(intentions).filter((i) => !i.archivedAt && !i.resolvedAt);

  return (
    <Card aria-labelledby="start-title">
      <CardTitle id="start-title">Choose the mysteries</CardTitle>
      <p className="mb-3 text-sm text-muted">
        Suggested for today: <strong className="font-medium text-ink">{MYSTERIES[suggested].label}</strong>. This follows a common weekday pattern; seasons and local customs vary, so choose what fits your practice.
      </p>
      <fieldset className="mb-4">
        <legend className="sr-only">Mysteries</legend>
        <div className="grid grid-cols-2 gap-2">
          {(Object.keys(MYSTERIES) as Mystery[]).map((m) => (
            <label key={m} className={`flex min-h-14 cursor-pointer items-center gap-3 rounded-2xl border px-4 ${mystery === m ? "border-ink bg-tint" : "border-line"}`}>
              <input type="radio" name="mystery" value={m} checked={mystery === m} onChange={() => setMystery(m)} className="h-5 w-5 accent-[var(--hg-ink)]" />
              <span className="font-display text-xl">{MYSTERIES[m].label}</span>
            </label>
          ))}
        </div>
      </fieldset>
      <label htmlFor="rosary-intention" className="mb-1.5 block text-sm font-medium">
        Offer it for an intention (optional)
      </label>
      <select
        id="rosary-intention"
        value={intentionId}
        onChange={(e) => setIntentionId(e.target.value)}
        className="mb-4 w-full rounded-2xl border border-line bg-surface px-4 py-2.5"
      >
        <option value="">No specific intention</option>
        {open.map((i) => (
          <option key={i.id} value={i.id}>
            {i.text.slice(0, 80)}
          </option>
        ))}
      </select>
      <Button onClick={() => startRosary(mystery, today, intentionId || undefined)}>Begin the Rosary</Button>
    </Card>
  );
}

function ActiveRosary({ session, intention }: { session: RosarySession; intention?: string }) {
  const [s, setS] = useState(session);
  const [confirmEnd, setConfirmEnd] = useState(false);
  const info = MYSTERIES[s.mystery];
  const paused = !!s.pausedAt;
  const finished = isFinished(s);

  const update = async (patch: Partial<RosarySession>) => setS(await updateRosary(s, patch));
  const onAdvance = () => update(advance(s));
  const onBack = () => update(back(s));

  return (
    <Card aria-labelledby="active-title">
      <p className="text-xs font-medium uppercase tracking-[0.14em] text-gold-ink">{info.label} Mysteries</p>
      <h2 id="active-title" className="mb-1 text-3xl">
        {finished ? "All five decades prayed" : `Decade ${s.decadeIndex + 1}: ${info.decades[s.decadeIndex]}`}
      </h2>
      {intention && <p className="mb-3 text-muted">Offered for: {intention}</p>}

      <ol className="my-4 grid grid-cols-5 gap-1.5" aria-label="Decades">
        {Array.from({ length: DECADES }, (_, i) => {
          const state = i < s.decadeIndex || (i === s.decadeIndex && isDecadeDone(s)) ? "done" : i === s.decadeIndex ? "current" : "upcoming";
          return (
            <li key={i} className="flex flex-col items-center gap-1 text-xs text-muted">
              <span
                aria-hidden="true"
                className={`h-2 w-full rounded-full ${state === "done" ? "bg-gold" : state === "current" ? "bg-gold/40 ring-1 ring-gold" : "bg-line"}`}
              />
              <span>
                {i + 1}
                <span className="sr-only"> {state}</span>
              </span>
            </li>
          );
        })}
      </ol>

      <div className="mb-2 flex flex-wrap justify-center gap-2" aria-hidden="true">
        {Array.from({ length: BEADS_PER_DECADE }, (_, i) => (
          <span key={i} className={`h-6 w-6 rounded-full border-2 transition-colors ${i < s.beadIndex ? "border-gold bg-gold" : "border-gold/50 bg-surface"}`} />
        ))}
      </div>
      <p role="status" aria-live="polite" className="mb-4 text-center text-muted">
        {paused ? "Paused. Your place is saved." : `Bead ${s.beadIndex} of ${BEADS_PER_DECADE} · ${totalCounted(s)} of 50 in all`}
      </p>

      {paused ? (
        <div className="flex justify-center">
          <Button onClick={() => update({ pausedAt: undefined })}>
            <Play size={18} aria-hidden="true" /> Resume
          </Button>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-3">
          {finished ? (
            <Button onClick={() => update({ completedAt: nowIso() })} className="min-h-14 px-8 text-base">
              <Check size={20} aria-hidden="true" /> Complete
            </Button>
          ) : (
            <Button onClick={onAdvance} className="min-h-16 w-full max-w-xs text-lg">
              <Plus size={22} aria-hidden="true" /> {isDecadeDone(s) ? "Next decade" : "+1 bead"}
            </Button>
          )}
          <div className="flex flex-wrap justify-center gap-2">
            <Button variant="secondary" onClick={onBack} disabled={totalCounted(s) === 0}>
              <Minus size={18} aria-hidden="true" /> Back
            </Button>
            <Button variant="secondary" onClick={() => update({ pausedAt: nowIso() })}>
              <Pause size={18} aria-hidden="true" /> Pause
            </Button>
          </div>
        </div>
      )}

      <div className="mt-6 border-t border-line pt-3 text-center">
        {confirmEnd ? (
          <span className="inline-flex flex-wrap items-center justify-center gap-2 text-sm">
            End without saving this Rosary?
            <Button variant="danger" onClick={() => remove("rosary", s.id)}>
              End
            </Button>
            <Button variant="ghost" onClick={() => setConfirmEnd(false)}>
              Keep going
            </Button>
          </span>
        ) : (
          <Button variant="ghost" className="text-sm text-muted" onClick={() => setConfirmEnd(true)}>
            End this session
          </Button>
        )}
      </div>
    </Card>
  );
}
