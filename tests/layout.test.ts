// 画面レイアウトの自動検証。
// 実ブラウザを使わず、描画呼び出しを記録するモック 2D コンテキストへ各シーンを
// 描かせて「仮想解像度 480x270 からはみ出していないか」「文字どうしが重なって
// いないか」を確かめる。ドット絵の固定解像度ゆえ、はみ出し＝そのまま見切れになる。

import {
  rec, resetRecorder, makeHarness, check, report, type TextDraw,
} from "./harness";

const { VIRTUAL_W, VIRTUAL_H } = await import("../src/core/Renderer");
const { GameScene } = await import("../src/scenes/GameScene");
const { SettingsScene } = await import("../src/scenes/SettingsScene");
const { RecordsScene } = await import("../src/scenes/RecordsScene");
const { HowToScene } = await import("../src/scenes/HowToScene");
const { FeedbackScene } = await import("../src/scenes/FeedbackScene");
const { HomeScene } = await import("../src/scenes/HomeScene");
const { ResultScene } = await import("../src/scenes/ResultScene");
const { STORIES } = await import("../src/data/stories");
const { DEFAULT_OPTIONS } = await import("../src/core/Storage");

type AnyScene = {
  update(dt: number, c: never): void;
  draw(c: never): void;
  enter?(c: never): void;
};

/** 1〜数フレーム描かせて、はみ出しと文字の重なりを検査する。 */
function inspect(
  name: string,
  scene: AnyScene,
  sceneCtx: unknown,
  frames = 2,
  /** 前面オーバーレイを持つ画面は、背面との重なりが設計どおりなので分けて見る。 */
  hasOverlay = false,
): void {
  resetRecorder();
  const c = sceneCtx as never;
  scene.enter?.(c);
  for (let i = 0; i < frames; i++) {
    scene.update(1 / 60, c);
    scene.draw(c);
  }

  const over = rec.texts.filter(
    (t) => t.left < -1 || t.right > VIRTUAL_W + 1 || t.top < -1 || t.bottom > VIRTUAL_H + 1,
  );
  check(
    `画面内に収まる: ${name}`,
    over.length === 0,
    over
      .slice(0, 3)
      .map(
        (t) =>
          `"${t.text}" x[${t.left.toFixed(0)},${t.right.toFixed(0)}] y[${t.top.toFixed(0)},${t.bottom.toFixed(0)}]`,
      )
      .join(" / "),
  );
  check(`何か描かれている: ${name}`, rec.texts.length > 0);

  // オーバーレイ付きの画面は、最後の全画面塗りより後に描かれた分だけを見る。
  let targets = rec.texts;
  if (hasOverlay) {
    const cover = rec.rects
      .filter((r) => r.w >= VIRTUAL_W && r.h >= VIRTUAL_H)
      .reduce((m, r) => Math.max(m, r.seq), -1);
    targets = rec.texts.filter((t) => t.seq > cover);
    check(`オーバーレイに文字がある: ${name}`, targets.length > 0);
  }
  const clashes = findClashes(targets);
  check(
    `文字が重ならない: ${name}`,
    clashes.length === 0,
    clashes.slice(0, 3).map((c2) => `"${c2[0]}" × "${c2[1]}"`).join(" / "),
  );
}

/**
 * 重なっている文字ペアを探す。
 * drawText は影→本体の2回描くので、同じ文字列どうしは無視する。
 * 同じ行に並ぶ文字は x が接するだけなので、1.5px 超の重なりのみ数える。
 */
function findClashes(texts: TextDraw[]): Array<[string, string]> {
  const out: Array<[string, string]> = [];
  for (let i = 0; i < texts.length; i++) {
    for (let j = i + 1; j < texts.length; j++) {
      const a = texts[i];
      const b = texts[j];
      if (a.text === b.text) continue; // 影と本体、または同一文字の再描画
      if (a.text.trim() === "" || b.text.trim() === "") continue;
      const ox = Math.min(a.right, b.right) - Math.max(a.left, b.left);
      const oy = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
      if (ox > 1.5 && oy > 1.5) out.push([a.text, b.text]);
    }
  }
  return out;
}

/** もっとも溢れやすい（本文＋かなが最長の）章。 */
function worstStory() {
  let worst = STORIES[0];
  let worstLen = 0;
  for (const s of STORIES) {
    const m = Math.max(...s.questions.map((q) => q.kana.length + q.text.length));
    if (m > worstLen) {
      worstLen = m;
      worst = s;
    }
  }
  return worst;
}

// ---- プレイ画面：設定の全組合せ ----
const OPTION_SETS = [
  { showGuide: true, showStats: true, highContrast: false },
  { showGuide: true, showStats: true, highContrast: true },
  { showGuide: false, showStats: false, highContrast: false },
  { showGuide: false, showStats: false, highContrast: true },
];

for (const opts of OPTION_SETS) {
  const label = `guide=${opts.showGuide ? 1 : 0} hc=${opts.highContrast ? 1 : 0}`;
  const story = worstStory();

  inspect(`プレイ画面 (${label})`, new GameScene(story), makeHarness(opts).ctx);

  // 打鍵途中（ガイドが色分けされている状態）
  {
    const h = makeHarness(opts);
    const gs = new GameScene(story);
    h.input.type("yo");
    gs.update(1 / 60, h.ctx as never);
    inspect(`プレイ画面・打鍵中 (${label})`, gs, h.ctx);
  }

  // ミス直後（フィードバック行が出ている状態）
  {
    const h = makeHarness(opts);
    const gs = new GameScene(story);
    h.input.type("zzz");
    gs.update(1 / 60, h.ctx as never);
    inspect(`プレイ画面・ミス直後 (${label})`, gs, h.ctx);
  }

  // IME警告が出ている状態（帯が本文に被らないか）
  {
    const h = makeHarness(opts);
    h.input.imeSuspected = true;
    inspect(`プレイ画面・IME警告 (${label})`, new GameScene(story), h.ctx);
    check(
      `IME警告が表示される (${label})`,
      rec.texts.some((t) => t.text.includes("日本語入力")),
    );
  }

  // ポーズ
  {
    const h = makeHarness(opts);
    const gs = new GameScene(story);
    h.input.press("Escape");
    gs.update(1 / 60, h.ctx as never);
    h.input.endFrame();
    inspect(`ポーズ画面 (${label})`, gs, h.ctx, 2, true);
  }
}

// ---- 各画面 ----
inspect("せってい", new SettingsScene(), makeHarness({ ...DEFAULT_OPTIONS }).ctx);
inspect("あそびかた", new HowToScene(), makeHarness({ ...DEFAULT_OPTIONS }).ctx);
inspect("ごいけん", new FeedbackScene(), makeHarness({ ...DEFAULT_OPTIONS }).ctx);

{
  // ホームの機能メニュー：感想の入口があり、編集の入口は出ていないこと。
  inspect("ホーム", new HomeScene(), makeHarness({ ...DEFAULT_OPTIONS }).ctx);
  const labels = rec.texts.map((t) => t.text);
  check("ホームに「ごいけん」がある", labels.some((t) => t.includes("ごいけん")));
  check("ホームに「編集」は出ない", !labels.some((t) => t.includes("編集")));
}

{
  // 分割章をひらいた状態のホーム（#1… が章の下にぶら下がる）。
  inspect("ホーム（章をひらく）", new HomeScene("yodaka-2"), makeHarness({ ...DEFAULT_OPTIONS }).ctx);
  const labels = rec.texts.map((t) => t.text);
  check("ひらいた章に #1 が出る", labels.some((t) => t.startsWith("#1")));
  check("ひらいた章に #3 が出る", labels.some((t) => t.startsWith("#3")));
  check("章の見出しに #  は付かない", labels.some((t) => t.includes("よだかの星") && !t.includes("#")));
}

{
  // 小見出しがいちばん長い章をひらいても、問題数の列にぶつからないこと。
  inspect("ホーム（長い小見出し）", new HomeScene("eiketsu-1"), makeHarness({ ...DEFAULT_OPTIONS }).ctx);
}

{
  // 記録が詰まった状態（全章クリア・バッジ多数）で溢れないか。
  const h = makeHarness({ ...DEFAULT_OPTIONS });
  const save = (h.ctx.state as { save: Record<string, unknown> }).save;
  save.totalKeys = 123456;
  save.kp = 359;
  save.bestScore = 99999;
  save.bestRank = "S";
  save.perStory = Object.fromEntries(
    STORIES.map((s) => [s.key, { score: 9999, rank: "S", readRate: 100 }]),
  );
  save.badges = STORIES.slice(0, 3).map((s) => s.noMissBadge);
  save.weakKeys = { k: 12, y: 9, p: 7, q: 5, z: 4, x: 3 };
  inspect("きろく（満杯）", new RecordsScene(), h.ctx);
}

{
  const h = makeHarness({ ...DEFAULT_OPTIONS });
  (h.ctx.state as { lastOutcome: unknown }).lastOutcome = {
    storyKey: STORIES[0].key,
    storyTitle: STORIES[0].title,
    total: 12345,
    rank: "S",
    correctQuestions: 20,
    totalQuestions: 20,
    accuracyPct: 100,
    avgSpeed: 1.82,
    bonuses: [],
    badges: [STORIES[0].noMissBadge, `${STORIES[0].title} 達人`],
    readRate: 100,
    keysPerSec: 4.6,
    keyAccuracyPct: 97,
    maxCombo: 88,
    totalKeys: 640,
    missByKey: { k: 4, y: 3, n: 2, o: 1, u: 1 },
  };
  inspect("リザルト", new ResultScene(), h.ctx, 60);
}

report("レイアウト検証");
