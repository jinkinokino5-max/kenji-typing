// 読み物ページ用のドット絵フォント（DotGothic16）を、実際に使う文字だけに絞って
// woff2 へ書き出す。
//
//   node scripts/build-font.mjs
//
// 元ファイル（約2MB）は取得してキャッシュに置くだけでリポジトリには入れない。
// 出力 public/fonts/DotGothic16-subset.woff2 はコミットする（開発時に毎回
// Python を要求しないため）。CI では build 前に再生成するので、ページの文言を
// 変えたのに再生成し忘れても、公開版では字が欠けない。
//
// 依存：Python 3 と fontTools / brotli（`pip install fonttools brotli`）

import { execFile } from "node:child_process";
import { mkdir, readFile, writeFile, readdir, stat } from "node:fs/promises";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { promisify } from "node:util";

const run = promisify(execFile);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const FONT_URL =
  "https://raw.githubusercontent.com/google/fonts/main/ofl/dotgothic16/DotGothic16-Regular.ttf";
const cacheDir = path.join(root, "node_modules", ".cache");
const srcTtf = path.join(cacheDir, "DotGothic16-Regular.ttf");
const outDir = path.join(root, "public", "fonts");
const outWoff2 = path.join(outDir, "DotGothic16-subset.woff2");

/** 文言を書き換えても字が欠けないよう、かな・英数・約物は常に全部入れる。 */
function alwaysInclude() {
  const set = new Set();
  for (let c = 0x20; c <= 0x7e; c++) set.add(String.fromCharCode(c)); // ASCII
  for (let c = 0x3041; c <= 0x309f; c++) set.add(String.fromCharCode(c)); // ひらがな
  for (let c = 0x30a0; c <= 0x30ff; c++) set.add(String.fromCharCode(c)); // カタカナ
  for (const c of "　、。，．・：；？！゛゜´｀¨＾￣＿ヽヾゝゞ〃仝〆〇ー—‐／＼〜‖｜…‥‘’“”（）〔〕［］｛｝〈〉《》「」『』【】＋－±×÷＝≠＜＞≦≧∞∴♂♀°′″℃￥＄￠￡％＃＆＊＠§☆★○●◎◇◆□■△▲▽▼※〒→←↑↓〓♪") {
    set.add(c);
  }
  return set;
}

/** HTML からタグ・スクリプト・スタイルを落として、地の文の文字を集める。 */
function textOf(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<!--[\s\S]*?-->/g, " ")
    // 属性のうち、画面に出る可能性があるものだけ拾う
    .replace(/<[^>]+?(?:alt|title|aria-label|content)="([^"]*)"[^>]*>/gi, " $1 ")
    .replace(/<[^>]+>/g, " ");
}

async function* htmlFiles(dir) {
  for (const name of await readdir(dir)) {
    if (name === "node_modules" || name === "dist" || name === ".git") continue;
    const p = path.join(dir, name);
    if ((await stat(p)).isDirectory()) yield* htmlFiles(p);
    else if (name.endsWith(".html")) yield p;
  }
}

async function main() {
  await mkdir(cacheDir, { recursive: true });
  await mkdir(outDir, { recursive: true });

  if (!existsSync(srcTtf)) {
    process.stdout.write("DotGothic16 を取得しています… ");
    const res = await fetch(FONT_URL);
    if (!res.ok) throw new Error(`フォントを取得できませんでした (${res.status})`);
    await writeFile(srcTtf, Buffer.from(await res.arrayBuffer()));
    console.log("完了");
  }

  const chars = alwaysInclude();
  let pages = 0;
  for await (const file of htmlFiles(root)) {
    pages++;
    for (const ch of textOf(await readFile(file, "utf8"))) {
      if (ch.codePointAt(0) > 0x20) chars.add(ch);
    }
  }

  const text = [...chars].join("");
  const textFile = path.join(cacheDir, "subset-chars.txt");
  await writeFile(textFile, text, "utf8");

  await run("python", [
    "-m",
    "fontTools.subset",
    srcTtf,
    `--text-file=${textFile}`,
    "--output-file=" + outWoff2,
    "--flavor=woff2",
    "--layout-features=",
    "--no-hinting",
    "--desubroutinize",
    "--name-IDs=0,1,2,3,4,5,6,13,14",
    "--notdef-outline",
  ]);

  const before = (await stat(srcTtf)).size;
  const after = (await stat(outWoff2)).size;
  console.log(
    `HTML ${pages} ページ / 収録 ${chars.size} 字\n` +
      `${(before / 1024).toFixed(0)}KB (ttf) → ${(after / 1024).toFixed(0)}KB (woff2)`,
  );
}

main().catch((e) => {
  console.error("フォントの生成に失敗しました:", e.message);
  console.error("Python と fontTools が必要です: pip install fonttools brotli");
  process.exit(1);
});
