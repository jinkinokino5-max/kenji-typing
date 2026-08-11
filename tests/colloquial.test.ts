// 「文語のまま書かれたかなを、口語読みでも打ち切れるか」を全問題文で検査する。
//
// 判定側（src/typing/kanaRomaji.ts）とは独立に、ここで
//   歴史的仮名遣い → 現代かな → ローマ字
// を組み立て、その打鍵列を TypingEngine に流し込む。
// 途中でミスになったら「口語で打てない箇所」＝取りこぼしとして報告する。
//
//   npm run test:colloquial

import { TypingEngine } from "../src/typing/TypingEngine";
import { STORIES } from "../src/data/stories";

// ---- 歴史的仮名遣い → 現代かな -------------------------------------------

const VOWEL_OF: Record<string, number> = {};
const ROW_OF: Record<string, string[]> = {};
// [あ段, い段, う段, え段, お段, 拗音や, 拗音ゆ, 拗音よ]
const ROWS: string[][] = [
  ["あ", "い", "う", "え", "お", "や", "ゆ", "よ"],
  ["か", "き", "く", "け", "こ", "きゃ", "きゅ", "きょ"],
  ["が", "ぎ", "ぐ", "げ", "ご", "ぎゃ", "ぎゅ", "ぎょ"],
  ["さ", "し", "す", "せ", "そ", "しゃ", "しゅ", "しょ"],
  ["ざ", "じ", "ず", "ぜ", "ぞ", "じゃ", "じゅ", "じょ"],
  ["た", "ち", "つ", "て", "と", "ちゃ", "ちゅ", "ちょ"],
  ["だ", "ぢ", "づ", "で", "ど", "ぢゃ", "ぢゅ", "ぢょ"],
  ["な", "に", "ぬ", "ね", "の", "にゃ", "にゅ", "にょ"],
  ["は", "ひ", "ふ", "へ", "ほ", "ひゃ", "ひゅ", "ひょ"],
  ["ば", "び", "ぶ", "べ", "ぼ", "びゃ", "びゅ", "びょ"],
  ["ぱ", "ぴ", "ぷ", "ぺ", "ぽ", "ぴゃ", "ぴゅ", "ぴょ"],
  ["ま", "み", "む", "め", "も", "みゃ", "みゅ", "みょ"],
  ["や", "い", "ゆ", "え", "よ", "や", "ゆ", "よ"],
  ["ら", "り", "る", "れ", "ろ", "りゃ", "りゅ", "りょ"],
  ["わ", "ゐ", "う", "ゑ", "を", "わ", "う", "を"],
];
for (const row of ROWS) {
  for (let v = 0; v < 5; v++) {
    if (!(row[v] in VOWEL_OF)) {
      VOWEL_OF[row[v]] = v;
      ROW_OF[row[v]] = row;
    }
  }
}

const HAGYO: Record<string, string> = { は: "わ", ひ: "い", ふ: "う", へ: "え", ほ: "お" };
const MONO: Record<string, string> = { ゐ: "い", ゑ: "え", ぢ: "じ", づ: "ず" };
const isLongMark = (c: string): boolean => c === "う" || c === "ふ";

/** 歴史的仮名遣いを、音読したときの現代かなへ直す。 */
function toModern(kana: string): string {
  let out = "";
  let i = 0;
  while (i < kana.length) {
    const c = kana[i];
    const two = kana.substr(i, 2);
    const row = ROW_OF[c];

    // 拗音（小書き・大書き）＋ う/ふ → 拗音お段＋う： きゃう/きやう → きょう
    if (row && VOWEL_OF[c] === 1) {
      const small = kana[i + 1];
      if ((small === "ゃ" || small === "や") && isLongMark(kana[i + 2] ?? "")) {
        out += row[7] + "う";
        i += 3;
        continue;
      }
    }

    // 長音（開音・合音）
    if (row && isLongMark(kana[i + 1] ?? "")) {
      const v = VOWEL_OF[c];
      if (v === 0) {
        out += row[4] + "う"; // さう → そう
        i += 2;
        continue;
      }
      if (v === 3) {
        out += row[7] + "う"; // けふ → きょう
        i += 2;
        continue;
      }
      if (v === 1) {
        out += row[6] + "う"; // きう → きゅう
        i += 2;
        continue;
      }
    }

    if (MONO[c]) {
      out += MONO[c];
      i += 1;
      continue;
    }
    // 語中のハ行転呼。かなだけでは語境界が分からないので、
    // 「文の先頭以外」を語中とみなす（判定側の規則と同じ近似）。
    // ただし「〜うふう（風）」のように直前が「う」の「ふ」は長音の一部であって
    // 転呼ではないため、ここでは変換しない（検査side の誤検出よけ）。
    if (i > 0 && HAGYO[c] && !(c === "ふ" && kana[i - 1] === "う")) {
      out += HAGYO[c];
      i += 1;
      continue;
    }
    out += two.length === 2 && (two[1] === "ゃ" || two[1] === "ゅ" || two[1] === "ょ") ? two : c;
    i += two.length === 2 && (two[1] === "ゃ" || two[1] === "ゅ" || two[1] === "ょ") ? 2 : 1;
  }
  return out;
}

// ---- 現代かな → ローマ字 ---------------------------------------------------

const R2: Record<string, string> = {
  きゃ: "kya", きゅ: "kyu", きょ: "kyo", ぎゃ: "gya", ぎゅ: "gyu", ぎょ: "gyo",
  しゃ: "sha", しゅ: "shu", しょ: "sho", じゃ: "ja", じゅ: "ju", じょ: "jo",
  ちゃ: "cha", ちゅ: "chu", ちょ: "cho", ぢゃ: "dya", ぢゅ: "dyu", ぢょ: "dyo",
  にゃ: "nya", にゅ: "nyu", にょ: "nyo", ひゃ: "hya", ひゅ: "hyu", ひょ: "hyo",
  びゃ: "bya", びゅ: "byu", びょ: "byo", ぴゃ: "pya", ぴゅ: "pyu", ぴょ: "pyo",
  みゃ: "mya", みゅ: "myu", みょ: "myo", りゃ: "rya", りゅ: "ryu", りょ: "ryo",
  ふぁ: "fa", ふぃ: "fi", ふぇ: "fe", ふぉ: "fo", いぇ: "ye",
  てぃ: "thi", でぃ: "dhi", つぁ: "tsa", つぇ: "tse", つぉ: "tso",
  ゔぁ: "va", ゔぃ: "vi", ゔぇ: "ve", ゔぉ: "vo",
};
const R1: Record<string, string> = {
  あ: "a", い: "i", う: "u", え: "e", お: "o",
  か: "ka", き: "ki", く: "ku", け: "ke", こ: "ko",
  が: "ga", ぎ: "gi", ぐ: "gu", げ: "ge", ご: "go",
  さ: "sa", し: "shi", す: "su", せ: "se", そ: "so",
  ざ: "za", じ: "ji", ず: "zu", ぜ: "ze", ぞ: "zo",
  た: "ta", ち: "chi", つ: "tsu", て: "te", と: "to",
  だ: "da", ぢ: "di", づ: "du", で: "de", ど: "do",
  な: "na", に: "ni", ぬ: "nu", ね: "ne", の: "no",
  は: "ha", ひ: "hi", ふ: "fu", へ: "he", ほ: "ho",
  ば: "ba", び: "bi", ぶ: "bu", べ: "be", ぼ: "bo",
  ぱ: "pa", ぴ: "pi", ぷ: "pu", ぺ: "pe", ぽ: "po",
  ま: "ma", み: "mi", む: "mu", め: "me", も: "mo",
  や: "ya", ゆ: "yu", よ: "yo",
  ら: "ra", り: "ri", る: "ru", れ: "re", ろ: "ro",
  わ: "wa", ゐ: "wi", ゑ: "we", を: "wo", ゔ: "vu",
  ぁ: "la", ぃ: "li", ぅ: "lu", ぇ: "le", ぉ: "lo",
  ゃ: "lya", ゅ: "lyu", ょ: "lyo", ゎ: "lwa",
  "ー": "-", "、": ",", "。": ".", "「": "[", "」": "]",
  "・": "/", "？": "?", "！": "!", "〜": "~", "…": ".", "　": " ", " ": " ",
};
const N_NEEDS_DOUBLE = new Set([
  "あ", "い", "う", "え", "お", "な", "に", "ぬ", "ね", "の", "や", "ゆ", "よ", "ん",
  "ぁ", "ぃ", "ぅ", "ぇ", "ぉ", "ゃ", "ゅ", "ょ",
]);

/** 現代かなを、ごく標準的なローマ字（ヘボン寄り）に直す。 */
function toRomaji(kana: string): string {
  let out = "";
  let i = 0;
  while (i < kana.length) {
    const c = kana[i];
    if (c === "ん") {
      const next = kana[i + 1];
      out += next === undefined || N_NEEDS_DOUBLE.has(next) ? "nn" : "n";
      i += 1;
      continue;
    }
    if (c === "っ") {
      // 次モーラの頭子音を重ねる。母音・n の前は ltu で代用。
      const rest = toRomaji(kana.slice(i + 1));
      const head = rest[0] ?? "";
      out += head && !"aiueon".includes(head) ? head + rest : "ltu" + rest;
      return out;
    }
    const two = kana.substr(i, 2);
    if (two.length === 2 && R2[two]) {
      out += R2[two];
      i += 2;
      continue;
    }
    out += R1[c] ?? c;
    i += 1;
  }
  return out;
}

// ---- 検査 ------------------------------------------------------------------

interface Failure {
  story: string;
  qid: number;
  kana: string;
  modern: string;
  romaji: string;
  typedOk: number;
  missKey: string;
  expected: string;
}

const failures: Failure[] = [];
let checked = 0;
let colloquial = 0;

for (const s of STORIES) {
  for (const q of s.questions) {
    const modern = toModern(q.kana);
    checked++;
    if (modern === q.kana) continue; // 文語表記を含まない＝検査対象外
    colloquial++;

    const romaji = toRomaji(modern);
    const engine = new TypingEngine(q.kana);
    let done = false;
    let i = 0;
    for (; i < romaji.length; i++) {
      const r = engine.input(romaji[i]);
      if (r === "miss") {
        failures.push({
          story: s.title,
          qid: q.id,
          kana: q.kana,
          modern,
          romaji,
          typedOk: i,
          missKey: romaji[i],
          expected: engine.lastMissExpected,
        });
        break;
      }
      if (r === "all-done") {
        done = true;
        break;
      }
    }
    if (!done && i >= romaji.length) {
      failures.push({
        story: s.title,
        qid: q.id,
        kana: q.kana,
        modern,
        romaji,
        typedOk: romaji.length,
        missKey: "(打ち切れず)",
        expected: engine.guide().text.slice(engine.guide().typedLen),
      });
    }
  }
}

console.log(`問題文 ${checked} 件 / うち文語表記を含む ${colloquial} 件`);
if (failures.length === 0) {
  console.log(`✅ 口語読みで打てない箇所は見つかりませんでした`);
} else {
  console.log(`❌ 口語読みで打てない箇所 ${failures.length} 件\n`);
  for (const f of failures) {
    console.log(`  『${f.story}』 第${f.qid}問`);
    console.log(`    かな   : ${f.kana}`);
    console.log(`    口語   : ${f.modern}`);
    console.log(`    打鍵   : ${f.romaji}`);
    console.log(`    ${" ".repeat(0)}         ${" ".repeat(f.typedOk)}^ ここで弾かれた（打った: ${f.missKey} / 期待: ${f.expected || "?"}）`);
    console.log("");
  }
  process.exit(1);
}
