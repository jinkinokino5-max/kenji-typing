// かな⇄ローマ字の変換規則と、かな列→「入力グラフ」への展開。
//
// 【設計方針】
// 1かなに1つの正解を割り当てるのではなく、「かな列の i 文字目から len 文字分を
// 消費する辺(Edge)」の集合＝有向グラフを作る。こうすると
//   ・拗音の一括入力（きょ = kyo）と分割入力（き + ょ = ki + lyo）
//   ・促音の子音重ね（った = tta）と ltu/xtu 形
//   ・「ん」の n / nn 使い分け（母音・な行・や行・語末の前は nn 必須）
//   ・歴史的仮名遣い（ゐ→i、さう→sou、けふ→kyou 等）の口語読み
// を、すべて同じ仕組みで同時に受理できる。
// 判定側（TypingEngine）は「到達しうる位置の集合」を持って進むだけでよい。

/** かな列の位置 i から len 文字分を消費する入力候補。 */
export interface Edge {
  /** 消費するかな文字数。 */
  len: number;
  /** 受理するローマ字（先頭ほど推奨）。 */
  romaji: string[];
  /** 歴史的仮名遣いの口語読みなど、補助的な受理経路か。 */
  alt?: boolean;
}

/** 表示用のかたまり（拗音・促音を1つにまとめる）。 */
export interface Segment {
  kana: string;
  /** かな列内の開始位置（含む）。 */
  start: number;
  /** かな列内の終了位置（含まない）。 */
  end: number;
}

// ---------------------------------------------------------------------------
// 基本表
// ---------------------------------------------------------------------------

// 清音・濁音・半濁音。IME で実際に通る綴りを網羅する（si/shi/ci など）。
const BASE: Record<string, string[]> = {
  あ: ["a"], い: ["i", "yi"], う: ["u", "wu", "whu"], え: ["e"], お: ["o"],
  か: ["ka", "ca"], き: ["ki"], く: ["ku", "cu", "qu"], け: ["ke"], こ: ["ko", "co"],
  が: ["ga"], ぎ: ["gi"], ぐ: ["gu"], げ: ["ge"], ご: ["go"],
  さ: ["sa"], し: ["shi", "si", "ci"], す: ["su"], せ: ["se", "ce"], そ: ["so"],
  ざ: ["za"], じ: ["ji", "zi"], ず: ["zu"], ぜ: ["ze"], ぞ: ["zo"],
  た: ["ta"], ち: ["chi", "ti"], つ: ["tsu", "tu"], て: ["te"], と: ["to"],
  だ: ["da"], ぢ: ["di"], づ: ["du"], で: ["de"], ど: ["do"],
  な: ["na"], に: ["ni"], ぬ: ["nu"], ね: ["ne"], の: ["no"],
  は: ["ha"], ひ: ["hi"], ふ: ["fu", "hu"], へ: ["he"], ほ: ["ho"],
  ば: ["ba"], び: ["bi"], ぶ: ["bu"], べ: ["be"], ぼ: ["bo"],
  ぱ: ["pa"], ぴ: ["pi"], ぷ: ["pu"], ぺ: ["pe"], ぽ: ["po"],
  ま: ["ma"], み: ["mi"], む: ["mu"], め: ["me"], も: ["mo"],
  や: ["ya"], ゆ: ["yu"], よ: ["yo"],
  ら: ["ra"], り: ["ri"], る: ["ru"], れ: ["re"], ろ: ["ro"],
  わ: ["wa"], ゐ: ["wi"], ゑ: ["we"], を: ["wo"],
  ゔ: ["vu"],
  // 小書き単体（拗音を分割入力するときに使う）
  ぁ: ["la", "xa"], ぃ: ["li", "xi", "lyi", "xyi"], ぅ: ["lu", "xu"],
  ぇ: ["le", "xe", "lye", "xye"], ぉ: ["lo", "xo"],
  ゃ: ["lya", "xya"], ゅ: ["lyu", "xyu"], ょ: ["lyo", "xyo"],
  ゎ: ["lwa", "xwa"],
  っ: ["ltu", "xtu", "ltsu", "xtsu"],
};

// 拗音・外来音（2かなを一括で打つ形）。分割入力は BASE の組合せで自動的に通る。
const DIGRAPH: Record<string, string[]> = {
  きゃ: ["kya"], きぃ: ["kyi"], きゅ: ["kyu"], きぇ: ["kye"], きょ: ["kyo"],
  ぎゃ: ["gya"], ぎぃ: ["gyi"], ぎゅ: ["gyu"], ぎぇ: ["gye"], ぎょ: ["gyo"],
  しゃ: ["sha", "sya", "shya"], しゅ: ["shu", "syu", "shyu"],
  しぇ: ["she", "sye"], しょ: ["sho", "syo", "shyo"],
  じゃ: ["ja", "jya", "zya"], じゅ: ["ju", "jyu", "zyu"],
  じぇ: ["je", "jye", "zye"], じょ: ["jo", "jyo", "zyo"],
  // 「ちょ」が打てない問題の本丸。cho/tyo に加えて cyo（IME で通る）も受理する。
  ちゃ: ["cha", "tya", "cya", "chya"], ちゅ: ["chu", "tyu", "cyu", "chyu"],
  ちぇ: ["che", "tye", "cye"], ちょ: ["cho", "tyo", "cyo", "chyo"],
  ぢゃ: ["dya"], ぢゅ: ["dyu"], ぢぇ: ["dye"], ぢょ: ["dyo"],
  にゃ: ["nya"], にぃ: ["nyi"], にゅ: ["nyu"], にぇ: ["nye"], にょ: ["nyo"],
  ひゃ: ["hya"], ひぃ: ["hyi"], ひゅ: ["hyu"], ひぇ: ["hye"], ひょ: ["hyo"],
  びゃ: ["bya"], びぃ: ["byi"], びゅ: ["byu"], びぇ: ["bye"], びょ: ["byo"],
  ぴゃ: ["pya"], ぴぃ: ["pyi"], ぴゅ: ["pyu"], ぴぇ: ["pye"], ぴょ: ["pyo"],
  みゃ: ["mya"], みぃ: ["myi"], みゅ: ["myu"], みぇ: ["mye"], みょ: ["myo"],
  りゃ: ["rya"], りぃ: ["ryi"], りゅ: ["ryu"], りぇ: ["rye"], りょ: ["ryo"],
  // 外来音
  ふぁ: ["fa", "hwa"], ふぃ: ["fi", "fyi", "hwi"], ふぇ: ["fe", "fye", "hwe"],
  ふぉ: ["fo", "hwo"], ふゅ: ["fyu"],
  ゔぁ: ["va"], ゔぃ: ["vi"], ゔぇ: ["ve"], ゔぉ: ["vo"], ゔゅ: ["vyu"],
  てぃ: ["thi"], てゅ: ["thu"], でぃ: ["dhi"], でゅ: ["dhu"],
  とぅ: ["twu"], どぅ: ["dwu"],
  うぁ: ["wha"], うぃ: ["wi", "whi"], うぇ: ["we", "whe"], うぉ: ["who"],
  くぁ: ["qa", "qwa"], くぃ: ["qi", "qwi"], くぇ: ["qe", "qwe"], くぉ: ["qo", "qwo"],
  ぐぁ: ["gwa"], つぁ: ["tsa"], つぃ: ["tsi"], つぇ: ["tse"], つぉ: ["tso"],
  いぇ: ["ye"],
  // 合拗音（小書きの「ゎ」）。これが無いと「ぐゎあ」を gu + lwa と分けるしかなく、
  // 素直な gwa が弾かれてしまう。
  くゎ: ["kwa", "qwa"], ぐゎ: ["gwa"],
};

// 記号・約物。かな欄に記号を含めても打てるようにする。
const PUNCT: Record<string, string[]> = {
  "ー": ["-"], "、": [",", "-"], "。": ["."], "，": [","], "．": ["."],
  "「": ["["], "」": ["]"], "『": ["["], "』": ["]"],
  "・": ["/"], "？": ["?"], "！": ["!"], "〜": ["~"], "…": ["."],
  "　": [" "], " ": [" "],
};

const TABLE: Record<string, string[]> = { ...BASE, ...DIGRAPH, ...PUNCT };

// ---------------------------------------------------------------------------
// 歴史的仮名遣い（文語体）→ 口語読みの受理規則
// ---------------------------------------------------------------------------

// 行ごとの五十音（あ段〜お段）と、対応する拗音（ゃ・ゅ・ょ）。
interface Row {
  kana: [string, string, string, string, string]; // あ い う え お 段
  youon: [string, string, string]; // 〜ゃ 〜ゅ 〜ょ
}
const ROWS: Row[] = [
  { kana: ["あ", "い", "う", "え", "お"], youon: ["や", "ゆ", "よ"] },
  { kana: ["か", "き", "く", "け", "こ"], youon: ["きゃ", "きゅ", "きょ"] },
  { kana: ["が", "ぎ", "ぐ", "げ", "ご"], youon: ["ぎゃ", "ぎゅ", "ぎょ"] },
  { kana: ["さ", "し", "す", "せ", "そ"], youon: ["しゃ", "しゅ", "しょ"] },
  { kana: ["ざ", "じ", "ず", "ぜ", "ぞ"], youon: ["じゃ", "じゅ", "じょ"] },
  { kana: ["た", "ち", "つ", "て", "と"], youon: ["ちゃ", "ちゅ", "ちょ"] },
  { kana: ["だ", "ぢ", "づ", "で", "ど"], youon: ["ぢゃ", "ぢゅ", "ぢょ"] },
  { kana: ["な", "に", "ぬ", "ね", "の"], youon: ["にゃ", "にゅ", "にょ"] },
  { kana: ["は", "ひ", "ふ", "へ", "ほ"], youon: ["ひゃ", "ひゅ", "ひょ"] },
  { kana: ["ば", "び", "ぶ", "べ", "ぼ"], youon: ["びゃ", "びゅ", "びょ"] },
  { kana: ["ぱ", "ぴ", "ぷ", "ぺ", "ぽ"], youon: ["ぴゃ", "ぴゅ", "ぴょ"] },
  { kana: ["ま", "み", "む", "め", "も"], youon: ["みゃ", "みゅ", "みょ"] },
  { kana: ["や", "い", "ゆ", "え", "よ"], youon: ["や", "ゆ", "よ"] },
  { kana: ["ら", "り", "る", "れ", "ろ"], youon: ["りゃ", "りゅ", "りょ"] },
  { kana: ["わ", "ゐ", "う", "ゑ", "を"], youon: ["わ", "う", "を"] },
];

/** かな → その行・段。 */
const GRADE: Record<string, { row: Row; vowel: number }> = {};
for (const row of ROWS) {
  row.kana.forEach((k, v) => {
    if (!(k in GRADE)) GRADE[k] = { row, vowel: v };
  });
}

/** 歴史的仮名遣いで語中に現れるハ行 → 口語のワ行/母音（ハ行転呼）。 */
const HAGYO_SHIFT: Record<string, string[]> = {
  は: ["wa"], ひ: ["i", "yi"], ふ: ["u"], へ: ["e"], ほ: ["o"],
};

/** 単字レベルの口語読み（常に追加受理する）。 */
const COLLOQUIAL_MONO: Record<string, string[]> = {
  ゐ: ["i", "yi"], // ゐる → iru
  ゑ: ["e"], // こゑ → koe
  を: ["o"], // 助詞の「を」
  は: ["wa"], // 助詞の「は」
  へ: ["e"], // 助詞の「へ」
  ぢ: ["ji", "zi"],
  づ: ["zu"],
  ゔ: ["bu"],
};

/**
 * 拗音レベルの口語読み（2かなを消費して追加受理する）。
 *
 * COLLOQUIAL_MONO は1かなぶんの辺しか作らないため、「ぢゃ」は
 * 「ぢ(→ji) + ゃ(→lya)」＝ jilya という不自然な打ち方しか残らなかった。
 * 現代表記の「じゃ」と同じ ja / zya で打てるよう、ここで2かなの辺を足す。
 * 合拗音（くゎ→ka、ぐゎ→ga）も同じ理由で口語読みを認める。
 */
const COLLOQUIAL_DIGRAPH: Record<string, string[]> = {
  ぢゃ: ["ja", "jya", "zya"], ぢゅ: ["ju", "jyu", "zyu"],
  ぢぇ: ["je", "jye", "zye"], ぢょ: ["jo", "jyo", "zyo"],
  くゎ: ["ka", "ca"], ぐゎ: ["ga"],
};

function uniq(a: string[]): string[] {
  return Array.from(new Set(a));
}

/** 拗音かなのローマ字（表に無ければ空）。 */
function romajiOf(kana: string): string[] {
  return TABLE[kana] ?? [];
}

/**
 * 位置 i の「歴史的仮名遣い → 口語読み」候補を返す（2〜3かなを消費）。
 * ・あ段＋う/ふ  → お段＋u   （さう→sou、かふ→kou、やう→you）
 * ・え段＋う/ふ  → 拗音お段＋u（けふ→kyou、てふ→chou、せう→shou）
 * ・い段＋う/ふ  → 拗音う段＋u（きう→kyuu、りう→ryuu、いふ→yuu）
 * ・拗音あ段＋う/ふ → 拗音お段＋u（きゃう→kyou、しやう→shou）
 */
function historicalEdges(kana: string, i: number): Edge[] {
  const out: Edge[] = [];
  const addLong = (base: string[], len: number) => {
    const cand = base.map((r) => r + "u").filter((r) => r.length > 1);
    if (cand.length > 0) out.push({ len, romaji: uniq(cand), alt: true });
  };

  const isLongMark = (c: string) => c === "う" || c === "ふ";

  // 拗音（小書き）＋ う/ふ ： きゃう → kyou
  const two = kana.substr(i, 2);
  if (DIGRAPH[two] && isLongMark(kana[i + 2] ?? "")) {
    const g = GRADE[kana[i]];
    const small = two[1];
    if (g && (small === "ゃ" || small === "ぇ")) addLong(romajiOf(g.row.youon[2]), 3);
  }

  const g = GRADE[kana[i]];
  if (!g) return out;
  const next = kana[i + 1] ?? "";

  // 大書きの拗音表記 ： きやう → kyou / きよう は別語なので対象外
  if (g.vowel === 1 && (next === "や" || next === "よ") && isLongMark(kana[i + 2] ?? "")) {
    addLong(romajiOf(g.row.youon[2]), 3);
  }

  if (!isLongMark(next)) return out;
  if (g.vowel === 0) addLong(romajiOf(g.row.kana[4]), 2); // あ段 → お段
  else if (g.vowel === 3) addLong(romajiOf(g.row.youon[2]), 2); // え段 → 拗音お段
  else if (g.vowel === 1) addLong(romajiOf(g.row.youon[1]), 2); // い段 → 拗音う段
  return out;
}

// ---------------------------------------------------------------------------
// 「ん」の扱い
// ---------------------------------------------------------------------------

// 「ん」の直後がこれらだと、単独 n では確定できない（IME が な行/母音に化ける）。
const N_NEEDS_DOUBLE = new Set([
  "あ", "い", "う", "え", "お", "な", "に", "ぬ", "ね", "の", "や", "ゆ", "よ", "ん",
  "ぁ", "ぃ", "ぅ", "ぇ", "ぉ", "ゃ", "ゅ", "ょ",
]);

function nRomaji(kana: string, i: number): string[] {
  const next = kana[i + 1];
  // 語末・上記の前は nn / xn / n' のみ。それ以外は単独 n も許す。
  if (next === undefined || N_NEEDS_DOUBLE.has(next)) return ["nn", "xn", "n'"];
  return ["nn", "n", "xn", "n'"];
}

// ---------------------------------------------------------------------------
// グラフ構築
// ---------------------------------------------------------------------------

const VOWELS = "aeiou";

/**
 * かな列を入力グラフへ展開する。戻り値 g[i] は「i 文字目から出る辺」。
 * 促音「っ」は後続の辺を参照するため、末尾から前向きに構築する。
 */
export function buildGraph(kana: string): Edge[][] {
  const n = kana.length;
  const g: Edge[][] = Array.from({ length: n + 1 }, () => []);

  for (let i = n - 1; i >= 0; i--) {
    const edges: Edge[] = [];
    const c = kana[i];

    if (c === "ん") {
      edges.push({ len: 1, romaji: nRomaji(kana, i) });
    } else if (c === "っ") {
      // 後続モーラの頭子音を重ねる形（った=tta / っちょ=ccho, ttyo …）。
      const byLen = new Map<number, string[]>();
      for (const e of g[i + 1]) {
        for (const r of e.romaji) {
          const head = r[0];
          // 母音始まり・「ん」始まりは重ねられない（IME でも確定しない）。
          if (!head || VOWELS.includes(head) || head === "n") continue;
          const list = byLen.get(e.len) ?? [];
          list.push(head + r);
          byLen.set(e.len, list);
        }
      }
      for (const [len, list] of byLen) {
        edges.push({ len: 1 + len, romaji: uniq(list) });
      }
      // ltu / xtu 単体（この後に後続モーラを普通に打てば通る）。
      edges.push({ len: 1, romaji: BASE["っ"] });
    } else {
      // 3かな→2かな→1かな の順に長いものを優先して登録。
      // 末尾付近で substr が短く返る場合に、実際より長い辺を作らないよう長さを確認する。
      const three = kana.substr(i, 3);
      if (three.length === 3 && TABLE[three]) edges.push({ len: 3, romaji: TABLE[three] });
      const two = kana.substr(i, 2);
      if (two.length === 2 && TABLE[two]) edges.push({ len: 2, romaji: TABLE[two] });
      if (TABLE[c]) edges.push({ len: 1, romaji: TABLE[c] });
      else edges.push({ len: 1, romaji: [c] }); // 未知の文字は字義通り
    }

    // 歴史的仮名遣いの口語読み。
    for (const e of historicalEdges(kana, i)) edges.push(e);
    const two2 = kana.substr(i, 2);
    if (two2.length === 2 && COLLOQUIAL_DIGRAPH[two2]) {
      edges.push({ len: 2, romaji: COLLOQUIAL_DIGRAPH[two2], alt: true });
    }
    const mono = COLLOQUIAL_MONO[c];
    if (mono) edges.push({ len: 1, romaji: mono, alt: true });
    // 語中のハ行転呼（あはれ→aware、まへ→mae、おもふ→omou）。
    if (i > 0 && HAGYO_SHIFT[c] && !mono) {
      edges.push({ len: 1, romaji: HAGYO_SHIFT[c], alt: true });
    }

    g[i] = mergeEdges(edges);
  }
  return g;
}

/** 同じ len の辺をまとめ、候補を重複なく連結する（先頭ほど推奨のまま）。 */
function mergeEdges(edges: Edge[]): Edge[] {
  const byKey = new Map<string, Edge>();
  for (const e of edges) {
    const key = `${e.len}:${e.alt ? 1 : 0}`;
    const cur = byKey.get(key);
    if (cur) cur.romaji = uniq([...cur.romaji, ...e.romaji]);
    else byKey.set(key, { len: e.len, romaji: uniq(e.romaji), alt: e.alt });
  }
  // 本則を先、口語読みを後に。長い辺から順に並べる（推奨経路が自然になる）。
  return [...byKey.values()].sort((a, b) => {
    if (!!a.alt !== !!b.alt) return a.alt ? 1 : -1;
    return b.len - a.len;
  });
}

// ---------------------------------------------------------------------------
// 表示用の区切り
// ---------------------------------------------------------------------------

/** かな列を表示用のかたまりへ分ける（拗音・促音＋次モーラを1つに）。 */
export function segment(kana: string): Segment[] {
  const out: Segment[] = [];
  let i = 0;
  while (i < kana.length) {
    let len = 1;
    if (kana[i] === "っ" && i + 1 < kana.length) {
      len = TABLE[kana.substr(i + 1, 2)] ? 3 : 2;
    } else if (TABLE[kana.substr(i, 2)] && kana[i] !== "ん") {
      len = 2;
    }
    len = Math.min(len, kana.length - i);
    out.push({ kana: kana.substr(i, len), start: i, end: i + len });
    i += len;
  }
  return out;
}

// ---------------------------------------------------------------------------
// 互換API（既存コード・テスト用）
// ---------------------------------------------------------------------------

export interface Unit {
  kana: string;
  romaji: string[];
}

/** 旧API：表示区切りごとの推奨ローマ字を返す。 */
export function tokenize(kana: string): Unit[] {
  const g = buildGraph(kana);
  return segment(kana).map((s) => {
    // 区切り全体をちょうど覆う辺があればその候補、無ければ推奨経路を連結。
    const exact = g[s.start].find((e) => !e.alt && e.len === s.end - s.start);
    if (exact) return { kana: s.kana, romaji: exact.romaji };
    return { kana: s.kana, romaji: [preferredPath(g, s.start, s.end)] };
  });
}

/**
 * かな列がタイピング可能か検査する（章コンテンツ編集ページ用）。
 * 表に無い文字は「その文字そのものを打つ」辺になってしまい、
 * 半角英数では入力できず先へ進めなくなるため、事前に洗い出す。
 */
export function validateKana(kana: string): { ok: boolean; badChars: string[] } {
  const bad = new Set<string>();
  for (const ch of kana) {
    if (ch === "っ" || ch === "ん") continue;
    if (TABLE[ch]) continue;
    bad.add(ch);
  }
  return { ok: bad.size === 0, badChars: [...bad] };
}

/** i から end までの推奨ローマ字（最短・本則優先）。 */
export function preferredPath(g: Edge[][], from: number, to: number): string {
  const memo = new Map<number, string | null>();
  const walk = (i: number): string | null => {
    if (i === to) return "";
    if (i > to) return null;
    if (memo.has(i)) return memo.get(i)!;
    let best: string | null = null;
    for (const e of g[i]) {
      const rest = walk(i + e.len);
      if (rest === null) continue;
      const cand = e.romaji[0] + rest;
      if (best === null || cand.length < best.length) best = cand;
    }
    memo.set(i, best);
    return best;
  };
  return walk(from) ?? "";
}
