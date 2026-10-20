// Generates brand SVGs and PWA PNG icons from one geometry (mirrors src/components/ui/Logo.tsx).
// Usage: npm run icons   (uses the preinstalled Chromium; set CHROMIUM_PATH to override)
import { mkdirSync, writeFileSync } from "node:fs";
import { chromium } from "playwright-core";

const GOLD = "#D6AC71";
const IVORY = "#FCF9F3";
const INK = "#253645";

function mark({ color = GOLD, arch = true }) {
  const cy = arch ? 37 : 32;
  const r = arch ? 8 : 10;
  const [r1, r2] = arch ? [12, 16] : [14, 21];
  const sw = arch ? 2.2 : 3.4;
  const rays = Array.from({ length: 8 }, (_, i) => {
    const a = (i * Math.PI) / 4;
    const f = (n) => n.toFixed(2);
    return `<line x1="${f(32 + r1 * Math.cos(a))}" y1="${f(cy + r1 * Math.sin(a))}" x2="${f(32 + r2 * Math.cos(a))}" y2="${f(cy + r2 * Math.sin(a))}" stroke="${color}" stroke-width="${sw}" stroke-linecap="round"/>`;
  }).join("");
  const archPath = arch
    ? `<path d="M12 57V29a20 20 0 0 1 40 0v28" fill="none" stroke="${color}" stroke-width="2.2" stroke-linecap="round"/><path d="M7 57h50" stroke="${color}" stroke-width="2.2" stroke-linecap="round"/>`
    : "";
  const mask = `<mask id="c"><rect width="64" height="64" fill="#fff"/><rect x="30.9" y="${cy - r + 1.5}" width="2.2" height="${2 * r - 3}" fill="#000"/><rect x="${32 - r / 2 - 0.5}" y="${cy - 2.6}" width="${r + 1}" height="2.2" fill="#000"/></mask>`;
  return `${mask}${archPath}${rays}<circle cx="32" cy="${cy}" r="${r}" fill="${color}" mask="url(#c)"/>`;
}

const svg = (body, { bg, pad = 0 } = {}) => {
  const vb = `${-pad} ${-pad} ${64 + 2 * pad} ${64 + 2 * pad}`;
  const rect = bg ? `<rect x="${-pad}" y="${-pad}" width="${64 + 2 * pad}" height="${64 + 2 * pad}" fill="${bg}"/>` : "";
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb}">${rect}${body}</svg>\n`;
};

mkdirSync("public/icons", { recursive: true });
mkdirSync("public/brand", { recursive: true });

const files = {
  "public/favicon.svg": svg(mark({ arch: false }), { bg: IVORY, pad: 2 }),
  "public/icons/app-icon.svg": svg(mark({ arch: false }), { bg: IVORY, pad: 10 }),
  "public/brand/symbol-gold.svg": svg(mark({})),
  "public/brand/symbol-ink.svg": svg(mark({ color: INK })),
  "public/brand/symbol-white-on-ink.svg": svg(mark({ color: "#FFFFFF" }), { bg: INK, pad: 6 }),
};
for (const [p, c] of Object.entries(files)) writeFileSync(p, c);

const pngs = [
  ["public/icons/icon-192.png", 192, files["public/icons/app-icon.svg"]],
  ["public/icons/icon-512.png", 512, files["public/icons/app-icon.svg"]],
  ["public/icons/apple-touch-icon.png", 180, files["public/icons/app-icon.svg"]],
  // Maskable: extra safe-zone padding so launchers can crop to circles.
  ["public/icons/icon-maskable-512.png", 512, svg(mark({ arch: false }), { bg: IVORY, pad: 22 })],
];

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || "/opt/pw-browsers/chromium-1194/chrome-linux/chrome" });
const page = await browser.newPage();
for (const [out, size, content] of pngs) {
  await page.setViewportSize({ width: size, height: size });
  await page.setContent(`<html><body style="margin:0">${content.replace("<svg ", `<svg width="${size}" height="${size}" `)}</body></html>`);
  await page.screenshot({ path: out, omitBackground: false });
  console.log("wrote", out);
}
await browser.close();
