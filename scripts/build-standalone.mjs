// src/lib/bee 를 단일 HTML 한 장으로 묶는다 (설치·서버 없이 링크만으로 플레이).
import { build } from "esbuild";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

const out = process.argv[2] ?? "dist/manuka.html";

const result = await build({
  entryPoints: [resolve("src/lib/bee/standalone.ts")],
  bundle: true,
  minify: true,
  format: "iife",
  target: ["es2019"],
  write: false,
});

const js = result.outputFiles[0].text;
const shell = await readFile(resolve("scripts/standalone.html"), "utf8");
const html = shell.replace("/*BUNDLE*/", () => js);

await mkdir(dirname(resolve(out)), { recursive: true });
await writeFile(resolve(out), html, "utf8");
console.log(`${out} — ${(html.length / 1024).toFixed(0)}KB`);
