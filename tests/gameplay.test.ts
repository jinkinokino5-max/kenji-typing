// プレイの通し検証。GameScene を実際に動かし、
// 打鍵→問題送り→ステージ完了→リザルト受け渡し までが繋がることを確かめる。

import { makeHarness, check, report, rec, resetRecorder, type Harness } from "./harness";

const { GameScene } = await import("../src/scenes/GameScene");
const { ResultScene } = await import("../src/scenes/ResultScene");
const { HomeScene } = await import("../src/scenes/HomeScene");
const { TypingEngine } = await import("../src/typing/TypingEngine");
const { STORIES, storyByKey } = await import("../src/data/stories");
const { DEFAULT_OPTIONS } = await import("../src/core/Storage");

const DT = 1 / 60;

/** 1フレーム進める（入力は事前に h.input へ積む）。 */
function step(scene: { update(dt: number, c: never): void }, h: Harness, dt = DT): void {
  scene.update(dt, h.ctx as never);
  h.input.endFrame();
}

/**
 * 章を最後まで打ち切る。各問は推奨ローマ字を1文字ずつ流し込む。
 * 問題送りの待ち時間も dt を進めて消化する。
 */
function playStory(storyKey: string, opts = { ...DEFAULT_OPTIONS }) {
  const story = storyByKey(storyKey)!;
  const h = makeHarness(opts);
  const gs = new GameScene(story);
  gs.enter(h.ctx as never);

  for (const q of story.questions) {
    const romaji = new TypingEngine(q.kana).guide().text;
    for (const ch of romaji) {
      h.input.type(ch);
      step(gs, h);
    }
    // 正解演出（0.5秒）を消化して次の問題へ。
    for (let i = 0; i < 40; i++) step(gs, h);
  }
  // 締め演出（最長2.8秒）を消化。
  for (let i = 0; i < 240; i++) step(gs, h);
  return { h, gs, story };
}

// ---- 1章まるごと通しプレイ ----
{
  const { h, story } = playStory("yodaka");
  const out = (h.ctx.state as { lastOutcome: Record<string, unknown> | null }).lastOutcome;
  check("通しプレイ: リザルトへ遷移した", h.lastScene() instanceof ResultScene);
  check("通しプレイ: 成績が記録された", out !== null);
  if (out) {
    check("全問正解", out.correctQuestions === story.questions.length, String(out.correctQuestions));
    check("ノーミス（正確率100%）", out.keyAccuracyPct === 100, String(out.keyAccuracyPct));
    check("打鍵数が計上されている", (out.totalKeys as number) > 100, String(out.totalKeys));
    check("打鍵速度が正の値", (out.keysPerSec as number) > 0, String(out.keysPerSec));
    check("最大コンボが記録された", (out.maxCombo as number) > 0, String(out.maxCombo));
    check("苦手キーは空", Object.keys(out.missByKey as object).length === 0);
    check("ランクが付いた", typeof out.rank === "string" && out.rank !== "");
  }
  const save = (h.ctx.state as { save: Record<string, unknown> }).save;
  check("セーブに総打鍵が加算された", (save.totalKeys as number) > 100);
  check("セーブにKPが加算された", (save.kp as number) === story.questions.length);
}

// ---- 詩歌編（締め演出あり）でも完走できる ----
{
  const { h } = playStory("eiketsu");
  check("詩歌編も完走してリザルトへ", h.lastScene() instanceof ResultScene);
}

// ---- 「問 n/N」が総数を超えない（締め演出中も含む） ----
// 最終問題を解き終えると内部カウンタは総数に達する。締め演出は
// その間も描画されるため、表示だけは総数で止める必要がある。
for (const key of ["yodaka", "eiketsu"]) {
  const story = storyByKey(key)!;
  const h = makeHarness({ ...DEFAULT_OPTIONS });
  const gs = new GameScene(story);
  gs.enter(h.ctx as never);
  const seen: string[] = [];

  const snap = () => {
    resetRecorder();
    gs.draw(h.ctx as never);
    for (const t of rec.texts) if (t.text.startsWith("問 ")) seen.push(t.text);
  };

  for (const q of story.questions) {
    snap();
    for (const ch of new TypingEngine(q.kana).guide().text) {
      h.input.type(ch);
      step(gs, h);
    }
    for (let i = 0; i < 40; i++) step(gs, h);
  }
  // 締め演出の最中も表示を確認する。
  for (let i = 0; i < 120; i++) {
    step(gs, h);
    if (h.lastScene() instanceof ResultScene) break;
    snap();
  }

  const total = story.questions.length;
  const over = seen.filter((t) => {
    const m = /^問 (\d+)\/(\d+)$/.exec(t);
    return !m || Number(m[1]) > Number(m[2]);
  });
  check(`${key}: 「問 n/N」を採取できた`, seen.length > 0, String(seen.length));
  check(`${key}: 表示が総数 ${total} を超えない`, over.length === 0, over[0] ?? "");
  check(`${key}: 最後は 問 ${total}/${total}`, seen[seen.length - 1] === `問 ${total}/${total}`, seen[seen.length - 1] ?? "");
}

// ---- ミスの記録と苦手キー集計 ----
{
  const story = STORIES[0];
  const h = makeHarness({ ...DEFAULT_OPTIONS });
  const gs = new GameScene(story);
  gs.enter(h.ctx as never);

  // 誤打を3回入れてから正しく打つ。
  for (const ch of "zzz") {
    h.input.type(ch);
    step(gs, h);
  }
  const romaji = new TypingEngine(story.questions[0].kana).guide().text;
  for (const ch of romaji) {
    h.input.type(ch);
    step(gs, h);
  }
  for (let i = 0; i < 40; i++) step(gs, h);

  const missByKey = (gs as unknown as { missByKey: Record<string, number> }).missByKey;
  const total = Object.values(missByKey).reduce((n, v) => n + v, 0);
  check("ミスが苦手キーへ集計された", total === 3, JSON.stringify(missByKey));
  check(
    "期待キーに紐づけて集計している",
    Object.keys(missByKey).length === 1 && missByKey[romaji[0]] === 3,
    JSON.stringify(missByKey),
  );
}

// ---- ポーズの挙動 ----
{
  const story = STORIES[0];
  const h = makeHarness({ ...DEFAULT_OPTIONS });
  const gs = new GameScene(story);
  gs.enter(h.ctx as never);

  h.input.press("Escape");
  step(gs, h);
  check("Escでポーズに入る（即抜けない）", h.goCount() === 0);
  check("ポーズ中フラグ", (gs as unknown as { paused: boolean }).paused === true);

  // ポーズ中の打鍵は無視される
  const before = (gs as unknown as { totalKeys: number }).totalKeys;
  h.input.type("yo");
  step(gs, h);
  check("ポーズ中の打鍵は数えない", (gs as unknown as { totalKeys: number }).totalKeys === before);

  // 「つづける」で復帰
  h.input.press("Enter");
  step(gs, h);
  check("Enterで再開", (gs as unknown as { paused: boolean }).paused === false);
  check("再開時は遷移していない", h.goCount() === 0);

  // もう一度開いて「章えらびへもどる」
  h.input.press("Escape");
  step(gs, h);
  h.input.press("ArrowDown");
  step(gs, h);
  h.input.press("ArrowDown");
  step(gs, h);
  h.input.press("Enter");
  step(gs, h);
  check("メニューからホームへ戻れる", h.lastScene() instanceof HomeScene);
}

// ---- ポーズ中は時間が進まない（速度がインフレしない）----
{
  const story = STORIES[0];
  const h = makeHarness({ ...DEFAULT_OPTIONS });
  const gs = new GameScene(story);
  gs.enter(h.ctx as never);
  h.input.type("y");
  step(gs, h);
  h.input.press("Escape");
  step(gs, h);
  const playSecBefore = (gs as unknown as { playSec: number }).playSec;
  for (let i = 0; i < 120; i++) step(gs, h); // 2秒ぶんポーズ
  check(
    "ポーズ中はプレイ時間が止まる",
    (gs as unknown as { playSec: number }).playSec === playSecBefore,
    String((gs as unknown as { playSec: number }).playSec),
  );
}

// ---- 打鍵の取りこぼしが無いか（1フレームに複数キー）----
{
  const story = STORIES[0];
  const h = makeHarness({ ...DEFAULT_OPTIONS });
  const gs = new GameScene(story);
  gs.enter(h.ctx as never);
  const romaji = new TypingEngine(story.questions[0].kana).guide().text;
  h.input.type(romaji); // 全部まとめて1フレームで流し込む
  step(gs, h);
  check(
    "同一フレームの連続打鍵をすべて処理する",
    (gs as unknown as { totalKeys: number }).totalKeys === romaji.length,
    `${(gs as unknown as { totalKeys: number }).totalKeys} / ${romaji.length}`,
  );
  check("1問目が完了した", (gs as unknown as { correctQuestions: number }).correctQuestions === 1);
}

// ---- 問題送りをまたぐ打鍵が次の問題へ引き継がれる ----
{
  const story = STORIES[0];
  const h = makeHarness({ ...DEFAULT_OPTIONS });
  const gs = new GameScene(story);
  gs.enter(h.ctx as never);
  const r1 = new TypingEngine(story.questions[0].kana).guide().text;
  const r2 = new TypingEngine(story.questions[1].kana).guide().text;
  h.input.type(r1 + r2.slice(0, 3)); // 1問目＋次の3打を先走って入力
  step(gs, h);
  for (let i = 0; i < 40; i++) step(gs, h); // 送り待ちを消化
  const engine = (gs as unknown as { engine: InstanceType<typeof TypingEngine> }).engine;
  check(
    "先走った打鍵が次の問題へ引き継がれる",
    engine.correctKeys === 3 && engine.mistakes === 0,
    `correct=${engine.correctKeys} miss=${engine.mistakes}`,
  );
}

report("プレイ通し検証");
