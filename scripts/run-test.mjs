// tests/ の TypeScript を esbuild でバンドルして node で走らせる小さなランナー。
// テストのためだけに依存を増やしたくないので、既存の esbuild（vite 同梱）を使う。
//
//   node scripts/run-test.mjs typing.test.ts [追加の引数...]

import { build } from "esbuild";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const [entry, ...rest] = process.argv.slice(2);

if (!entry) {
  console.error("使い方: node scripts/run-test.mjs <tests配下のファイル名>");
  process.exit(2);
}

const outfile = path.join(root, "node_modules", ".cache", `kenji-${entry.replace(/\W+/g, "-")}.mjs`);

await build({
  entryPoints: [path.join(root, "tests", entry)],
  outfile,
  bundle: true,
  platform: "node",
  format: "esm",
  target: "node20",
  logLevel: "warning",
});

const child = spawn(process.execPath, [outfile, ...rest], { stdio: "inherit" });
child.on("exit", (code) => process.exit(code ?? 1));
