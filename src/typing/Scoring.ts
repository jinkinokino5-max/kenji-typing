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
  const accMult = Math.max(0, 1 - q.mistakes / Math.max(1, q.kanaLength));
  const penalty = q.mistakes * 20;
  const score = Math.max(0, Math.round(base * speedMult * accMult - penalty));
  return { score, speedMult, accMult };
}

export interface StageInput {
  sumScore: number;
  totalQuestions: number;
  perfectQuestions: number; // ミス0で打ち切った問題数
  totalMistakes: number;
  avgSpeedMult: number;
}

export interface StageResult {
  total: number;
  rank: string;
  bonuses: { label: string; value: number }[];
}

export function stageResult(s: StageInput): StageResult {
  const bonuses: { label: string; value: number }[] = [];
  if (s.totalMistakes === 0 && s.totalQuestions > 0) {
    bonuses.push({ label: "完璧クリア (正答率100%)", value: 5000 });
    bonuses.push({ label: "ノーミス達成", value: 2000 });
  } else if (s.perfectQuestions === s.totalQuestions && s.totalQuestions > 0) {
    bonuses.push({ label: "ノーミス達成", value: 2000 });
  }
  if (s.avgSpeedMult >= 1.5) {
    bonuses.push({ label: "速度S評価", value: 1000 });
  }
  const total = s.sumScore + bonuses.reduce((n, b) => n + b.value, 0);
  return { total, rank: rankOf(total), bonuses };
}

export function rankOf(total: number): string {
  if (total >= 9000) return "S";
  if (total >= 7000) return "A";
  if (total >= 5000) return "B";
  if (total >= 3000) return "C";
  if (total >= 1000) return "D";
  return "E";
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}
