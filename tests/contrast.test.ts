// 「文字が背景に溶けていないか」を全24章で検査する。
//
//   npm run test:contrast
//
// 文字色は背景と同じ4階調パレットから取るため、背景が同じ階調を大面積で使う章では
// 文字が背景と同一色になる。目視では気づきにくいので、WCAG のコントラスト比で
// 数値化し、基準を割ったら落とす。
//
// 背景は fillRect だけで描かれているので、画素を持つ小さなキャンバス実装
// （tests/pixelCanvas.ts）で再現する。ブラウザは要らない。

import { makePixelCanvas } from "./pixelCanvas";
import { VIRTUAL_W, VIRTUAL_H } from "../src/core/Renderer";
import { mix, shade } from "../src/core/Palette";
import { themeForStory } from "../src/pixel/theme/themes";
import { STORIES } from "../src/data/stories";

// GameScene と合わせる。値を変えたら両方直すこと。
const TOP_BAR_H = 22;
const BOTTOM_BAR_H = 20;
const BAND_PAD = 14;
const WINDOW_VEIL = 0.7;

/** 文字ウィンドウが置かれうる範囲（問題文の行数で上下するため広めに見る）。 */
const BAND_TOP = TOP_BAR_H + 4;
const BAND_BOTTOM = VIRTUAL_H - BOTTOM_BAR_H - 16;

/**
 * 合格ライン。
 * 原文・入力済み（shade 3）と未入力（shade 2）は本文なので 4.5:1。
 * WCAG の基準では大きな文字は 3:1 だが、背景がアニメで動くぶん余裕を持たせる。
 */
const MIN_RATIO = 4.5;
/** 打ち終えた文字は読み返す必要がないので、基準をひとつ下げる。 */
const MIN_DONE_RATIO = 3;

function srgb(c: number): number {
  const v = c / 255;
  return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
}

function luminance(r: number, g: number, b: number): number {
  return 0.2126 * srgb(r) + 0.7152 * srgb(g) + 0.0722 * srgb(b);
}

function hexLum(hex: string): number {
  const h = hex.replace("#", "");
  return luminance(
    parseInt(h.slice(0, 2), 16),
    parseInt(h.slice(2, 4), 16),
    parseInt(h.slice(4, 6), 16),
  );
}

function ratio(a: number, b: number): number {
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}

let checks = 0;
let failed = 0;

for (const story of STORIES) {
  const theme = themeForStory(story.key);
  const p = theme.palette;
  // GameScene.drawPlayfield が使う文字色。
  // ラベル・色・合格ライン。読む必要がある文字ほど厳しく見る。
  const texts: Array<[string, string, number]> = [
    ["これから打つかな・原文", shade(p, 3), MIN_RATIO],
    ["現在位置", theme.accent, MIN_RATIO],
    ["打ち終えたかな", mix(shade(p, 2), shade(p, 3), 0.45), MIN_DONE_RATIO],
  ];

  let worst = Infinity;
  let worstLabel = "";
  let bad = false;

  for (const intensity of [0, 0.5, 1]) {
    const pc = makePixelCanvas(VIRTUAL_W, VIRTUAL_H);
    const bg = theme.makeBackdrop();
    for (let step = 0; step < 240; step++) {
      bg.update(1 / 60, intensity);
      if (step % 40 !== 0) continue;
      bg.draw(pc.ctx);
      theme.drawMeter(pc.ctx, 0.5, step / 60);
      // GameScene と同じ暗幕を、帯の全域に敷いた状態で測る。
      pc.ctx.globalAlpha = WINDOW_VEIL;
      pc.ctx.fillStyle = "#000000";
      pc.ctx.fillRect(BAND_PAD, BAND_TOP, VIRTUAL_W - BAND_PAD * 2, BAND_BOTTOM - BAND_TOP);
      pc.ctx.globalAlpha = 1;

      for (let y = BAND_TOP; y < BAND_BOTTOM; y++) {
        for (let x = BAND_PAD; x < VIRTUAL_W - BAND_PAD; x++) {
          const [r, g, b] = pc.get(x, y);
          const bgl = luminance(r, g, b);
          for (const [label, color, min] of texts) {
            const v = ratio(hexLum(color), bgl);
            if (v < min) bad = true;
            // 基準に対する余裕がいちばん少ないものを代表として報告する。
            if (v / min < worst) {
              worst = v / min;
              worstLabel = `${label} ${v.toFixed(2)}:1（基準 ${min}:1）`;
            }
          }
        }
      }
    }
  }

  checks++;
  if (bad) {
    failed++;
    console.log(`  ❌ 『${story.title}』(${p.name}) — ${worstLabel}`);
  }
}

console.log(`コントラスト検査 / ${checks} 章（合格ライン ${MIN_RATIO}:1）`);
if (failed === 0) {
  console.log(`✅ すべて通過（${checks}）`);
} else {
  console.log(`❌ ${failed} 章が基準未満`);
  process.exit(1);
}
