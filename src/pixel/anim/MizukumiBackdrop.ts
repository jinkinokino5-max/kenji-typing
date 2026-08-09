import { VIRTUAL_W, VIRTUAL_H } from "../../core/Renderer";
import { MIZUKUMI_P, shade } from "../../core/Palette";
import type { ThemeBackdrop } from "../theme/SceneTheme";

// 『水汲み』川面ときらめく水しぶき。萱の岸辺、対岸にヨハネの淡い影。
// 打鍵：手前で水を汲み、水しぶきが舞う（「水を汲んで砂へかけて」）。
// ミス：冷たい風（海蛇）が川面を波立たせ、萱がなびく。
// 最高潮：川面のきらめきが密になる。
// 締め：遠くの雲が幾ローフかの麺麭にかはって、金色に輝く。

interface Droplet {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
}

interface Sparkle {
  x: number;
  y: number;
  phase: number;
}

export class MizukumiBackdrop implements ThemeBackdrop {
  private t = 0;
  private intensity = 0;
  private peak = 0;
  private windGust = 0;
  private fin = 0;
  private droplets: Droplet[] = [];
  private sparkles: Sparkle[] = [];
  private readonly riverTop = Math.round(VIRTUAL_H * 0.58);
  private readonly riverBottom = VIRTUAL_H - 10;
  private readonly kumuX = Math.round(VIRTUAL_W * 0.3);

  constructor() {
    for (let i = 0; i < 40; i++) {
      this.sparkles.push({
        x: Math.random() * VIRTUAL_W,
        y: this.riverTop + Math.random() * (this.riverBottom - this.riverTop),
        phase: Math.random() * Math.PI * 2,
      });
    }
  }

  gust(): void {
    this.windGust = 1;
  }

  // 打鍵：水を汲む＝水しぶきが舞う。
  pulse(): void {
    for (let i = 0; i < 4; i++) {
      this.droplets.push({
        x: this.kumuX + (Math.random() - 0.5) * 4,
        y: this.riverTop + 2,
        vx: (Math.random() - 0.5) * 40,
        vy: -(40 + Math.random() * 30),
        life: 1,
      });
    }
  }

  finale(): void {
    this.fin = 0.0001;
  }

  update(dt: number, intensity = 0): void {
    this.t += dt;
    this.intensity = intensity;
    const target = Math.max(0, Math.min(1, (intensity - 0.7) / 0.3));
    this.peak += (target - this.peak) * Math.min(1, dt * (target > this.peak ? 3 : 1.6));
    if (this.windGust > 0) this.windGust = Math.max(0, this.windGust - dt * 1.2);
    if (this.fin > 0) this.fin += dt;

    for (const d of this.droplets) {
      d.x += d.vx * dt;
      d.y += d.vy * dt;
      d.vy += 140 * dt; // 重力で川面へ落ちる
      d.life -= dt * 1.1;
    }
    this.droplets = this.droplets.filter((d) => d.life > 0 && d.y < this.riverBottom + 4);
    for (const s of this.sparkles) s.phase += dt * (2 + this.peak * 3);
  }

  draw(g: CanvasRenderingContext2D): void {
    const p = MIZUKUMI_P;
    const finK = this.fin > 0 ? Math.min(1, this.fin / 2.8) : 0;

    // 空
    g.fillStyle = shade(p, 3);
    g.fillRect(0, 0, VIRTUAL_W, this.riverTop);
    g.fillStyle = shade(p, 2);
    for (let y = 0; y < this.riverTop; y += 2) {
      if ((Math.sin(y * 1.3) + 1) / 2 < 0.3) {
        for (let x = y % 4; x < VIRTUAL_W; x += 4) g.fillRect(x, y, 2, 1);
      }
    }
    // 流れる雲（締めで金色の麺麭のかたちへ）
    for (let i = 0; i < 4; i++) {
      const cx = ((i * 110 - this.t * 10) % (VIRTUAL_W + 50)) - 20;
      const x = cx < -20 ? cx + VIRTUAL_W + 50 : cx;
      const y = 10 + i * 9;
      const glow = finK > 0.3 && i === 1;
      g.fillStyle = glow ? "#f4d888" : shade(p, 1);
      g.fillRect(Math.round(x), y, 26, 3);
      g.fillRect(Math.round(x) + 6, y - 2, 14, 2);
      if (glow) {
        g.globalAlpha = finK * 0.6;
        g.fillRect(Math.round(x) - 2, y - 3, 30, 7);
        g.globalAlpha = 1;
      }
    }

    // 対岸とヨハネの淡い影
    g.fillStyle = shade(p, 1);
    g.fillRect(0, this.riverTop - 6, VIRTUAL_W, 6);
    g.globalAlpha = 0.6;
    g.fillStyle = shade(p, 2);
    g.fillRect(Math.round(VIRTUAL_W * 0.72), this.riverTop - 12, 3, 8);
    g.fillRect(Math.round(VIRTUAL_W * 0.72), this.riverTop - 14, 3, 3);
    g.globalAlpha = 1;

    // 川面
    g.fillStyle = shade(p, 0);
    g.fillRect(0, this.riverTop, VIRTUAL_W, this.riverBottom - this.riverTop);
    for (const s of this.sparkles) {
      const tw = (Math.sin(s.phase) + 1) / 2;
      if (tw < 0.55) continue;
      g.fillStyle = tw > 0.8 ? "#e8fbf4" : shade(p, 2);
      g.fillRect(Math.round(s.x), Math.round(s.y + Math.sin(this.t * 2 + s.x) * 1.2), 1, 1);
    }
    // 波の帯
    g.fillStyle = shade(p, 1);
    const waveAmp = 1 + this.windGust * 2 + this.intensity * 0.8;
    for (let x = 0; x < VIRTUAL_W; x += 2) {
      const y = this.riverTop + 3 + Math.round(Math.sin(x * 0.15 + this.t * (2 + this.windGust * 3)) * waveAmp);
      g.fillRect(x, y, 1, 1);
    }

    // 手前の岸：萱の芽
    g.fillStyle = shade(p, 0);
    const bend = this.windGust * 3;
    for (let x = 4; x < VIRTUAL_W; x += 6) {
      const sway = Math.sin(this.t * 2 + x) * (0.6 + bend);
      const h = 6 + (x % 11);
      for (let i = 0; i < h; i++) {
        const dx = Math.round((i / h) * sway);
        g.fillRect(x + dx, VIRTUAL_H - 4 - i, 1, 1);
      }
    }
    g.fillStyle = shade(p, 1);
    g.fillRect(0, VIRTUAL_H - 5, VIRTUAL_W, 5);

    // 水を汲む手（手前中央やや左）
    g.fillStyle = shade(p, 0);
    g.fillRect(this.kumuX - 2, this.riverTop - 6, 6, 4);

    // 水しぶき
    for (const d of this.droplets) {
      g.globalAlpha = Math.max(0, d.life);
      g.fillStyle = "#e8fbf4";
      g.fillRect(Math.round(d.x), Math.round(d.y), 1, 1);
      g.globalAlpha = 1;
    }

    // 最高潮：川面が密にきらめく
    if (this.peak > 0.05) {
      g.globalAlpha = this.peak * 0.25;
      g.fillStyle = "#e8fbf4";
      g.fillRect(0, this.riverTop, VIRTUAL_W, this.riverBottom - this.riverTop);
      g.globalAlpha = 1;
    }

    // 締め：金色の光がやわらかく満ちる
    if (finK > 0) {
      g.globalAlpha = finK * 0.22;
      g.fillStyle = "#f4d888";
      g.fillRect(0, 0, VIRTUAL_W, VIRTUAL_H);
      g.globalAlpha = 1;
    }
  }
}
