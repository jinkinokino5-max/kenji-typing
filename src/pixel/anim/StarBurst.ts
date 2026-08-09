import type { Palette } from "../../core/Palette";
import { shade } from "../../core/Palette";

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  max: number;
  twinkle: number;
}

// 正答した語から星が数個弾け、夜空へ昇っていく。正答の主たる報酬演出。
export class StarBurst {
  private ps: Particle[] = [];

  burst(x: number, y: number, count = 8): void {
    for (let i = 0; i < count; i++) {
      const a = -Math.PI / 2 + (Math.random() - 0.5) * 1.6; // 上向き扇状
      const sp = 20 + Math.random() * 45;
      const max = 0.7 + Math.random() * 0.6;
      this.ps.push({
        x,
        y,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp,
        life: max,
        max,
        twinkle: Math.random() * 6,
      });
    }
  }

  update(dt: number): void {
    for (const p of this.ps) {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += 18 * dt; // ゆるい減速上昇
      p.vx *= 0.98;
      p.life -= dt;
      p.twinkle += dt * 12;
    }
    this.ps = this.ps.filter((p) => p.life > 0);
  }

  draw(ctx: CanvasRenderingContext2D, p: Palette): void {
    for (const s of this.ps) {
      const on = Math.sin(s.twinkle) > -0.3;
      if (!on) continue;
      const bright = s.life / s.max > 0.4;
      ctx.fillStyle = shade(p, bright ? 3 : 2);
      const x = Math.round(s.x);
      const y = Math.round(s.y);
      ctx.fillRect(x, y, 1, 1);
      if (bright) {
        // 小さな十字の煌めき
        ctx.fillRect(x - 1, y, 1, 1);
        ctx.fillRect(x + 1, y, 1, 1);
        ctx.fillRect(x, y - 1, 1, 1);
        ctx.fillRect(x, y + 1, 1, 1);
      }
    }
  }

  get active(): boolean {
    return this.ps.length > 0;
  }
}
