import { useRef, type ReactNode } from "react";
import type { LocalDate, WeekStart } from "../../data/types";
import { addDays, formatLong, monthGrid, sameMonth, weekdayShort } from "../../lib/date";

/**
 * Accessible month grid (ARIA grid pattern): one tab stop, arrow keys move by day/week,
 * Home/End jump within the week, Enter/Space selects.
 */
export function CalendarGrid({
  month,
  selected,
  today,
  weekStartsOn,
  onSelect,
  renderDay,
  label,
}: {
  month: LocalDate;
  selected: LocalDate;
  today: LocalDate;
  weekStartsOn: WeekStart;
  onSelect: (d: LocalDate) => void;
  renderDay: (d: LocalDate) => ReactNode;
  label: string;
}) {
  const days = monthGrid(month, weekStartsOn);
  const ref = useRef<HTMLDivElement>(null);
  const focusable = days.includes(selected) ? selected : days.find((d) => sameMonth(d, month))!;

  const move = (to: LocalDate) => {
    onSelect(to);
    requestAnimationFrame(() => ref.current?.querySelector<HTMLElement>(`[data-day="${to}"]`)?.focus());
  };

  const onKey = (e: React.KeyboardEvent, d: LocalDate) => {
    const pos = days.indexOf(d) % 7;
    const map: Record<string, number> = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7, Home: -pos, End: 6 - pos };
    if (e.key in map) {
      e.preventDefault();
      move(addDays(d, map[e.key]));
    }
  };

  const rows = Array.from({ length: 6 }, (_, r) => days.slice(r * 7, r * 7 + 7));
  return (
    <div ref={ref} role="grid" aria-label={label} className="w-full">
      <div role="row" className="grid grid-cols-7 text-center text-xs font-medium text-muted">
        {rows[0].map((d, i) => (
          <div role="columnheader" key={d} className="py-1">
            {weekdayShort((weekStartsOn + i) % 7)}
          </div>
        ))}
      </div>
      {rows.map((row, i) => (
        <div role="row" key={i} className="grid grid-cols-7 gap-1">
          {row.map((d) => {
            const inMonth = sameMonth(d, month);
            const isSel = d === selected;
            return (
              <div role="gridcell" key={d} aria-selected={isSel}>
                <button
                  type="button"
                  data-day={d}
                  tabIndex={d === focusable ? 0 : -1}
                  aria-label={`${formatLong(d)}${d === today ? ", today" : ""}`}
                  aria-current={d === today ? "date" : undefined}
                  onClick={() => onSelect(d)}
                  onKeyDown={(e) => onKey(e, d)}
                  className={`flex min-h-12 w-full flex-col items-center justify-start rounded-xl border pt-1 text-sm transition-colors ${
                    isSel ? "border-ink bg-ink text-white" : d === today ? "border-gold bg-surface" : "border-transparent hover:bg-tint"
                  } ${inMonth ? "" : "opacity-45"}`}
                >
                  <span aria-hidden="true">{Number(d.slice(8))}</span>
                  {renderDay(d)}
                </button>
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}
