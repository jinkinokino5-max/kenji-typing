import type { Story, Question, OnomaFx } from "./story";
import { STORIES } from "./stories";
import {
  loadContent,
  setStoryOverride,
  clearStoryOverride,
  type StoryOverride,
  type QuestionEdit,
} from "../core/Storage";

// 章コンテンツの上書き適用・復元。
// 原本（ビルド時データ）のスナップショットを保持し、LocalStorage の
// 上書きを各 Story オブジェクトへ「その場で」書き換えて反映する。
// Story/Question は同一参照で全画面から使われるため、代入だけで反映される。

// 原本スナップショット（他コードが STORIES を変更する前に確保）。
const BASE: Record<string, Story> = {};
for (const s of STORIES) BASE[s.key] = structuredClone(s);

function castFx(fx?: string): OnomaFx | undefined {
  return fx === "wind" || fx === "water" || fx === "light" ? fx : undefined;
}

/** 上書きを 1 章へ適用（該当フィールドのみ差し替え）。 */
function applyOne(s: Story, ov: StoryOverride): void {
  if (ov.title) s.title = ov.title;
  if (ov.intro) s.intro = [...ov.intro];
  if (ov.questions) {
    s.questions = ov.questions.map((q, i): Question => ({
      id: q.id ?? i + 1,
      text: q.text,
      kana: q.kana,
      fx: castFx(q.fx),
    }));
  }
}

/** 保存済みの全上書きを STORIES に適用（起動時・保存直後に呼ぶ）。 */
export function applyContentOverrides(): void {
  const all = loadContent();
  for (const s of STORIES) {
    const ov = all[s.key];
    if (ov) applyOne(s, ov);
  }
}

/** 1 章を原本へ戻し、上書きも削除する。 */
export function resetStory(key: string): void {
  const s = STORIES.find((x) => x.key === key);
  const base = BASE[key];
  if (s && base) {
    s.title = base.title;
    s.intro = [...base.intro];
    s.questions = base.questions.map((q) => ({ ...q }));
  }
  clearStoryOverride(key);
}

/** 編集フォームの初期値に使う「現在の（適用後）Story」。 */
export function readStoryForEdit(key: string): Story | undefined {
  return STORIES.find((s) => s.key === key);
}

/** 編集内容を保存し、即座に反映する。 */
export function saveStoryEdit(
  key: string,
  data: { title: string; intro: string[]; questions: QuestionEdit[] },
): void {
  setStoryOverride(key, {
    title: data.title,
    intro: data.intro,
    questions: data.questions,
  });
  applyContentOverrides();
}
