import type { Mystery } from "../data/types";

/**
 * Pure counter logic for a five-decade Rosary: 5 decades × 10 beads.
 * Prayer texts are intentionally not bundled (licensing review pending) —
 * the UI guides by position and intention only.
 */
export const DECADES = 5;
export const BEADS_PER_DECADE = 10;

export interface Position {
  decadeIndex: number;
  beadIndex: number;
}

export function advance(p: Position): Position {
  if (p.beadIndex < BEADS_PER_DECADE) return { ...p, beadIndex: p.beadIndex + 1 };
  if (p.decadeIndex < DECADES - 1) return { decadeIndex: p.decadeIndex + 1, beadIndex: 0 };
  return p;
}

export function back(p: Position): Position {
  if (p.beadIndex > 0) return { ...p, beadIndex: p.beadIndex - 1 };
  if (p.decadeIndex > 0) return { decadeIndex: p.decadeIndex - 1, beadIndex: BEADS_PER_DECADE };
  return p;
}

export function isFinished(p: Position): boolean {
  return p.decadeIndex === DECADES - 1 && p.beadIndex === BEADS_PER_DECADE;
}

export function isDecadeDone(p: Position): boolean {
  return p.beadIndex === BEADS_PER_DECADE;
}

/** Beads counted across the whole Rosary, 0–50. */
export function totalCounted(p: Position): number {
  return p.decadeIndex * BEADS_PER_DECADE + p.beadIndex;
}

/**
 * A widely used weekday pattern, offered only as a starting suggestion.
 * Practice varies by season and community, so the user always chooses.
 */
const WEEKDAY_SUGGESTION: Mystery[] = ["glorious", "joyful", "sorrowful", "glorious", "luminous", "sorrowful", "joyful"];

export function suggestedMystery(weekdayIndex: number): Mystery {
  return WEEKDAY_SUGGESTION[weekdayIndex];
}

export interface MysteryInfo {
  id: Mystery;
  label: string;
  decades: [string, string, string, string, string];
}

/** Traditional mystery titles (short names only). Source/licensing tracked in docs/RIGHTS_AND_COMPLIANCE.md. */
export const MYSTERIES: Record<Mystery, MysteryInfo> = {
  joyful: {
    id: "joyful",
    label: "Joyful",
    decades: ["The Annunciation", "The Visitation", "The Nativity", "The Presentation in the Temple", "The Finding in the Temple"],
  },
  sorrowful: {
    id: "sorrowful",
    label: "Sorrowful",
    decades: ["The Agony in the Garden", "The Scourging at the Pillar", "The Crowning with Thorns", "The Carrying of the Cross", "The Crucifixion"],
  },
  glorious: {
    id: "glorious",
    label: "Glorious",
    decades: ["The Resurrection", "The Ascension", "The Descent of the Holy Spirit", "The Assumption", "The Coronation of Mary"],
  },
  luminous: {
    id: "luminous",
    label: "Luminous",
    decades: ["The Baptism of the Lord", "The Wedding at Cana", "The Proclamation of the Kingdom", "The Transfiguration", "The Institution of the Eucharist"],
  },
};
