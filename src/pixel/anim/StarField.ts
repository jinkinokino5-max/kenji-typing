import { VIRTUAL_W, VIRTUAL_H } from "../../core/Renderer";
import type { Palette } from "../../core/Palette";
import { shade } from "../../core/Palette";

interface Star {
  x: number;
  y: number;
  phase: number; // 明滅位相
  speed: number; // 明滅速度
  layer: number; // 0:遠(暗) 1:中 2:近(明)
}

interface Shooting {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
}

// 多層の星が確率で瞬き、たまに流星が斜めに走る夜空。
// 「見ているだけで楽しい」の核となる常駐アイドルアニメーション。
export class StarField {
  private stars: Star[] = [];
  private shooting: Shooting[] = [];
  private t = 0;
  private nextShoot: number;

  constructor(count = 150) {
    for (let i = 0; i < count; i++) {
      this.stars.push({
        x: Math.floor(Math.random() * VIRTUAL_W),
        y: Math.floor(Math.random() * (VIRTUAL_H * 0.75)),
        phase: Math.random() * Math.PI * 2,
        speed: 0.6 + Math.random() * 1.8,
        layer: Math.floor(Math.random() * 3),
      });
    }
    this.nextShoot = 2 + Math.random() * 4;
  }

  update(dt: number): void {
    this.t += dt;
    for (const s of this.stars) s.phase += s.speed * dt;

    this.nextShoot -= dt;
    if (this.nextShoot <= 0) {
      this.spawnShooting();
      this.nextShoot = 3 + Math.random() * 6;
    }
    for (const m of this.shooting) {
      m.x += m.vx * dt;
      m.y += m.vy * dt;
      m.life -= dt;
    }
    this.shooting = this.shooting.filter((m) => m.life > 0 && m.x < VIRTUAL_W + 8);
  }

  private spawnShooting(): void {
    const x = Math.random() * VIRTUAL_W * 0.6;
    const y = Math.random() * VIRTUAL_H * 0.4;
    this.shooting.push({ x, y, vx: 90, vy: 55, life: 0.9 });
  }

  draw(ctx: CanvasRenderingContext2D, p: Palette): void {
    // 星本体
    for (const s of this.stars) {
      const tw = (Math.sin(s.phase) + 1) / 2; // 0..1
      // レイヤと明滅で明度を決定。暗い層はたまにしか光らない。
      const base = s.layer + tw * 1.4;
      const idx = Math.min(3, Math.max(1, Math.round(base)));
      if (s.layer === 0 && tw < 0.55) continue; // 遠い星は瞬きの山だけ点灯
      ctx.fillStyle = shade(p, idx);
      ctx.fillRect(s.x, s.y, 1, 1);
      // 近い星がまばゆい瞬間は十字の煌めき
      if (s.layer === 2 && tw > 0.9) {
        ctx.fillStyle = shade(p, 2);
        ctx.fillRect(s.x - 1, s.y, 1, 1);
        ctx.fillRect(s.x + 1, s.y, 1, 1);
        ctx.fillRect(s.x, s.y - 1, 1, 1);
        ctx.fillRect(s.x, s.y + 1, 1, 1);
      }
    }
    // 流星（尾を数px）
    for (const m of this.shooting) {
      const head = shade(p, 3);
      const tail = shade(p, 2);
      for (let k = 0; k < 5; k++) {
        ctx.fillStyle = k === 0 ? head : tail;
        ctx.fillRect(Math.round(m.x - m.vx * 0.006 * k), Math.round(m.y - m.vy * 0.006 * k), 1, 1);
      }
    }
  }
}
