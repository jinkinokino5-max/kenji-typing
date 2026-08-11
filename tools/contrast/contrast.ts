// 各章の背景を実際に描き、かな行が乗る帯の画素と文字色のコントラスト比を測る。
//
//   npm run check:contrast
//
// GameScene は文字色を palette の shade 1/2/3 から取る一方、背景も同じ palette で
// 描かれる。両者が同じ階調に寄ると文字が背景へ溶ける。目視では気づきにくいので、
// WCAG のコントラスト比（1.0〜21.0）で数値化する。

import { VIRTUAL_W, VIRTUAL_H } from "../../src/core/Renderer";
import { shade } from "../../src/core/Palette";
import { themeForStory } from "../../src/pixel/theme/themes";
import { STORIES } from "../../src/data/stories";

// GameScene のレイアウト定数と合わせる（本文〜ガイドが乗る範囲）。
const TOP_BAR_H = 22;
const BOTTOM_BAR_H = 20;
const CONTENT_W = VIRTUAL_W - 52;
const BAND_TOP = TOP_BAR_H + 4;
const BAND_BOTTOM = VIRTUAL_H - BOTTOM_BAR_H - 16;
const BAND_LEFT = Math.round((VIRTUAL_W - CONTENT_W) / 2);
const BAND_RIGHT = BAND_LEFT + CONTENT_W;

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

function ratio(l1: number, l2: number): number {
  const hi = Math.max(l1, l2);
  const lo = Math.min(l1, l2);
  return (hi + 0.05) / (lo + 0.05);
}

interface Row {
  key: string;
  title: string;
  palette: string;
  /** 未入力のかな（shade 1）の最悪コントラスト比。 */
  dimWorst: number;
  /** 未入力のかなが 3:1 を割る画素の割合(%)。 */
  dimBadPct: number;
  /** 現在位置（shade 2）の最悪コントラスト比。 */
  midWorst: number;
  midBadPct: number;
  /** 原文・入力済み（shade 3）の最悪コントラスト比。 */
  brightWorst: number;
  brightBadPct: number;
}

const canvas = document.createElement("canvas");
canvas.width = VIRTUAL_W;
canvas.height = VIRTUAL_H;
const g = canvas.getContext("2d", { alpha: false })!;

// ?veil=0.55 のように指定して、暗幕の濃さを変えた場合を測れる。
const VEIL = Number(new URLSearchParams(location.search).get("veil") ?? "0");

const rows: Row[] = [];

for (const story of STORIES) {
  const theme = themeForStory(story.key);
  const lum = {
    dim: hexLum(shade(theme.palette, 1)),
    mid: hexLum(shade(theme.palette, 2)),
    bright: hexLum(shade(theme.palette, 3)),
  };

  const worst = { dim: Infinity, mid: Infinity, bright: Infinity };
  const bad = { dim: 0, mid: 0, bright: 0 };
  let samples = 0;

  // 時間・コンボ強度をふって、いちばん厳しい瞬間を拾う。
  for (const intensity of [0, 0.5, 1]) {
    const bg = theme.makeBackdrop();
    let t = 0;
    for (let step = 0; step < 240; step++) {
      bg.update(1 / 60, intensity);
      t += 1 / 60;
      if (step % 40 !== 0) continue; // 0.67秒おきに計測
      bg.draw(g);
      theme.drawMeter(g, 0.5, t);
      // 暗幕（GameScene の「見やすさ優先」と同じ合成）を任意の濃さで重ねる。
      if (VEIL > 0) {
        g.globalAlpha = VEIL;
        g.fillStyle = "#000000";
        g.fillRect(0, TOP_BAR_H, VIRTUAL_W, VIRTUAL_H - TOP_BAR_H - BOTTOM_BAR_H);
        g.globalAlpha = 1;
      }
      const img = g.getImageData(
        BAND_LEFT,
        BAND_TOP,
        BAND_RIGHT - BAND_LEFT,
        BAND_BOTTOM - BAND_TOP,
      );
      for (let i = 0; i < img.data.length; i += 4) {
        const bgl = luminance(img.data[i], img.data[i + 1], img.data[i + 2]);
        samples++;
        for (const k of ["dim", "mid", "bright"] as const) {
          const r = ratio(lum[k], bgl);
          if (r < worst[k]) worst[k] = r;
          if (r < 3) bad[k]++;
        }
      }
    }
  }

  rows.push({
    key: story.key,
    title: story.title,
    palette: theme.palette.name,
    dimWorst: +worst.dim.toFixed(2),
    dimBadPct: +((bad.dim / samples) * 100).toFixed(1),
    midWorst: +worst.mid.toFixed(2),
    midBadPct: +((bad.mid / samples) * 100).toFixed(1),
    brightWorst: +worst.bright.toFixed(2),
    brightBadPct: +((bad.bright / samples) * 100).toFixed(1),
  });
}

document.getElementById("out")!.textContent = JSON.stringify(rows, null, 1);
