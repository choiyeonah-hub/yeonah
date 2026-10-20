// Captures every main screen at the QA widths and reports horizontal overflow.
// Usage: npm run build && npx vite preview --port 4173 &  then  npm run shots
import { mkdirSync } from "node:fs";
import { chromium } from "playwright-core";

const BASE = process.env.BASE_URL || "http://localhost:4173";
const WIDTHS = [375, 390, 430, 768, 1440];
const PAGES = ["/", "/app/today", "/app/planner", "/app/rosary", "/app/journal", "/app/journal/sample-j1", "/app/journal/sample-j1?mode=read", "/app/journal?tab=gratitude", "/app/you", "/app/you/widgets", "/brand"];

mkdirSync("screenshots", { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || "/opt/pw-browsers/chromium-1194/chrome-linux/chrome" });
const ctx = await browser.newContext({ timezoneId: "America/New_York" });
const page = await ctx.newPage();
const problems = [];
page.on("pageerror", (e) => problems.push(`pageerror: ${e.message}`));
page.on("console", (m) => m.type() === "error" && problems.push(`console: ${m.text()}`));

// Seed: finish onboarding with sample data so screens have content.
await page.setViewportSize({ width: 390, height: 844 });
await page.goto(`${BASE}/app/today`);
await page.getByRole("button", { name: "Continue" }).click();
await page.getByRole("button", { name: "Continue" }).click();
await page.getByRole("button", { name: "Morning prayer" }).click(); // opt in to one routine so routine UI is captured too
await page.getByLabel(/sample entries/).check();
await page.getByRole("button", { name: "Begin" }).click();
await page.getByText(/step 3 of 3/i).waitFor({ state: "detached" }); // wait until onboarding has saved

for (const w of WIDTHS) {
  await page.setViewportSize({ width: w, height: w < 768 ? 844 : 1000 });
  for (const p of PAGES) {
    await page.goto(`${BASE}${p}`);
    await page.waitForLoadState("networkidle");
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    if (overflow > 0) problems.push(`overflow ${overflow}px at ${w}px on ${p}`);
    const name = (p === "/" ? "landing" : p.replace(/[/?=]/g, "_").replace(/^_/, "")) + `-${w}.png`;
    await page.screenshot({ path: `screenshots/${name}`, fullPage: true });
  }
}
await browser.close();
console.log(problems.length ? problems.join("\n") : "No overflow or runtime errors found.");
