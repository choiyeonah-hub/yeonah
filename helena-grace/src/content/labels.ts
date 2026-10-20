import type { EventCategory, RoutineCategory, StickerId } from "../data/types";

export const ROUTINE_CATEGORIES: Record<RoutineCategory, string> = {
  prayer: "Prayer",
  mass: "Mass & Adoration",
  scripture: "Scripture",
  gratitude: "Gratitude",
  personal: "Personal",
};

export const EVENT_CATEGORIES: Record<EventCategory, { label: string; dot: string }> = {
  personal: { label: "Personal", dot: "#aebdae" },
  prayer: { label: "Prayer", dot: "#d6ac71" },
  mass: { label: "Mass & Adoration", dot: "#c79a95" },
  intentions: { label: "Intentions", dot: "#9fbcc0" },
  reflection: { label: "Reflection", dot: "#b9a4c4" },
};

/** Colours a user can pick for a category (all decorative; labels always carry the meaning). */
export const CATEGORY_COLORS = ["#aebdae", "#d6ac71", "#c79a95", "#9fbcc0", "#b9a4c4", "#ebc9c7", "#8a9bb0"];

export const STICKERS: Record<StickerId, string> = {
  none: "No sticker",
  sun: "Sun",
  flower: "Flower",
  star: "Star",
  ribbon: "Ribbon",
  bead: "Bead",
};
