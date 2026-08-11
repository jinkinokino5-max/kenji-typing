import type { Story } from "./story";

// 章の「分割（#1／#2…）」ヘルパー。
//
// 1章あたりの問題数が多いと途中で飽きてしまうため、意味の切れ目で
// 10問前後に区切り、`よだかの星 #1 みにくい鳥` のような小分けの章として並べる。
// 原本の Story はそのまま残し、ここで派生の Story 配列を作る方式にしている
//（原文・kana は一切書き換えず、範囲を切り出して id を振り直すだけ）。

export interface StoryPart {
  /** 原本 questions の何番目から何番目までか（1始まり・両端を含む）。 */
  from: number;
  to: number;
  /** 小見出し（例: "みにくい鳥"）。一覧に `#1  みにくい鳥` と出る。 */
  label: string;
  /** この部だけの導入テキスト。省略時は原本の導入をそのまま使う。 */
  intro?: string[];
  /** ノーミス達成時のバッジ名。省略時は小見出しをそのまま使う。 */
  noMissBadge?: string;
  /** 部ごとに難易度を変えたいときだけ指定（既定は原本と同じ）。 */
  difficulty?: number;
}

/**
 * 章を複数の部へ分割する。
 * key は `<原本key>-1`, `-2` … となり、テーマ／BGM は
 * baseStoryKey() で原本キーへ丸めて引く（themes.ts / tracks.ts 参照）。
 */
export function splitStory(base: Story, parts: StoryPart[]): Story[] {
  return parts.map((p, i) => ({
    ...base,
    key: `${base.key}-${i + 1}`,
    title: `${base.title} #${i + 1}`,
    difficulty: p.difficulty ?? base.difficulty,
    noMissBadge: p.noMissBadge ?? p.label,
    intro: [...(p.intro ?? base.intro)],
    questions: base.questions
      .slice(p.from - 1, p.to)
      .map((q, j) => ({ ...q, id: j + 1 })),
    part: {
      baseKey: base.key,
      baseTitle: base.title,
      label: p.label,
      index: i + 1,
      total: parts.length,
    },
  }));
}

/** `yodaka-2` → `yodaka`。分割されていないキーはそのまま返す。 */
export function baseStoryKey(key: string): string {
  return key.replace(/-\d+$/, "");
}

/** 一覧表示用のまとまり。分割章は parts が複数になる。 */
export interface StoryGroup {
  /** 分割章は原本キー、通常章はその章のキー。 */
  baseKey: string;
  /** 章題（分割章は #N を含まない元の題）。 */
  title: string;
  chapter: string;
  parts: Story[];
  /** 分割章かどうか（false なら parts は1件）。 */
  split: boolean;
}

/** 章リストを「章のまとまり」へ畳む（ホーム／きろくで共用）。 */
export function groupStories(list: Story[]): StoryGroup[] {
  const out: StoryGroup[] = [];
  for (let i = 0; i < list.length; ) {
    const s = list[i];
    if (!s.part) {
      out.push({ baseKey: s.key, title: s.title, chapter: s.chapter, parts: [s], split: false });
      i++;
      continue;
    }
    const baseKey = s.part.baseKey;
    const parts = list.filter((x) => x.part?.baseKey === baseKey);
    out.push({ baseKey, title: s.part.baseTitle, chapter: s.chapter, parts, split: true });
    i += parts.length;
  }
  return out;
}
