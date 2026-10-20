/** Local calendar day in the user's timezone, formatted yyyy-mm-dd. */
export type LocalDate = string;

export type RoutineCategory = "prayer" | "mass" | "scripture" | "gratitude" | "personal";
export type EventCategory = "personal" | "prayer" | "mass" | "intentions" | "reflection";
export type Mystery = "joyful" | "sorrowful" | "glorious" | "luminous";
export type WeekStart = 0 | 1; // 0 = Sunday, 1 = Monday

/** Every user record carries `isSample` so demo data can be removed without touching real data. */
interface Base {
  id: string;
  isSample?: boolean;
}

export interface Routine extends Base {
  name: string;
  recurrence: "daily" | "weekly";
  /** Used when recurrence is weekly; 0 = Sunday … 6 = Saturday. */
  daysOfWeek: number[];
  category: RoutineCategory;
  createdAt: string;
  archivedAt?: string;
}

export interface RoutineCompletion extends Base {
  routineId: string;
  localDate: LocalDate;
  completedAt: string;
}

export interface PlannerEvent extends Base {
  title: string;
  /** Wall-clock time "yyyy-mm-ddTHH:mm" (no offset): 9am Mass stays 9am wherever you are. */
  startAt: string;
  endAt?: string;
  category: EventCategory;
  repeat?: "none" | "daily" | "weekly";
  note?: string;
  tags?: string[];
  sticker?: StickerId;
  /** Completion for one-off events. */
  completed: boolean;
  /** Completion per occurrence for repeating events. */
  completedDates?: LocalDate[];
  cancelled?: boolean;
}

export type StickerId = "none" | "sun" | "flower" | "star" | "ribbon" | "bead";

export interface Intention extends Base {
  text: string;
  /** Optional long note — no length limit. */
  note?: string;
  isPrivate: boolean;
  createdAt: string;
  archivedAt?: string;
  /** Set only when the user chooses to mark it answered. The app never judges this. */
  resolvedAt?: string;
  tags?: string[];
}

export interface RosarySession extends Base {
  mystery: Mystery;
  /** 0–4 */
  decadeIndex: number;
  /** 0–10 beads counted in the current decade. */
  beadIndex: number;
  intentionId?: string;
  startedAt: string;
  updatedAt: string;
  pausedAt?: string;
  completedAt?: string;
  localDate: LocalDate;
}

/** Long-form reflection. Several per day are allowed; the body has no length limit. */
export interface JournalEntry extends Base {
  localDate: LocalDate;
  title?: string;
  body: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

/** A free-form note of gratitude. Any number per day, none required. */
export interface GratitudeEntry extends Base {
  localDate: LocalDate;
  text: string;
  createdAt: string;
  updatedAt: string;
}

export type SaveStatus = "idle" | "saving" | "saved" | "error";

/** Autosave state of the entry being written (editor state; "Continue writing" uses the latest updatedAt). */
export interface DraftState {
  entryId: string;
  lastSavedAt?: string;
  saveStatus: SaveStatus;
}

export interface DayNote extends Base {
  /** id === localDate */
  localDate: LocalDate;
  text: string;
  updatedAt: string;
}

export interface WeekReview extends Base {
  /** id === first day of week */
  weekStart: LocalDate;
  text: string;
  updatedAt: string;
}

export type ThemeId = "luminous" | "celadon";

export interface ThemePreference {
  themeId: ThemeId;
  reducedMotion: boolean;
  weekStartsOn: WeekStart;
  timezone: string;
}

export interface CategoryPref {
  color: string;
  visible: boolean;
}

export interface Settings extends ThemePreference {
  onboarded: boolean;
  /** Routines are opt-in; when off, no routine UI appears anywhere. */
  routinesEnabled: boolean;
  categoryPrefs?: Partial<Record<EventCategory, CategoryPref>>;
  /** Gratitude entry the user chose to show in the Grace Note widget/share card. */
  graceNoteId?: string;
  displayName?: string;
  /** Preferred reminder time, stored only. Reminders are not delivered in this MVP. */
  reminderTime?: string;
}
