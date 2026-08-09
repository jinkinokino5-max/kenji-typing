// タイピング判定のテスト。`npm test` から実行する（esbuild でバンドル → node）。
import { TypingEngine } from "../src/typing/TypingEngine";
import { buildGraph, segment, preferredPath } from "../src/typing/kanaRomaji";
import { STORIES } from "../src/data/stories";

let passed = 0;
const failures: string[] = [];

function check(name: string, cond: boolean, detail = ""): void {
  if (cond) passed++;
  else failures.push(`${name}${detail ? ` — ${detail}` : ""}`);
}

/** ローマ字列を流し込む。戻り値は最初にミスした位置（-1 ならミス無し）。 */
function feed(e: TypingEngine, romaji: string): number {
  for (let i = 0; i < romaji.length; i++) {
    if (e.input(romaji[i]) === "miss") return i;
  }
  return -1;
}

// ---------------------------------------------------------------------------
// 1. 受理すべき入力
// ---------------------------------------------------------------------------
const ACCEPT: Array<[string, string, string]> = [
  // ── ユーザ報告：「ちょ」が打てない ──
  ["ちょ", "cho", "ちょ=cho"],
  ["ちょ", "tyo", "ちょ=tyo"],
  ["ちょ", "cyo", "ちょ=cyo"],
  ["ちょ", "chyo", "ちょ=chyo"],
  ["ちょ", "tilyo", "ちょ=ti+lyo（分割入力）"],
  ["ちょ", "chixyo", "ちょ=chi+xyo（分割入力）"],
  ["ちょっと", "chotto", "ちょっと"],
  ["ちょっと", "cyoltuto", "ちょっと（cyo+ltu+to）"],
  ["いっちょう", "icchou", "いっちょう=icchou"],
  ["いっちょう", "ittyou", "いっちょう=ittyou"],
  ["いっちょう", "iccyou", "いっちょう=iccyou"],
  ["ちゃ", "cya", "ちゃ=cya"],
  ["ちゅ", "cyu", "ちゅ=cyu"],
  // ── 拗音の分割入力 ──
  ["きょう", "kyou", "きょう=kyou"],
  ["きょう", "kilyou", "きょう=ki+lyo+u"],
  ["きょう", "kixyou", "きょう=ki+xyo+u"],
  ["いっしょ", "issho", "いっしょ=issho"],
  ["いっしょ", "isshyo", "いっしょ=isshyo"],
  ["いっしょ", "issilyo", "いっしょ=i+ssi+lyo（促音重ね＋分割）"],
  ["じゅう", "jyuu", "じゅう=jyuu"],
  ["じゅう", "zyuu", "じゅう=zyuu"],
  ["じゅう", "juu", "じゅう=juu"],
  // ── 基本のゆらぎ ──
  ["し", "si", "し=si"],
  ["し", "shi", "し=shi"],
  ["し", "ci", "し=ci"],
  ["つ", "tu", "つ=tu"],
  ["つ", "tsu", "つ=tsu"],
  ["ふ", "hu", "ふ=hu"],
  ["ふ", "fu", "ふ=fu"],
  ["か", "ca", "か=ca"],
  ["せ", "ce", "せ=ce"],
  ["く", "qu", "く=qu"],
  // ── 「ん」 ──
  ["しんぶん", "shinbunn", "ん=n（子音の前）"],
  ["しんぶん", "sinnbunn", "ん=nn"],
  ["しんぶん", "sixnbunn", "ん=xn"],
  ["ほんや", "honnya", "ん=nn（や行の前）"],
  ["げんいん", "genninn", "ん=nn（母音の前）"],
  ["ぐんま", "gunma", "ん=n（ま行の前）"],
  // ── 促音 ──
  ["きって", "kitte", "っ=子音重ね"],
  ["きって", "kiltute", "っ=ltu"],
  ["きって", "kixtute", "っ=xtu"],
  ["あっ", "altu", "語末のっ"],
  // ── 文語（歴史的仮名遣い）の口語読み ──
  ["ゐる", "wiru", "ゐ=wi（本則）"],
  ["ゐる", "iru", "ゐ=i（口語読み）"],
  ["こゑ", "kowe", "ゑ=we"],
  ["こゑ", "koe", "ゑ=e（口語読み）"],
  ["さう", "sau", "さう=sau（字義どおり）"],
  ["さう", "sou", "さう=sou（口語読み）"],
  ["かうべ", "koube", "かう=kou"],
  ["やうす", "yousu", "やう=you"],
  ["けふ", "kefu", "けふ=kefu"],
  ["けふ", "kyou", "けふ=kyou（口語読み）"],
  ["てふ", "chou", "てふ=chou（口語読み）"],
  ["てふ", "tyou", "てふ=tyou"],
  ["せうねん", "shounenn", "せう=shou"],
  ["きうり", "kyuuri", "きう=kyuu"],
  ["おまへ", "omahe", "おまへ=omahe"],
  ["おまへ", "omae", "おまへ=omae（ハ行転呼）"],
  ["こひ", "koi", "こひ=koi（ハ行転呼）"],
  ["おもふ", "omou", "おもふ=omou（ハ行転呼）"],
  ["あはれ", "aware", "あはれ=aware（ハ行転呼）"],
  ["おほきい", "ookii", "おほ=oo（ハ行転呼）"],
  ["ゆふべ", "yuube", "ゆふ=yuu"],
  ["これは", "koreha", "助詞は=ha"],
  ["これは", "korewa", "助詞は=wa"],
  ["いへ", "ihe", "へ=he"],
  ["やまへ", "yamae", "助詞へ=e"],
  ["ほんを", "honnwo", "を=wo"],
  ["ほんを", "honno", "を=o"],
  ["つづく", "tuduku", "づ=du"],
  ["つづく", "tuzuku", "づ=zu（口語読み）"],
  // ── 外来音・記号 ──
  ["ふぇありー", "feari-", "ふぇ=fe / ー=-"],
  ["ふぇ", "hwe", "ふぇ=hwe"],
  ["てぃー", "thi-", "てぃ=thi"],
  ["でぃ", "dhi", "でぃ=dhi"],
  ["ゔぁ", "va", "ゔぁ=va"],
  ["いま、そら。", "ima,sora.", "読点・句点"],
];

for (const [kana, romaji, name] of ACCEPT) {
  const e = new TypingEngine(kana);
  const at = feed(e, romaji);
  check(`受理: ${name}`, at < 0 && e.done, at >= 0 ? `'${romaji[at]}'(${at}文字目)で不受理` : "未完了");
}

// ---------------------------------------------------------------------------
// 2. 拒否すべき入力（甘くしすぎていないか）
// ---------------------------------------------------------------------------
const REJECT: Array<[string, string, string]> = [
  ["んあ", "na", "「んあ」を na で通さない（n+a は な になる）"],
  ["ほんや", "honya", "「ほんや」を honya で通さない"],
  ["げんいん", "geninn", "「げんいん」を geninn で通さない"],
  ["か", "ki", "別のかなを受理しない"],
  ["ちょ", "cha", "ちょ に cha を通さない"],
  ["さう", "sao", "さう に sao を通さない"],
  ["きって", "kite", "促音を飛ばさない"],
];
for (const [kana, romaji, name] of REJECT) {
  const e = new TypingEngine(kana);
  const at = feed(e, romaji);
  check(`拒否: ${name}`, at >= 0 || !e.done, "誤って受理された");
}

// ---------------------------------------------------------------------------
// 3. 全問題文を「ガイドどおり」「ランダム経路」で打ち切れるか
// ---------------------------------------------------------------------------
let nq = 0;

/** 乱数（再現性のため線形合同法）。 */
let seed = 20260807;
function rnd(max: number): number {
  seed = (seed * 1103515245 + 12345) & 0x7fffffff;
  return seed % max;
}

for (const story of STORIES) {
  for (const q of story.questions) {
    nq++;
    // (a) ガイドが示すキーを素直に打つ
    {
      const e = new TypingEngine(q.kana);
      let guard = 0;
      let ok = true;
      while (!e.done && guard++ < 4000) {
        const k = e.expectedKeys()[0];
        if (!k || e.input(k) === "miss") { ok = false; break; }
      }
      check(`ガイド打鍵: ${story.key}#${q.id}`, ok && e.done && e.mistakes === 0, q.kana);
    }
    // (b) 受理されうるキーをランダムに選ぶ（どの経路でも必ず打ち切れるか）
    for (let trial = 0; trial < 3; trial++) {
      const e = new TypingEngine(q.kana);
      let guard = 0;
      let ok = true;
      while (!e.done && guard++ < 6000) {
        const keys = e.expectedKeys();
        if (keys.length === 0) { ok = false; break; }
        if (e.input(keys[rnd(keys.length)]) === "miss") { ok = false; break; }
      }
      check(`ランダム経路: ${story.key}#${q.id}`, ok && e.done, q.kana);
    }
    // (c) 推奨ローマ字を一括で流し込む
    {
      const e = new TypingEngine(q.kana);
      const g = e.guide();
      const at = feed(e, g.text);
      check(`推奨ローマ字: ${story.key}#${q.id}`, at < 0 && e.done, `${g.text} / ${q.kana}`);
    }
  }
}

// ---------------------------------------------------------------------------
// 4. 表示・進捗まわり
// ---------------------------------------------------------------------------
{
  const e = new TypingEngine("きょうは");
  check("区切り: きょ|う|は", segment("きょうは").map((s) => s.kana).join("|") === "きょ|う|は");
  check("初期view: 先頭がcurrent", e.view()[0].status === "current");
  feed(e, "kyo");
  check("kyo後: 1つ目done", e.view()[0].status === "done", JSON.stringify(e.view()));
  check("kyo後: 2つ目current", e.view()[1].status === "current");
  const g = e.guide();
  check("ガイド全文", g.text === "kyouha", g.text);
  check("ガイド既打長", g.typedLen === 3, String(g.typedLen));
}
{
  // 「ん」は確定するまで done にしない（先走って進めない）。
  const e = new TypingEngine("ほんや");
  feed(e, "hon");
  check("ん途中: まだ ん が current", e.view()[1].status === "current", JSON.stringify(e.view()));
  check("ん途中: 期待キーに n を含む", e.expectedKeys().includes("n"));
}
{
  const e = new TypingEngine("あい");
  e.input("a");
  e.input("z"); // ミス
  check("ミス計上", e.mistakes === 1);
  check("ミスキー記録", e.lastMissKey === "z");
  check("期待キー記録", e.lastMissExpected === "i", e.lastMissExpected);
  check("苦手キー集計", e.missByKey.get("i") === 1);
}
{
  const e = new TypingEngine("ゐる");
  check("ゐ の推奨は本則 wi", e.guide().text === "wiru", e.guide().text);
  const alt = new TypingEngine("さう");
  check("さう の推奨は字義どおり sau", alt.guide().text === "sau", alt.guide().text);
}
{
  const g = buildGraph("しゃ");
  check("preferredPath: しゃ=sha", preferredPath(g, 0, 2) === "sha", preferredPath(g, 0, 2));
}
{
  // 辺がかな列の末尾を越えて消費しないこと（末尾付近の substr は短く返るため）。
  const bad: string[] = [];
  for (const kana of ["ちょつとまつた", "きょう", "た", "ちょ", "ん", "っ", "あきょ"]) {
    const g = buildGraph(kana);
    for (let i = 0; i < kana.length; i++) {
      for (const e of g[i]) if (i + e.len > kana.length) bad.push(`${kana}@${i}+${e.len}`);
    }
  }
  check("辺が末尾を越えない", bad.length === 0, bad.join(" "));
}
{
  // 全問題文でも同じ不変条件を確かめる。
  const bad: string[] = [];
  for (const s of STORIES) {
    for (const q of s.questions) {
      const g = buildGraph(q.kana);
      for (let i = 0; i < q.kana.length; i++) {
        for (const e of g[i]) if (i + e.len > q.kana.length) bad.push(`${s.key}#${q.id}@${i}`);
      }
    }
  }
  check("全問題文で辺が末尾を越えない", bad.length === 0, bad.slice(0, 3).join(" "));
}
{
  // 打鍵中に経路を切り替えても破綻しないこと。
  const e = new TypingEngine("しゃしゃ");
  check("しゃしゃ: sha+silya", feed(e, "shasilya") < 0 && e.done);
}

// ---------------------------------------------------------------------------
console.log(`問題文 ${nq} 件 / アサーション ${passed + failures.length} 件`);
if (failures.length === 0) {
  console.log(`✅ すべて通過（${passed}）`);
} else {
  console.log(`❌ 失敗 ${failures.length} 件（通過 ${passed}）`);
  failures.slice(0, 40).forEach((f) => console.log("  - " + f));
  process.exitCode = 1;
}
