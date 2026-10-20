import { SunMark } from "../../components/ui/Logo";
import { Sticker } from "../../components/ui/Sticker";

/** Static, decorative mini-screens for the landing page (illustrative, not live data). */

function Phone({ children, label }: { children: React.ReactNode; label: string }) {
  return (
    <figure className="m-0 shrink-0 snap-center">
      <div aria-hidden="true" className="w-[220px] rounded-[34px] border border-line bg-surface p-2.5 shadow-[0_18px_40px_-18px_rgb(37_54_69/0.25)]">
        <div className="h-[400px] overflow-hidden rounded-[26px] bg-bg px-3.5 pt-4 text-[11px] leading-snug text-ink">{children}</div>
      </div>
      <figcaption className="mt-3 text-center font-display text-lg">{label}</figcaption>
    </figure>
  );
}

const mini = "rounded-2xl border border-line bg-surface p-2.5";

export function TodayMock() {
  return (
    <Phone label="Today">
      <div className="flex items-center gap-2">
        <SunMark size={22} />
        <span className="text-muted">Tuesday, May 12</span>
      </div>
      <p className="mt-1 text-muted">Good evening, Clare.</p>
      <p className="font-display text-[22px] leading-tight">A little light for today</p>
      <div className={`${mini} mt-3`}>
        <p className="font-display text-[15px]">Today's plans</p>
        {[
          ["8:30 AM", "Coffee with Anna"],
          ["6:00 PM", "Evening Mass"],
          ["7:00 PM", "Call Mom"],
        ].map(([t, n]) => (
          <p key={n} className="mt-1 flex gap-2">
            <span className="w-11 text-muted">{t}</span>
            {n}
          </p>
        ))}
      </div>
      <div className={`${mini} mt-2`}>
        <p className="font-display text-[15px]">Prayer intentions</p>
        <p className="mt-1 rounded-lg bg-tint px-2 py-1">For my grandmother's recovery</p>
      </div>
      <div className={`${mini} mt-2`}>
        <p className="text-[9px] uppercase tracking-widest text-gold-ink">Continue writing</p>
        <p className="font-display text-[15px]">A slower evening</p>
        <p className="text-muted">last saved 9:14 PM</p>
      </div>
    </Phone>
  );
}

export function PlannerMock() {
  const days = ["S", "M", "T", "W", "T", "F", "S"];
  return (
    <Phone label="Weekly Planner">
      <p className="font-display text-[22px]">Week of May 10</p>
      <div className="mt-2 grid grid-cols-7 gap-1">
        {days.map((d, i) => (
          <div key={i} className={`rounded-xl py-1.5 text-center ${i === 2 ? "bg-ink text-white" : "border border-line bg-surface"}`}>
            <div className="text-[9px]">{d}</div>
            <div className="font-display text-[14px]">{10 + i}</div>
          </div>
        ))}
      </div>
      <div className={`${mini} mt-3 space-y-2`}>
        {[
          ["8:30 AM", "Coffee with Anna", "flower"],
          ["12:10 PM", "Midday pause", "sun"],
          ["6:00 PM", "Adoration", "star"],
          ["7:00 PM", "Call Mom", "ribbon"],
        ].map(([t, n, s]) => (
          <div key={n} className="flex items-center gap-2">
            <span className="w-12 text-muted">{t}</span>
            <span className="flex-1">{n}</span>
            <Sticker id={s as "sun"} size={13} />
          </div>
        ))}
      </div>
      <div className={`${mini} mt-2`}>
        <p className="font-display text-[15px]">My gentle week</p>
        <p className="text-muted">9 rhythm moments · 4 days of graces</p>
      </div>
    </Phone>
  );
}

export function RosaryMock() {
  return (
    <Phone label="Rosary">
      <p className="text-[9px] uppercase tracking-widest text-gold-ink">Luminous Mysteries</p>
      <p className="font-display text-[20px] leading-tight">Decade 2: The Wedding at Cana</p>
      <p className="mt-1 text-muted">Offered for: my grandmother</p>
      <div className="mt-4 grid grid-cols-5 gap-1">
        {[1, 1, 0.4, 0, 0].map((v, i) => (
          <span key={i} className={`h-1.5 rounded-full ${v === 1 ? "bg-gold" : v ? "bg-gold/40" : "bg-line"}`} />
        ))}
      </div>
      <div className="mt-6 flex flex-wrap justify-center gap-1.5">
        {Array.from({ length: 10 }, (_, i) => (
          <span key={i} className={`h-4 w-4 rounded-full border-2 ${i < 6 ? "border-gold bg-gold" : "border-gold/50"}`} />
        ))}
      </div>
      <p className="mt-3 text-center text-muted">Bead 6 of 10</p>
      <div className="mx-auto mt-5 w-36 rounded-full bg-ink py-3 text-center text-[13px] text-white">+1 bead</div>
      <div className="mt-2 flex justify-center gap-2">
        <span className="rounded-full border border-gold/70 px-3 py-1.5">Back</span>
        <span className="rounded-full border border-gold/70 px-3 py-1.5">Pause</span>
      </div>
    </Phone>
  );
}

export function JournalMock() {
  return (
    <Phone label="Journal">
      <p className="text-[9px] uppercase tracking-widest text-gold-ink">Monday, May 11</p>
      <p className="mt-1 border-b border-line pb-1.5 font-display text-[20px] leading-tight">A slower evening</p>
      <div className="mt-2.5 space-y-2 text-[11.5px] leading-[1.65]">
        <p>The afternoon felt rushed. Three meetings back to back, and I noticed how quickly I stopped breathing deeply.</p>
        <p>But the evening was different. I walked home the long way, past the church, and sat on the steps for a few minutes. Nothing dramatic happened. It was just quiet, and that was enough.</p>
        <p>
          I want to remember that I don't have to earn rest<span className="ml-px inline-block h-3 w-px translate-y-0.5 bg-ink" />
        </p>
      </div>
      <p className="mt-3 text-[10px] text-muted">Saved locally · 9:14 PM · 128 words</p>
    </Phone>
  );
}
