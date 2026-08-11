// プレイ画面を実際のブラウザで描かせて、目視で確かめるための道具。
//
//   npm run dev  → http://localhost:5173/tools/preview/?story=menite
//
// ?story= に章キー（yodaka / menite / ono_kaze …）。省略で読みにくかった章を並べる。
// ?typed= に打鍵済みの文字数（既定は問題文の半分）。
// テストは数値でしか見ないので、色の当たりや暗幕の見え方はここで確認する。

import { VIRTUAL_W, VIRTUAL_H } from "../../src/core/Renderer";
import { GameScene } from "../../src/scenes/GameScene";
import { STORIES, storyByKey } from "../../src/data/stories";
import { TypingEngine } from "../../src/typing/TypingEngine";

/** コントラストが厳しかった章を既定で並べる。 */
const DEFAULT_KEYS = ["menite", "kumoshingo", "ono_kaze", "amenimo", "yoru", "mizukumi", "yodaka"];

const params = new URLSearchParams(location.search);
const keys = params.get("story") ? [params.get("story")!] : DEFAULT_KEYS;

function makeCtx(g: CanvasRenderingContext2D): unknown {
  return {
    renderer: { ctx: g, scale: 1, fit() {}, clear() {} },
    input: {
      imeSuspected: false,
      takeTyped: () => [],
      wasPressed: () => false,
      isHeld: () => false,
      anyPressed: () => false,
      clearImeWarning() {},
    },
    audio: {
      init() {}, playBgm() {}, setBgmIntensity() {}, key() {}, miss() {},
      correct() {}, clear() {}, toggleMute: () => false,
    },
    state: {
      save: {
        bestScore: 0, bestRank: "-", readRate: 0, totalKeys: 0, kp: 0,
        badges: [], perStory: {}, muted: true, weakKeys: {},
        options: { showGuide: true, showStats: true, highContrast: false },
      },
      lastOutcome: null,
    },
    go() {},
  };
}

const out = document.getElementById("out")!;

for (const key of keys) {
  const story = storyByKey(key) ?? STORIES[0];
  const canvas = document.createElement("canvas");
  canvas.width = VIRTUAL_W;
  canvas.height = VIRTUAL_H;
  const g = canvas.getContext("2d", { alpha: false })!;
  g.imageSmoothingEnabled = false;

  const scene = new GameScene(story);
  const ctx = makeCtx(g) as Parameters<GameScene["draw"]>[0];

  // 背景アニメを少し進め、問題文を途中まで打った状態にする。
  for (let i = 0; i < 90; i++) scene.update(1 / 60, ctx);

  const q = story.questions[0];
  const romaji = new TypingEngine(q.kana).guide().text;
  const n = Number(params.get("typed") ?? Math.floor(romaji.length / 2));
  const engine = (scene as unknown as { engine: TypingEngine }).engine;
  for (let i = 0; i < Math.min(n, romaji.length - 1); i++) engine.input(romaji[i]);

  scene.draw(ctx);

  const fig = document.createElement("figure");
  const cap = document.createElement("figcaption");
  cap.textContent = `${story.chapter} 『${story.title}』（${key}）`;
  fig.append(cap, canvas);
  out.append(fig);
}
