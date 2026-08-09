import { VIRTUAL_W, VIRTUAL_H } from "../../core/Renderer";
import type { Palette } from "../../core/Palette";
import { shade } from "../../core/Palette";

interface Grass {
  x: number;
  h: number;
  phase: number;
}

// 地平の丘と、風で1pxなびく草。夜空の下の野原（『よだかの星』の舞台）。
export class Hills {
  private grass: Grass[] = [];
  private t = 0;
  private windGust = 0; // ミス時などに外部から強められる
  private readonly horizon = Math.round(VIRTUAL_H - 40);

  constructor() {
    for (let x = 2; x < VIRTUAL_W; x += 3 + Math.floor(Math.random() * 4)) {
      this.grass.push({ x, h: 3 + Math.floor(Math.random() * 6), phase: Math.random() * 6 });
    }
  }

  /** 風を一時的に強める（ミス演出用）。 */
  gust(strength = 1): void {
    this.windGust = Math.max(this.windGust, strength);
  }

  update(dt: number): void {
    this.t += dt;
    if (this.windGust > 0) this.windGust = Math.max(0, this.windGust - dt * 1.5);
  }

  private ridge(x: number): number {
    return this.horizon + Math.round(Math.sin(x * 0.03) * 4 + Math.sin(x * 0.09) * 2.5);
  }

  draw(ctx: CanvasRenderingContext2D, p: Palette): void {
    // 丘のシルエット（ゆるやかな稜線）
    ctx.fillStyle = shade(p, 1);
    for (let x = 0; x < VIRTUAL_W; x++) {
      const y = this.ridge(x);
      ctx.fillRect(x, y, 1, VIRTUAL_H - y);
    }
    // 手前の暗い地面
    ctx.fillStyle = shade(p, 0);
    ctx.fillRect(0, VIRTUAL_H - 12, VIRTUAL_W, 12);

    // 風になびく草（先端が風の強さに応じて左右に揺れる）
    ctx.fillStyle = shade(p, 0);
    const amp = 1 + this.windGust * 2;
    for (const g of this.grass) {
      const sway = Math.sin(this.t * (1.4 + this.windGust) + g.phase);
      const tip = Math.round(sway * amp);
      const baseY = this.ridge(g.x);
      for (let i = 0; i < g.h; i++) {
        const dx = Math.round((i / g.h) * tip);
        ctx.fillRect(g.x + dx, baseY - i, 1, 1);
      }
    }
  }
}
