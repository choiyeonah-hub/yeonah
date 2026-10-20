export interface ThemeInfo {
  id: string;
  name: string;
  swatch: string;
  free: boolean;
  description: string;
}

/** Two free themes ship now. Premium packs are concepts only — not purchasable. */
export const THEMES: ThemeInfo[] = [
  { id: "luminous", name: "Luminous", swatch: "#FCF9F3", free: true, description: "Warm ivory with gold light." },
  { id: "celadon", name: "Celadon Morning", swatch: "#E6EFF0", free: true, description: "A quiet celadon wash, inspired by Korean porcelain." },
  { id: "korean-chapel", name: "Korean Chapel", swatch: "#D4E3E5", free: false, description: "Hanji texture, celadon and restrained dancheong accents." },
  { id: "sunday-atelier", name: "Sunday Atelier", swatch: "#EBC9C7", free: false, description: "Small stars, flowers and ribbon bookmarks." },
  { id: "advent-rose", name: "Advent Rose", swatch: "#E3C3CF", free: false, description: "Seasonal palette; content pending theological review." },
  { id: "lent-light", name: "Lent & Light", swatch: "#C9C2D6", free: false, description: "Seasonal palette; content pending theological review." },
];
