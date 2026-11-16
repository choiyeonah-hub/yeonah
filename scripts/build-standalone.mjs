// src/lib/bee 를 단일 HTML 한 장으로 묶는다 (설치·서버 없이 링크만으로 플레이).
import { build } from "esbuild";
import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
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
const outDir = dirname(resolve(out));
const three = await build({
  entryPoints: [resolve("src/lib/bee/wedding3d.ts")],
  bundle: true,
  minify: true,
  format: "iife",
  globalName: "__beeWedding3D",
  target: ["es2019"],
  loader: { ".glb": "base64" },
  write: false,
});
const js3d = three.outputFiles[0].text;

// 3D 번들을 옆 파일로 두면 호스트마다 경로 규칙이 달라 조용히 2D 로 떨어진다.
// 그 실패는 플레이어에게 보이지 않아서 신고도 늦는다. 한 장에 같이 심는다.
// 본편 스크립트 뒤에 두기 때문에 화면은 3D 번들을 파싱하기 전에 이미 떠 있다.
const shell = await readFile(resolve("scripts/standalone.html"), "utf8");
// 번들 안에 </script 가 들어 있으면 인라인 스크립트가 거기서 잘린다.
const inline = (code) => code.replace(/<\/script/gi, "<\\/script");
const html = shell
  .replace("/*BUNDLE*/", () => inline(js))
  .replace("/*WEDDING3D*/", () => inline(js3d));

await mkdir(dirname(resolve(out)), { recursive: true });
await writeFile(resolve(out), html, "utf8");

// Next 쪽은 /wedding3d.js 를 그대로 쓴다.
for (const dir of [outDir, resolve("public")]) {
  await mkdir(dir, { recursive: true });
  await writeFile(resolve(dir, "wedding3d.js"), js3d, "utf8");
}
console.log(
  [
    `${out} — ${(html.length / 1024).toFixed(0)}KB (3D 포함)`,
    `wedding3d.js — ${((await stat(resolve(outDir, "wedding3d.js"))).size / 1024).toFixed(0)}KB`,
  ].join("\n")
);
