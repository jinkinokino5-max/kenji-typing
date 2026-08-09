import { VIRTUAL_W } from "../../core/Renderer";
import type { Palette } from "../../core/Palette";
import { shade } from "../../core/Palette";

interface Smoke {
  x: number;
  y: number;
  r: number;
  life: number;
}

// 銀河鉄道を思わせる汽車が右へ横スクロールし、煙をパフパフと上げる。
// タイトル/導入の帯として世界観を彩る。
export class Train {
  private x: number;
  private y: number;
  private smoke: Smoke[] = [];
  private puff = 0;
  private speed: number;

  constructor(y: number, speed = 22) {
    this.y = y;
    this.speed = speed;
    this.x = -60;
  }

  update(dt: number): void {
    this.x += this.speed * dt;
    if (this.x > VIRTUAL_W + 60) this.x = -60; // ループ

    this.puff -= dt;
    if (this.puff <= 0) {
      this.smoke.push({ x: this.x + 4, y: this.y - 8, r: 1, life: 1.6 });
      this.puff = 0.35;
    }
    for (const s of this.smoke) {
      s.y -= 8 * dt;
      s.x -= 4 * dt;
      s.r += 3 * dt;
      s.life -= dt;
    }
    this.smoke = this.smoke.filter((s) => s.life > 0);
  }

  draw(ctx: CanvasRenderingContext2D, p: Palette): void {
    const dark = shade(p, 1);
    const light = shade(p, 2);
    const x = Math.round(this.x);
    const y = Math.round(this.y);

    // 煙（薄い塊）
    for (const s of this.smoke) {
      ctx.fillStyle = s.life > 0.8 ? light : dark;
      const r = Math.round(s.r);
      ctx.fillRect(Math.round(s.x) - r, Math.round(s.y) - r, r * 2, r * 2);
    }

    // 機関車本体（簡素なシルエット）
    ctx.fillStyle = dark;
    ctx.fillRect(x, y - 6, 20, 8); // 車体
    ctx.fillRect(x + 16, y - 12, 8, 6); // 運転室
    ctx.fillRect(x + 3, y - 10, 3, 4); // 煙突
    // 窓の明かり
    ctx.fillStyle = light;
    ctx.fillRect(x + 18, y - 10, 3, 3);
    ctx.fillRect(x + 6, y - 3, 2, 2);
    ctx.fillRect(x + 11, y - 3, 2, 2);
    // 車輪
    ctx.fillStyle = dark;
    ctx.fillRect(x + 3, y + 2, 3, 2);
    ctx.fillRect(x + 10, y + 2, 3, 2);
    ctx.fillRect(x + 17, y + 2, 3, 2);
  }
}
