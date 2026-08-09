import { buildGraph, segment, type Edge, type Segment } from "./kanaRomaji";

export type InputResult = "progress" | "unit-done" | "all-done" | "miss";

export interface UnitView {
  kana: string;
  status: "done" | "current" | "pending";
}

/** ローマ字ガイドの表示内容。text の先頭 typedLen 文字が入力済み。 */
export interface RomajiGuide {
  text: string;
  typedLen: number;
}

/** 到達しうる状態：かな列の位置と、その位置で打ちかけのローマ字。 */
interface State {
  pos: number;
  typed: string;
}

/**
 * 1問分の逐次タイピング判定。
 *
 * かな列を入力グラフへ展開し、「今どこに居られるか」を状態集合で持つ。
 * 打鍵ごとに全状態を進め、1つでも生き残れば正打、全滅なら打ち間違い。
 * これにより ki+lyo / kyo、n / nn、cho / tyo / cyo、文語の口語読みなどを
 * すべて同時に受理でき、しかも「かな何文字目まで確定したか」を見失わない。
 */
export class TypingEngine {
  private readonly graph: Edge[][];
  private readonly segs: Segment[];
  private readonly tail: string[]; // tail[i] = i 以降の推奨ローマ字
  private readonly tailCost: number[]; // 同上のコスト（口語読み経由には加点）
  private readonly n: number;
  private states: State[];
  private segIndex = 0;

  /** 正しく受理した打鍵の履歴（ローマ字ガイドの既打部分）。 */
  private history = "";

  correctKeys = 0;
  mistakes = 0;
  /** 直近のミス：打ったキーと、そこで期待されていたキー。 */
  lastMissKey = "";
  lastMissExpected = "";
  /** 期待キー別のミス回数（苦手キー分析用）。 */
  readonly missByKey = new Map<string, number>();

  readonly kana: string;
  readonly kanaLength: number;
  readonly romajiLength: number;

  constructor(kana: string) {
    this.kana = kana;
    this.n = kana.length;
    this.graph = buildGraph(kana);
    this.segs = segment(kana);
    const tails = buildTails(this.graph, this.n);
    this.tail = tails.text;
    this.tailCost = tails.cost;
    this.states = [{ pos: 0, typed: "" }];
    this.kanaLength = this.n;
    this.romajiLength = this.tail[0].length;
  }

  get done(): boolean {
    return this.states.some((s) => s.pos >= this.n && s.typed === "");
  }

  /** かな列の確定済み位置（どの状態でも到達済みと言える位置）。 */
  get commitPos(): number {
    return this.states.reduce((m, s) => Math.min(m, s.pos), this.n);
  }

  /** 0..1 の進捗（ローマ字ベース）。 */
  get progress(): number {
    const total = this.romajiLength || 1;
    return Math.min(1, this.history.length / total);
  }

  /** 1キー入力。判定結果を返す。 */
  input(c: string): InputResult {
    if (this.done) return "all-done";

    const next: State[] = [];
    const seen = new Set<string>();
    const push = (s: State) => {
      const key = `${s.pos}:${s.typed}`;
      if (seen.has(key)) return;
      seen.add(key);
      next.push(s);
    };

    for (const s of this.states) {
      const t = s.typed + c;
      for (const e of this.graph[s.pos] ?? []) {
        for (const r of e.romaji) {
          if (r === t) push({ pos: s.pos + e.len, typed: "" });
          else if (r.startsWith(t)) push({ pos: s.pos, typed: t });
        }
      }
    }

    if (next.length === 0) {
      this.mistakes++;
      this.lastMissKey = c;
      this.lastMissExpected = this.expectedKeys()[0] ?? "";
      if (this.lastMissExpected) {
        const k = this.lastMissExpected;
        this.missByKey.set(k, (this.missByKey.get(k) ?? 0) + 1);
      }
      return "miss";
    }

    this.states = next;
    this.history += c;
    this.correctKeys++;
    this.lastMissKey = "";

    if (this.done) {
      this.segIndex = this.segs.length;
      return "all-done";
    }
    const pos = this.commitPos;
    let idx = 0;
    while (idx < this.segs.length && this.segs[idx].end <= pos) idx++;
    if (idx > this.segIndex) {
      this.segIndex = idx;
      return "unit-done";
    }
    return "progress";
  }

  /** 表示用：かたまりごとの状態。 */
  view(): UnitView[] {
    const pos = this.commitPos;
    return this.segs.map((s) => ({
      kana: s.kana,
      status: s.end <= pos ? "done" : s.start <= pos ? "current" : "pending",
    }));
  }

  /** 現在打ちかけのローマ字（推奨経路上のもの）。 */
  get pendingRomaji(): string {
    return this.bestState().typed;
  }

  /** 現かたまりの残りローマ字（旧API互換のヒント）。 */
  get currentHint(): string {
    const s = this.bestState();
    return this.remainingFrom(s);
  }

  /**
   * 問題全体のローマ字ガイド。既に打った分はそのまま残し、
   * 残りは「本則優先・最短」の経路で埋める。
   */
  guide(): RomajiGuide {
    const s = this.bestState();
    return { text: this.history + this.remainingFrom(s), typedLen: this.history.length };
  }

  /** 次に押せるキー（推奨キーが先頭）。 */
  expectedKeys(): string[] {
    const best = this.bestState();
    const first = this.remainingFrom(best)[0] ?? "";
    const out = new Set<string>();
    if (first) out.add(first);
    for (const s of this.states) {
      for (const e of this.graph[s.pos] ?? []) {
        for (const r of e.romaji) {
          if (r.length > s.typed.length && r.startsWith(s.typed)) out.add(r[s.typed.length]);
        }
      }
    }
    return [...out];
  }

  // ---- 内部 ----

  /** 残りが最短（かつ本則寄り）の状態を選ぶ。 */
  private bestState(): State {
    let best = this.states[0];
    let bestCost = Infinity;
    for (const s of this.states) {
      const cost = this.remaining(s).cost;
      if (cost < bestCost) {
        bestCost = cost;
        best = s;
      }
    }
    return best;
  }

  /** その状態から問題末尾までの推奨ローマ字。 */
  private remainingFrom(s: State): string {
    return this.remaining(s).text;
  }

  private remaining(s: State): { text: string; cost: number } {
    if (s.pos >= this.n && s.typed === "") return { text: "", cost: 0 };
    let best: { text: string; cost: number } | null = null;
    for (const e of this.graph[s.pos] ?? []) {
      const rest = this.tail[s.pos + e.len];
      if (rest === undefined) continue;
      const restCost = this.tailCost[s.pos + e.len];
      for (const r of e.romaji) {
        if (!r.startsWith(s.typed)) continue;
        const text = r.slice(s.typed.length) + rest;
        const cost = r.length - s.typed.length + (e.alt ? ALT_PENALTY : 0) + restCost;
        if (best === null || cost < best.cost) best = { text, cost };
      }
    }
    return best ?? { text: "", cost: 0 };
  }
}

// 口語読み（歴史的仮名遣いの読み替え）経由の経路は、受理はするが
// ガイド表示・スコア用の基準長には使わない。そのための重み。
const ALT_PENALTY = 1000;

/** 位置 i から末尾までの推奨ローマ字とそのコスト（本則優先・最短）。 */
function buildTails(graph: Edge[][], n: number): { text: string[]; cost: number[] } {
  const text: string[] = new Array(n + 1);
  const cost: number[] = new Array(n + 1);
  text[n] = "";
  cost[n] = 0;
  for (let i = n - 1; i >= 0; i--) {
    let bestText: string | null = null;
    let bestCost = Infinity;
    for (const e of graph[i] ?? []) {
      const rest = text[i + e.len];
      if (rest === undefined) continue;
      const c = e.romaji[0].length + (e.alt ? ALT_PENALTY : 0) + cost[i + e.len];
      if (c < bestCost) {
        bestCost = c;
        bestText = e.romaji[0] + rest;
      }
    }
    text[i] = bestText ?? "";
    cost[i] = bestText === null ? 0 : bestCost;
  }
  return { text, cost };
}
