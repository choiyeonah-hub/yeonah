import type { EventCategory, Mood, RoutineCategory, StickerId } from "../data/types";

export const ROUTINE_CATEGORIES: Record<RoutineCategory, string> = {
  prayer: "Prayer",
  mass: "Mass & Adoration",
  scripture: "Scripture",
  gratitude: "Gratitude",
  personal: "Personal",
};

export const EVENT_CATEGORIES: Record<EventCategory, { label: string; dot: string }> = {
  personal: { label: "Personal", dot: "var(--hg-sage)" },
  prayer: { label: "Prayer", dot: "var(--hg-gold)" },
  mass: { label: "Mass & Adoration", dot: "#c79a95" },
  gratitude: { label: "Gratitude", dot: "#e2b77d" },
  intentions: { label: "Intentions", dot: "#9fbcc0" },
};

export const STICKERS: Record<StickerId, string> = {
  none: "No sticker",
  sun: "Sun",
  flower: "Flower",
  star: "Star",
  ribbon: "Ribbon",
  bead: "Bead",
};

export const MOODS: Record<Mood, string> = {
  peaceful: "Peaceful",
  grateful: "Grateful",
  hopeful: "Hopeful",
  tired: "Tired",
  heavy: "Heavy-hearted",
};
