// WCAG 2.x contrast for text-bearing token pairs. Sun Gold (#D6AC71) is decorative only and excluded on purpose.
function lum(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
const ratio = (a: string, b: string) => {
  const [x, y] = [lum(a), lum(b)].sort((m, n) => n - m);
  return (x + 0.05) / (y + 0.05);
};

describe("token contrast (AA, 4.5:1 for body text)", () => {
  const pairs: [string, string, string][] = [
    ["ink on ivory", "#253645", "#FCF9F3"],
    ["muted on ivory", "#626B71", "#FCF9F3"],
    ["muted on tint", "#626B71", "#F6EFE3"],
    ["gold-ink on ivory", "#8A6430", "#FCF9F3"],
    ["success on surface", "#426A56", "#FFFEFC"],
    ["warning on surface", "#955D31", "#FFFEFC"],
    ["white on ink", "#FFFFFF", "#253645"],
    ["muted on celadon theme bg", "#626B71", "#F5F8F7"],
  ];
  it.each(pairs)("%s", (_n, fg, bg) => expect(ratio(fg, bg)).toBeGreaterThanOrEqual(4.5));
  it("documents that Sun Gold is not a text color", () => expect(ratio("#D6AC71", "#FCF9F3")).toBeLessThan(4.5));
});
