import { Renderer, VIRTUAL_W, VIRTUAL_H } from "./core/Renderer";
import { Input } from "./core/Input";
import type { Scene, SceneContext, GameState } from "./core/Scene";
import { AudioEngine } from "./audio/AudioEngine";
import { load } from "./core/Storage";
import { applyContentOverrides } from "./data/content";
import { ditherOn } from "./pixel/dither";
import { TitleScene } from "./scenes/TitleScene";
import { IntroScene } from "./scenes/IntroScene";
import { storyByKey } from "./data/stories";

const canvas = document.getElementById("screen") as HTMLCanvasElement | null;
if (!canvas) throw new Error("#screen canvas が見つかりません");

const renderer = new Renderer(canvas);
const input = new Input();
const audio = new AudioEngine();
const state: GameState = { save: load(), lastOutcome: null };
// 保存済みのミュート設定を反映（init前でも状態は保持される）。
audio.setMuted(state.save.muted);
// 保存済みの章コンテンツ編集を STORIES へ適用（最初のシーン生成前）。
applyContentOverrides();

// QA/ディープリンク：?chapter=<key> で任意の章の導入から開始（無害）。
const chapterKey = new URLSearchParams(location.search).get("chapter");
const linkedStory = chapterKey ? storyByKey(chapterKey) : undefined;
let current: Scene = linkedStory ? new IntroScene(linkedStory) : new TitleScene();

// ディザ遷移の状態。溶暗→切替→溶明。
let transitioning = false;
let transT = 0;
let pending: Scene | null = null;
const TRANS_HALF = 0.28;

const ctx: SceneContext = {
  renderer,
  input,
  audio,
  state,
  go: (next) => {
    if (transitioning) return;
    transitioning = true;
    transT = 0;
    pending = next;
  },
};
current.enter?.(ctx);

function drawTransition(level: number): void {
  // level 0..1：ディザで黒を増やす（溶暗）。
  const g = renderer.ctx;
  for (let y = 0; y < VIRTUAL_H; y++) {
    for (let x = 0; x < VIRTUAL_W; x++) {
      if (ditherOn(x, y, level)) {
        g.fillStyle = "#05070d";
        g.fillRect(x, y, 1, 1);
      }
    }
  }
}

let last = performance.now();
function frame(now: number): void {
  let dt = (now - last) / 1000;
  last = now;
  if (dt > 0.1) dt = 0.1; // タブ復帰時などの飛びを抑制

  if (transitioning) {
    transT += dt;
    // 溶暗の頂点でシーンを差し替える。
    if (transT >= TRANS_HALF && pending) {
      current.exit?.();
      current = pending;
      pending = null;
      current.enter?.(ctx);
    }
    // 遷移中も背景を動かし続ける（更新は最小限）。
    current.update(0, ctx);
    current.draw(ctx);
    const level =
      transT < TRANS_HALF ? transT / TRANS_HALF : 1 - (transT - TRANS_HALF) / TRANS_HALF;
    drawTransition(Math.max(0, Math.min(1, level)));
    if (transT >= TRANS_HALF * 2) transitioning = false;
  } else {
    current.update(dt, ctx);
    current.draw(ctx);
  }

  input.endFrame();
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
