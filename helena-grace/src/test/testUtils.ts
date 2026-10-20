import { todayKey } from "../lib/date";
export { saveEvent, saveGratitude, saveIntention, saveJournalEntry, saveRoutine } from "../lib/storage/repos";

/** "Today" as the app computes it in tests (renderApp uses America/New_York). */
export function todayKeyForTests(): string {
  return todayKey("America/New_York");
}

/** 3,000+ characters with paragraphs, emoji, quotes, commas, and symbols. */
export const LONG_TEXT = Array.from(
  { length: 12 },
  (_, i) =>
    `Paragraph ${i + 1}: Lord, I bring You the noise of this day — the "urgent" emails, the 3 a.m. worries, the quiet joy of coffee ☕️ with Anna. ` +
    `Teach me to rest, to listen, & to begin again; let me notice grace in small things 🌿✨ (even when it's hard, even when I'm tired).\n` +
    `=SUM(not a formula) · ü é ñ — 祈り 기도`,
).join("\n\n");
