// Reproducible browser QA for the long-form journal (V2 scenario A + D):
// types 3,000+ characters on a 390px touch viewport, reloads, and checks that
// title, body, tags and line breaks come back; then checks JSON export/import fidelity.
// Usage: npm run build && npx vite preview --port 4173 &  then  node scripts/qa-journal.mjs
import { mkdirSync, readFileSync } from "node:fs";
import { chromium, devices } from "playwright-core";

const BASE = process.env.BASE_URL || "http://localhost:4173";
const LONG = Array.from({ length: 12 }, (_, i) => `Paragraph ${i + 1}: Lord, I bring You the noise of this day — the "urgent" emails, the 3 a.m. worries, the quiet joy of coffee ☕️ with Anna. Teach me to rest, to listen, & to begin again 🌿✨.\n=SUM(not a formula) · ü é ñ — 기도`).join("\n\n");
const results = [];
const check = (name, ok) => results.push(`${ok ? "PASS" : "FAIL"}  ${name}`);

mkdirSync("screenshots", { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || "/opt/pw-browsers/chromium-1194/chrome-linux/chrome" });
const ctx = await browser.newContext({ ...devices["iPhone 13"], timezoneId: "America/New_York", acceptDownloads: true });
const page = await ctx.newPage();

await page.goto(`${BASE}/app/today`);
await page.getByRole("button", { name: "Skip for now" }).click();
await page.getByText(/step 1 of 3/i).waitFor({ state: "detached" });
await page.getByRole("link", { name: "New reflection" }).first().click();
await page.getByLabel("Title (optional)").fill("Evening prayer");
await page.getByLabel(/^Tags/).fill("prayer, family");
const body = page.getByLabel("Reflection");
await body.click();
await body.fill(LONG); // fill = paste-like input of the whole text
await page.keyboard.type(" Amen.");
await page.getByText(/Saved locally/).waitFor({ timeout: 5000 });
check("URL changes from /new to the entry id", !page.url().endsWith("/new"));

const box = await body.boundingBox();
check(`editor shows ≥ 12 lines at 390px (height ${Math.round(box.height)}px)`, box.height >= 12 * 18 * 1.75);
check("no horizontal overflow while writing", (await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)) <= 0);
await page.screenshot({ path: "screenshots/qa-journal-writing-390.png" });

await page.reload();
await page.getByLabel("Reflection").waitFor();
check("body restored after reload (3,000+ chars, emoji, line breaks)", (await page.getByLabel("Reflection").inputValue()) === LONG + " Amen.");
check("title restored after reload", (await page.getByLabel("Title (optional)").inputValue()) === "Evening prayer");
check("tags restored after reload", (await page.getByLabel(/^Tags/).inputValue()) === "prayer, family");

await page.getByRole("button", { name: "Focus mode" }).click();
check(
  "focus mode covers the tab bar and focuses the text",
  await page.evaluate(() => !!document.elementFromPoint(innerWidth / 2, innerHeight - 20)?.closest('[role="dialog"]') && document.activeElement?.id === "entry-body"),
);
await page.screenshot({ path: "screenshots/qa-journal-focus-390.png" });
await page.keyboard.press("Escape");
await page.getByRole("button", { name: /^Read$/ }).click();
await page.screenshot({ path: "screenshots/qa-journal-read-390.png", fullPage: true });

// Reload within the autosave delay: existing entry, then a brand-new one never saved to IndexedDB.
await page.getByRole("button", { name: /^Write$/ }).click();
await page.getByLabel("Reflection").press("Control+End");
await page.keyboard.type(" Quick last words.");
await page.reload();
check("edit typed <600ms before reload survives", (await page.getByLabel("Reflection").inputValue()).endsWith("Quick last words."));
await page.goto(`${BASE}/app/journal/new`);
await page.getByLabel("Reflection").fill("Brand new thought");
await page.reload();
await page.getByLabel("Reflection").waitFor();
check("brand-new reflection reloaded before first save is restored", (await page.getByLabel("Reflection").inputValue()) === "Brand new thought");

// Export → wipe → import
await page.goto(`${BASE}/app/you`);
const [dl] = await Promise.all([page.waitForEvent("download"), page.getByRole("button", { name: /Download backup/ }).click()]);
const file = await dl.path();
const exported = JSON.parse(readFileSync(file, "utf8"));
const exportedLong = exported.data.journal.find((j) => j.title === "Evening prayer");
check("export contains the full body", exportedLong?.body === LONG + " Amen. Quick last words.");
await page.getByLabel(/type DELETE/i).fill("DELETE");
await page.getByRole("button", { name: "Delete all my data" }).click();
await page.getByRole("button", { name: "Skip for now" }).click();
await page.locator('input[type="file"]').setInputFiles(file);
await page.getByText(/Restored \d+ records/).waitFor();
await page.goto(`${BASE}/app/journal`);
await page.getByText("Evening prayer").click();
await page.getByRole("button", { name: /^Write$/ }).click();
check("import restores the body exactly", (await page.getByLabel("Reflection").inputValue()) === LONG + " Amen. Quick last words.");

await browser.close();
console.log(results.join("\n"));
process.exit(results.some((r) => r.startsWith("FAIL")) ? 1 : 0);
