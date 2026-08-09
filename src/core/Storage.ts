// LocalStorage による進捗セーブ。作品別記録・KP・総打鍵・バッジ・設定を保持。

export interface StoryRecord {
  score: number;
  rank: string;
  readRate: number;
}

/** プレイ中の見せ方の設定（せってい画面から切り替える）。 */
export interface Options {
  /** 次に打つローマ字を全文表示する。 */
  showGuide: boolean;
  /** 文字を大きく・背景を暗くして見やすくする。 */
  highContrast: boolean;
  /** 速度・正確率をプレイ中に表示する。 */
  showStats: boolean;
}

export const DEFAULT_OPTIONS: Options = {
  showGuide: true,
  highContrast: false,
  showStats: true,
};

export interface SaveData {
  bestScore: number;
  bestRank: string;
  readRate: number;
  totalKeys: number;
  kp: number; // 文学知識ポイント（1正答=1KP）
  badges: string[];
  perStory: Record<string, StoryRecord>;
  muted: boolean;
  options: Options;
  /** 期待キー別の累積ミス回数（苦手キー分析）。 */
  weakKeys: Record<string, number>;
}

const KEY = "kenji-typing.save.v1";

const DEFAULT: SaveData = {
  bestScore: 0,
  bestRank: "-",
  readRate: 0,
  totalKeys: 0,
  kp: 0,
  badges: [],
  perStory: {},
  muted: false,
  options: { ...DEFAULT_OPTIONS },
  weakKeys: {},
};

export function load(): SaveData {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { ...DEFAULT, options: { ...DEFAULT_OPTIONS }, weakKeys: {} };
    const parsed = JSON.parse(raw) as Partial<SaveData>;
    // options は入れ子なので、既存セーブに足りないキーを既定値で補う。
    return {
      ...DEFAULT,
      ...parsed,
      options: { ...DEFAULT_OPTIONS, ...(parsed.options ?? {}) },
      weakKeys: { ...(parsed.weakKeys ?? {}) },
    };
  } catch {
    return { ...DEFAULT, options: { ...DEFAULT_OPTIONS }, weakKeys: {} };
  }
}

export function save(data: SaveData): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(data));
  } catch {
    /* 保存不可でも進行は妨げない */
  }
}

/** ステージ結果をマージして保存。 */
export function recordStage(
  cur: SaveData,
  opts: {
    storyKey: string;
    score: number;
    rank: string;
    readRate: number;
    keys: number;
    kp: number;
    badges: string[];
    /** この回の期待キー別ミス数（累積へ加算）。 */
    missByKey?: Record<string, number>;
  },
): SaveData {
  const prev = cur.perStory[opts.storyKey];
  const weakKeys = { ...cur.weakKeys };
  for (const [k, v] of Object.entries(opts.missByKey ?? {})) {
    weakKeys[k] = (weakKeys[k] ?? 0) + v;
  }
  const merged: SaveData = {
    ...cur,
    weakKeys,
    bestScore: Math.max(cur.bestScore, opts.score),
    bestRank: betterRank(cur.bestRank, opts.rank),
    readRate: Math.max(cur.readRate, opts.readRate),
    totalKeys: cur.totalKeys + opts.keys,
    kp: cur.kp + opts.kp,
    badges: Array.from(new Set([...cur.badges, ...opts.badges])),
    perStory: {
      ...cur.perStory,
      [opts.storyKey]: {
        score: Math.max(prev?.score ?? 0, opts.score),
        rank: betterRank(prev?.rank ?? "-", opts.rank),
        readRate: Math.max(prev?.readRate ?? 0, opts.readRate),
      },
    },
  };
  save(merged);
  return merged;
}

/** ミュート設定を保存して返す。 */
export function setMuted(cur: SaveData, muted: boolean): SaveData {
  const merged = { ...cur, muted };
  save(merged);
  return merged;
}

/** 表示設定を1項目だけ更新して保存。 */
export function setOption<K extends keyof Options>(
  cur: SaveData,
  key: K,
  value: Options[K],
): SaveData {
  const merged: SaveData = { ...cur, options: { ...cur.options, [key]: value } };
  save(merged);
  return merged;
}

/** 苦手キーを多い順に返す。 */
export function weakKeyRanking(cur: SaveData, limit = 5): Array<{ key: string; count: number }> {
  return Object.entries(cur.weakKeys)
    .map(([key, count]) => ({ key, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}

/** 苦手キーの記録をリセット。 */
export function clearWeakKeys(cur: SaveData): SaveData {
  const merged: SaveData = { ...cur, weakKeys: {} };
  save(merged);
  return merged;
}

/** 総打鍵からレベルを算出（1000打鍵ごとにLv+1）。 */
export function levelOf(totalKeys: number): number {
  return Math.floor(totalKeys / 1000) + 1;
}

// ---- 章コンテンツの上書き（編集ページ用）----
// 原本 src/data/*.ts は温存し、編集内容はここ（別キー）に保存する。
// 起動時＆保存直後に data/content.ts が各 Story へ適用する。

export interface QuestionEdit {
  id: number;
  text: string;
  kana: string;
  fx?: string; // オノマトペ章の情景エフェクト種別（あれば保持）
}

export interface StoryOverride {
  title?: string;
  intro?: string[];
  questions?: QuestionEdit[];
}

export type ContentOverrides = Record<string, StoryOverride>;

const CONTENT_KEY = "kenji-typing.content.v1";

export function loadContent(): ContentOverrides {
  try {
    const raw = localStorage.getItem(CONTENT_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as ContentOverrides;
  } catch {
    return {};
  }
}

export function saveContent(o: ContentOverrides): void {
  try {
    localStorage.setItem(CONTENT_KEY, JSON.stringify(o));
  } catch {
    /* 保存不可でも進行は妨げない */
  }
}

/** 1章分の上書きをマージ保存して全体を返す。 */
export function setStoryOverride(key: string, ov: StoryOverride): ContentOverrides {
  const all = loadContent();
  all[key] = ov;
  saveContent(all);
  return all;
}

/** 1章分の上書きを削除して全体を返す（デフォルトに戻す）。 */
export function clearStoryOverride(key: string): ContentOverrides {
  const all = loadContent();
  delete all[key];
  saveContent(all);
  return all;
}

const ORDER = ["-", "E", "D", "C", "B", "A", "S"];
function betterRank(a: string, b: string): string {
  return ORDER.indexOf(b) > ORDER.indexOf(a) ? b : a;
}
