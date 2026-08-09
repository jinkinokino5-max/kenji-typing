// かな列の入力候補を確認する道具。
//   npm run typing:inspect -- ちょっとまつた
// 引数を省略すると、全問題文の推奨ローマ字の統計を出す。
import { TypingEngine } from "../src/typing/TypingEngine";
import { buildGraph, segment } from "../src/typing/kanaRomaji";
import { STORIES } from "../src/data/stories";

const args = process.argv.slice(2).filter((a) => a !== "--");

if (args.length > 0) {
  for (const kana of args) {
    const e = new TypingEngine(kana);
    const g = buildGraph(kana);
    console.log(`\n■ ${kana}`);
    console.log(`  推奨ローマ字 : ${e.guide().text}`);
    console.log(`  表示の区切り : ${segment(kana).map((s) => s.kana).join(" | ")}`);
    console.log("  受理する入力 :");
    for (let i = 0; i < kana.length; i++) {
      for (const edge of g[i]) {
        const consumed = kana.substr(i, edge.len);
        console.log(
          `    ${String(i).padStart(2)} ${consumed.padEnd(4)}` +
            ` ${edge.alt ? "[口語]" : "      "} ${edge.romaji.join(" / ")}`,
        );
      }
    }
  }
} else {
  let n = 0;
  let keys = 0;
  let longest = { kana: "", romaji: "" };
  for (const s of STORIES) {
    for (const q of s.questions) {
      n++;
      const r = new TypingEngine(q.kana).guide().text;
      keys += r.length;
      if (r.length > longest.romaji.length) longest = { kana: q.kana, romaji: r };
    }
  }
  console.log(`問題文 ${n} 件 / 総打鍵(推奨) ${keys} / 平均 ${(keys / n).toFixed(1)} 打`);
  console.log(`最長: ${longest.kana}\n      ${longest.romaji} (${longest.romaji.length}打)`);
}
