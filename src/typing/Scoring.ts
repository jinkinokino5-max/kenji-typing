// 企画書 3.5 のスコアリング式を実装。

export interface QuestionInput {
  kanaLength: number;
  romajiLength: number;
  mistakes: number;
  elapsedSec: number;
}

export interface QuestionScore {
  score: number;
  speedMult: number;
  accMult: number;
}

const BASELINE_CPS = 4.5; // 想定平均打鍵速度（char/sec）

export function scoreQuestion(q: QuestionInput): QuestionScore {
  const base = q.kanaLength * 10;
  const expected = q.romajiLength / BASELINE_CPS;
  const actual = Math.max(0.3, q.elapsedSec);
  const speedMult = clamp(expected / actual, 0.5, 2.5);
  // ミスは 1 回あたり 5% 減点。何回ミスしても素点の半分は残る（打ち切った時点で最低限の評価を保証）。
  const accMult = Math.max(0.5, 1 - q.mistakes * 0.05);
  const score = Math.max(0, Math.round(base * speedMult * accMult));
  return { score, speedMult, accMult };
}

export interface StageInput {
  sumScore: number;
  totalQuestions: number;
  perfectQuestions: number; // ミス0で打ち切った問題数
  totalMistakes: number;
  avgSpeedMult: number;
  /** 基準点＝等速（speedMult=1）・ノーミスで全問打ったときの素点。順位はこれに対する割合で決める。 */
  parScore: number;
}

export interface StageResult {
  total: number;
  rank: string;
  bonuses: { label: string; value: number }[];
}

export function stageResult(s: StageInput): StageResult {
  const bonuses: { label: string; value: number }[] = [];
  // ボーナスは「あれば嬉しいおまけ」。ミスがあっても順位が届くよう、基準点に比例した控えめな額にする。
  const par = Math.max(1, s.parScore);
  if (s.totalMistakes === 0 && s.totalQuestions > 0) {
    bonuses.push({ label: "完璧クリア (正答率100%)", value: Math.round(par * 0.2) });
    bonuses.push({ label: "ノーミス達成", value: Math.round(par * 0.1) });
  } else if (s.perfectQuestions === s.totalQuestions && s.totalQuestions > 0) {
    bonuses.push({ label: "ノーミス達成", value: Math.round(par * 0.1) });
  }
  if (s.avgSpeedMult >= 1.5) {
    bonuses.push({ label: "速度S評価", value: Math.round(par * 0.1) });
  }
  const total = s.sumScore + bonuses.reduce((n, b) => n + b.value, 0);
  return { total, rank: rankOf(total / par), bonuses };
}

/** ratio = 総得点 ÷ 基準点。1.0 ＝ 等速でノーミスの素点。 */
export function rankOf(ratio: number): string {
  if (ratio >= 1.5) return "S";
  if (ratio >= 1.2) return "A";
  if (ratio >= 0.95) return "B";
  if (ratio >= 0.7) return "C";
  if (ratio >= 0.45) return "D";
  return "E";
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}
