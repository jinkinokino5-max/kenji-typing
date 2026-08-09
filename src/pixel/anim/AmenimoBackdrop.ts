import { VIRTUAL_W, VIRTUAL_H } from "../../core/Renderer";
import { RAIN, shade } from "../../core/Palette";
import type { ThemeBackdrop } from "../theme/SceneTheme";

// 『雨ニモマケズ』野の雨。
// 萱ぶきの小屋と松林、まっすぐ静かな雨、水たまりの波紋、窓の小さな灯。
// コンボで雲が割れ、光条と淡い虹、野が瑞々しく明るむ。
// 締め：雲が全開し、太陽が光条を放ち、稲穂が黄金に、虹が架かる。

interface Drop { x: number; y: number; speed: number; len: number; }
interface Ripple { x: number; r: number; life: number; }
interface Grass { x: number; h: number; }

export class AmenimoBackdrop implements ThemeBackdrop {
  private t = 0;
  private sun = 0; // 晴れ間 0..1（intensityへ追従）
  private drops: Drop[] = [];
  private ripples: Ripple[] = [];
  private grass: Grass[] = [];
  private gustT = 0;
  private fin = 0;
  private readonly horizon = VIRTUAL_H - 44;
  private readonly hutX = VIRTUAL_W - 96;

  constructor() {
    for (let i = 0; i < 60; i++)
      this.drops.push({ x: Math.random() * VIRTUAL_W, y: Math.random() * this.horizon, speed: 150 + Math.random() * 60, len: 4 + Math.floor(Math.random() * 4) });
    for (let x = 2; x < VIRTUAL_W; x += 3 + Math.floor(Math.random() * 2))
      this.grass.push({ x, h: 3 + Math.floor(Math.random() * 5) });
  }

  gust(): void {
    this.gustT = 1;
  }

  finale(): void {
    this.fin = 0.0001;
  }

  update(dt: number, intensity = 0): void {
    this.t += dt;
    if (this.fin > 0) this.fin += dt;
    if (this.gustT > 0) this.gustT = Math.max(0, this.gustT - dt);
    const target = Math.min(1, intensity * 0.9 + (this.fin > 0 ? this.fin / 2.5 : 0));
    this.sun += (target - this.sun) * Math.min(1, dt * 2);

    const slant = this.gustT * 40;
    const rainCount = 1 - this.sun * 0.7; // 晴れると雨が減る
    for (const d of this.drops) {
      d.y += d.speed * dt;
      d.x -= slant * dt;
      if (d.y > this.horizon) {
        if (Math.random() < rainCount) this.ripples.push({ x: d.x, r: 1, life: 1 });
        d.y = -d.len;
        d.x = Math.random() * VIRTUAL_W;
      }
    }
    for (const r of this.ripples) { r.r += dt * 26; r.life -= dt * 1.8; }
    this.ripples = this.ripples.filter((r) => r.life > 0);
  }

  draw(g: CanvasRenderingContext2D): void {
    const p = RAIN;
    // 空（晴れ間で明るく）
    g.fillStyle = shade(p, this.sun > 0.6 ? 2 : 1);
    g.fillRect(0, 0, VIRTUAL_W, this.horizon);
    g.fillStyle = shade(p, 0);
    for (let y = 0; y < this.horizon; y += 2)
      for (let x = (y % 4); x < VIRTUAL_W; x += 4)
        if (y < this.horizon * (0.4 + this.sun * 0.2)) g.fillRect(x, y, 1, 1);

    // 太陽（晴れ間で顔を出す）
    if (this.sun > 0.3) {
      const sx = Math.round(VIRTUAL_W * 0.3);
      const sy = 40 - Math.round(this.sun * 8);
      this.disc(g, sx, sy, 10, "#f6e6a0");
      if (this.sun > 0.6 || this.fin > 0) this.rays(g, sx, sy);
    }

    // 遠くの松林
    g.fillStyle = shade(p, 1);
    for (let x = 0; x < VIRTUAL_W; x += 10) {
      const h = 8 + ((x * 7) % 6);
      g.fillRect(x + 4, this.horizon - h, 1, h);
      g.fillRect(x + 1, this.horizon - h + 3, 7, 2);
      g.fillRect(x + 2, this.horizon - h + 6, 5, 2);
    }

    // 淡い虹（晴れ間）
    if (this.sun > 0.5) this.rainbow(g);

    // 萱ぶきの小屋
    this.drawHut(g);

    // 地面
    g.fillStyle = shade(p, 1);
    g.fillRect(0, this.horizon, VIRTUAL_W, VIRTUAL_H - this.horizon);

    // 波紋
    for (const r of this.ripples) {
      g.fillStyle = r.life > 0.4 ? shade(p, 3) : shade(p, 2);
      this.ring(g, Math.round(r.x), this.horizon + 4, Math.round(r.r));
    }

    // 雨
    const slant = this.gustT * 3;
    g.fillStyle = shade(p, 3);
    const alpha = 1 - this.sun * 0.7;
    g.globalAlpha = Math.max(0.2, alpha);
    for (const d of this.drops) g.fillRect(Math.round(d.x - slant), Math.round(d.y), 1, d.len);
    g.globalAlpha = 1;

    // 草（雨にうなずく）
    g.fillStyle = shade(p, 2);
    for (const gr of this.grass) {
      const sway = Math.sin(this.t * 1.6 + gr.x * 0.1) * (1 + this.gustT * 2);
      for (let i = 0; i < gr.h; i++) g.fillRect(gr.x + Math.round((i / gr.h) * sway), this.horizon - i, 1, 1);
    }

    // 締め：晴天と黄金の稲、全き虹
    if (this.fin > 0) {
      g.globalAlpha = Math.min(1, this.fin / 2.5) * 0.25;
      g.fillStyle = "#f6e6a0";
      g.fillRect(0, 0, VIRTUAL_W, VIRTUAL_H);
      g.globalAlpha = 1;
    }
  }

  private drawHut(g: CanvasRenderingContext2D): void {
    const p = RAIN;
    const x = this.hutX;
    const y = this.horizon;
    g.fillStyle = shade(p, 0);
    g.fillRect(x, y - 14, 30, 14); // 本体
    // 萱ぶき屋根
    g.fillStyle = shade(p, 1);
    for (let i = 0; i < 20; i++) g.fillRect(x - 4 + i, y - 14 - Math.min(i, 20 - i), i < 10 ? i : 20 - i > 0 ? 20 - i : 1, 1);
    g.fillRect(x - 4, y - 14, 38, 2);
    // 窓の灯
    const flick = (Math.sin(this.t * 5) + 1) / 2 > 0.3;
    g.fillStyle = flick ? "#e8d48a" : shade(p, 2);
    g.fillRect(x + 12, y - 9, 5, 5);
  }

  private rays(g: CanvasRenderingContext2D, cx: number, cy: number): void {
    g.globalAlpha = 0.18 + this.sun * 0.2;
    g.fillStyle = "#f6e6a0";
    for (let a = 0; a < 8; a++) {
      const ang = (Math.PI * 2 * a) / 8 + this.t * 0.3;
      for (let r = 12; r < 40; r += 2) {
        g.fillRect(Math.round(cx + Math.cos(ang) * r), Math.round(cy + Math.sin(ang) * r), 1, 1);
      }
    }
    g.globalAlpha = 1;
  }

  private rainbow(g: CanvasRenderingContext2D): void {
    const cols = ["#e88a8a", "#e8d48a", "#8fd08a", "#8fb8e8"];
    const cx = VIRTUAL_W / 2;
    const cy = this.horizon + 10;
    g.globalAlpha = (this.sun - 0.5) * 0.6;
    cols.forEach((c, k) => {
      g.fillStyle = c;
      const rad = 70 + k * 3;
      for (let a = Math.PI; a < Math.PI * 2; a += 0.06) {
        g.fillRect(Math.round(cx + Math.cos(a) * rad), Math.round(cy + Math.sin(a) * rad), 1, 1);
      }
    });
    g.globalAlpha = 1;
  }

  private disc(g: CanvasRenderingContext2D, cx: number, cy: number, r: number, color: string): void {
    g.fillStyle = color;
    for (let y = -r; y <= r; y++) {
      const w = Math.floor(Math.sqrt(Math.max(0, r * r - y * y)));
      g.fillRect(cx - w, cy + y, w * 2, 1);
    }
  }

  private ring(g: CanvasRenderingContext2D, cx: number, cy: number, r: number): void {
    if (r < 1) return;
    for (let a = 0; a < Math.PI * 2; a += 1 / (r + 2)) {
      g.fillRect(cx + Math.round(Math.cos(a) * r), cy + Math.round(Math.sin(a) * r * 0.4), 1, 1);
    }
  }
}
