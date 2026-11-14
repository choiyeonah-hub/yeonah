// src/lib/bee 를 단일 HTML 한 장으로 묶는다 (설치·서버 없이 링크만으로 플레이).
import { build } from "esbuild";
import { copyFile, mkdir, readFile, stat, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

const out = process.argv[2] ?? "dist/manuka.html";

const result = await build({
  entryPoints: [resolve("src/lib/bee/entry.ts")],
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

// 혼인비행 3D 는 본편 HTML 에 섞지 않고 따로 낸다. 본편이 즉시 뜨는 게 이 게임의 전제다.
const outDir = dirname(resolve(out));
const three = await build({
  entryPoints: [resolve("src/lib/bee/wedding3d.ts")],
  bundle: true,
  minify: true,
  format: "iife",
  globalName: "__beeWedding3D",
  target: ["es2019"],
  write: false,
});
const js3d = three.outputFiles[0].text;

const sizes = [`${out} — ${(html.length / 1024).toFixed(0)}KB`];
for (const dir of [outDir, resolve("public")]) {
  await mkdir(dir, { recursive: true });
  await writeFile(resolve(dir, "wedding3d.js"), js3d, "utf8");
  await copyFile(resolve("assets/bee2.glb"), resolve(dir, "bee2.glb"));
}
for (const f of ["wedding3d.js", "bee2.glb"]) {
  sizes.push(`${f} — ${((await stat(resolve(outDir, f))).size / 1024).toFixed(0)}KB`);
}
console.log(sizes.join("\n"));
