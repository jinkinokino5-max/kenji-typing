import { VIRTUAL_W, VIRTUAL_H } from "../core/Renderer";
import { NIGHT, shade, type Palette } from "../core/Palette";
import { StarField } from "./anim/StarField";
import { Hills } from "./anim/Hills";
import { Train } from "./anim/Train";
import { fillDither } from "./dither";
import type { ThemeBackdrop } from "./theme/SceneTheme";

// 夜空グラデ＋星＋丘（＋任意で汽車）をまとめた共通背景。
// 『よだかの星』の舞台。コンボ強度で星が増え、空が澄んでいく。
export class NightBackdrop implements ThemeBackdrop {
  readonly stars = new StarField();
  readonly hills = new Hills();
  private train: Train | null;
  private palette: Palette;
  private intensity = 0;
  private peak = 0; // 最高潮 0..1（強度0.75で兆し1.0で全開）
  private peakT = 0;

  constructor(withTrain = false, palette: Palette = NIGHT) {
    this.palette = palette;
    this.train = withTrain ? new Train(VIRTUAL_H - 44, 20) : null;
  }

  gust(): void {
    this.hills.gust(1);
  }

  update(dt: number, intensity = 0): void {
    this.intensity = intensity;
    this.peakT += dt;
    const target = Math.max(0, Math.min(1, (intensity - 0.75) / 0.25));
    this.peak += (target - this.peak) * Math.min(1, dt * (target > this.peak ? 3 : 1.8));
    this.stars.update(dt);
    this.hills.update(dt);
    this.train?.update(dt);
  }

  draw(g: CanvasRenderingContext2D): void {
    const p = this.palette;
    g.fillStyle = shade(p, 0);
    g.fillRect(0, 0, VIRTUAL_W, VIRTUAL_H);
    const bandTop = VIRTUAL_H - 110;
    for (let y = bandTop; y < VIRTUAL_H - 40; y++) {
      const level = ((y - bandTop) / 70) * 0.7;
      fillDither(g, 0, y, VIRTUAL_W, 1, shade(p, 0), shade(p, 1), level);
    }
    // コンボが伸びるほど天の川がうっすら浮かぶ
    if (this.intensity > 0.05) {
      for (let y = 30; y < 90; y++) {
        const lvl = this.intensity * 0.25 * (1 - Math.abs(y - 60) / 30);
        if (lvl > 0) fillDither(g, 0, y, VIRTUAL_W, 1, shade(p, 0), shade(p, 2), lvl);
      }
    }
    this.stars.draw(g, p);
    this.train?.draw(g, p);
    this.hills.draw(g, p);

    // 最高潮：空が燃え上がり、天頂に青い大星が十字のフレアを放つ。
    if (this.peak > 0.01) this.drawPeak(g, p);
  }

  private drawPeak(g: CanvasRenderingContext2D, p: Palette): void {
    const k = this.peak;
    // 天の川が燃える
    for (let y = 18; y < 104; y++) {
      const band = 1 - Math.abs(y - 60) / 44;
      const lvl = band * k * 0.5;
      if (lvl > 0) fillDither(g, 0, y, VIRTUAL_W, 1, shade(p, 0), shade(p, 3), lvl);
    }
    // 上へ流れる星
    g.fillStyle = shade(p, 3);
    for (let i = 0; i < 22; i++) {
      const x = (i * 53 + 17) % VIRTUAL_W;
      const yy = (((i * 37 - this.peakT * 60) % VIRTUAL_H) + VIRTUAL_H) % VIRTUAL_H;
      g.globalAlpha = k * 0.8;
      g.fillRect(x, Math.round(yy), 1, 2);
    }
    g.globalAlpha = 1;
    // 天頂の青い大星＋十字フレア
    const cx = VIRTUAL_W / 2;
    const cy = 42;
    const tw = (Math.sin(this.peakT * 8) + 1) / 2;
    g.globalAlpha = Math.min(1, k * 1.2);
    g.fillStyle = tw > 0.4 ? "#ffffff" : "#9fc7ff";
    g.fillRect(cx - 1, cy - 1, 3, 3);
    const arm = Math.round(4 + k * 14 + tw * 3);
    g.fillStyle = "#9fc7ff";
    for (let i = 1; i <= arm; i++) {
      g.globalAlpha = k * (1 - i / arm);
      g.fillRect(cx, cy - 1 - i, 1, 1);
      g.fillRect(cx, cy + 1 + i, 1, 1);
      g.fillRect(cx - 1 - i, cy, 1, 1);
      g.fillRect(cx + 1 + i, cy, 1, 1);
    }
    g.globalAlpha = 1;
  }
}
