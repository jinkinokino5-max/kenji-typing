import { VIRTUAL_W, VIRTUAL_H } from "../../core/Renderer";
import { ZASHIKI_P, shade } from "../../core/Palette";
import { fillDither } from "../dither";
import type { ThemeBackdrop } from "../theme/SceneTheme";

interface Dust {
  x: number;
  y: number;
  vx: number;
  phase: number;
}

// 『ざしき童子のはなし』静けさと気配。
// 障子越しの光がゆっくり呼吸し、行灯の炎が1pxで揺れ、埃が舞い、
// 障子に小さな影がすっと差して消える。コンボで気配が濃くなる。
export class ZashikiBackdrop implements ThemeBackdrop {
  private dust: Dust[] = [];
  private t = 0;
  private intensity = 0;
  private peak = 0; // 最高潮 0..1
  private retreat = 0; // ミス時に気配が引っ込む
  private readonly shojiTop = 26;
  private readonly shojiBottom = 150;
  private readonly tatamiY = VIRTUAL_H - 40;

  constructor() {
    for (let i = 0; i < 18; i++) {
      this.dust.push({
        x: Math.random() * VIRTUAL_W,
        y: 40 + Math.random() * 120,
        vx: 4 + Math.random() * 6,
        phase: Math.random() * 6,
      });
    }
  }

  gust(): void {
    this.retreat = 1;
  }

  update(dt: number, intensity = 0): void {
    this.t += dt;
    this.intensity = intensity;
    const target = Math.max(0, Math.min(1, (intensity - 0.75) / 0.25));
    this.peak += (target - this.peak) * Math.min(1, dt * (target > this.peak ? 3 : 1.8));
    if (this.retreat > 0) this.retreat = Math.max(0, this.retreat - dt * 0.7);
    for (const d of this.dust) {
      d.x += d.vx * dt;
      d.phase += dt * 2;
      if (d.x > VIRTUAL_W) {
        d.x = -2;
        d.y = 40 + Math.random() * 120;
      }
    }
  }

  draw(g: CanvasRenderingContext2D): void {
    const p = ZASHIKI_P;
    // 室内の暗がり
    g.fillStyle = shade(p, 0);
    g.fillRect(0, 0, VIRTUAL_W, VIRTUAL_H);

    // 障子越しの外光（ゆっくり呼吸するグラデ）
    const breath = 0.5 + Math.sin(this.t * 0.6) * 0.15;
    for (let y = this.shojiTop; y < this.shojiBottom; y++) {
      const v = (1 - (y - this.shojiTop) / (this.shojiBottom - this.shojiTop)) * breath * 0.7;
      if (v > 0) fillDither(g, 6, y, VIRTUAL_W - 12, 1, shade(p, 1), shade(p, 3), v);
    }

    // 最高潮：障子の奥から金色の光が差し込む（格子より下層）。
    if (this.peak > 0.01) {
      const k = this.peak;
      for (let y = this.shojiTop; y < this.shojiBottom; y++) {
        const v = (1 - (y - this.shojiTop) / (this.shojiBottom - this.shojiTop)) * k * 0.55;
        if (v > 0) fillDither(g, 6, y, VIRTUAL_W - 12, 1, shade(p, 2), "#e8a24a", v);
      }
    }

    // 気配の影（障子に映る子ども）— コンボで濃く、放置で左右に動く
    const presence = Math.max(0, this.intensity * 0.8 + 0.15 - this.retreat);
    if (presence > 0.1) {
      const sx = Math.round(VIRTUAL_W / 2 + Math.sin(this.t * 0.5) * 60);
      const sy = this.shojiBottom - 44;
      g.fillStyle = presence > 0.5 ? shade(p, 0) : shade(p, 1);
      // 頭と胴の小さな影
      g.fillRect(sx - 3, sy, 6, 6);
      g.fillRect(sx - 4, sy + 6, 8, 14);
    }

    // 障子の桟（格子）
    g.fillStyle = shade(p, 1);
    for (let x = 6; x < VIRTUAL_W - 6; x += 16) g.fillRect(x, this.shojiTop, 1, this.shojiBottom - this.shojiTop);
    for (let y = this.shojiTop; y < this.shojiBottom; y += 16) g.fillRect(6, y, VIRTUAL_W - 12, 1);
    // 障子の枠
    g.fillStyle = shade(p, 2);
    g.fillRect(4, this.shojiTop - 2, VIRTUAL_W - 8, 2);
    g.fillRect(4, this.shojiBottom, VIRTUAL_W - 8, 2);

    // 埃（外光の中でキラッと）
    for (const d of this.dust) {
      const on = (Math.sin(d.phase) + 1) / 2 > 0.5;
      if (!on) continue;
      g.fillStyle = shade(p, 3);
      g.fillRect(Math.round(d.x), Math.round(d.y), 1, 1);
    }

    // 畳（縁と目）
    g.fillStyle = shade(p, 1);
    g.fillRect(0, this.tatamiY, VIRTUAL_W, VIRTUAL_H - this.tatamiY);
    g.fillStyle = shade(p, 0);
    for (let y = this.tatamiY + 4; y < VIRTUAL_H; y += 6) g.fillRect(0, y, VIRTUAL_W, 1);
    for (let x = 40; x < VIRTUAL_W; x += 80) g.fillRect(x, this.tatamiY, 1, VIRTUAL_H - this.tatamiY);

    // 行灯（左下・炎がゆらぐ）
    const fx = 18;
    const fy = this.tatamiY - 24;
    g.fillStyle = shade(p, 1);
    g.fillRect(fx, fy, 12, 20); // 箱
    const flick = 0.6 + Math.sin(this.t * 8) * 0.2 + this.intensity * 0.3 - this.retreat * 0.4;
    g.fillStyle = flick > 0.7 ? "#e8a24a" : shade(p, 2);
    g.fillRect(fx + 4, fy + 6, 4, 8); // 灯り
    if (flick > 0.85) {
      g.fillStyle = shade(p, 3);
      g.fillRect(fx + 5, fy + 8, 2, 4);
    }

    // 最高潮：畳に灯る光の足あと（子どもが歩み出る）
    if (this.peak > 0.01) {
      const k = this.peak;
      g.fillStyle = "#e8a24a";
      const n = Math.round(k * 5);
      for (let i = 0; i < n; i++) {
        const fxp = Math.round(VIRTUAL_W / 2 - 26 + i * 12);
        const fyp = this.tatamiY + 6 + (i % 2) * 5;
        g.globalAlpha = k * (0.5 + ((Math.sin(this.t * 4 + i) + 1) / 2) * 0.5);
        g.fillRect(fxp, fyp, 2, 1);
        g.fillRect(fxp, fyp - 1, 1, 1);
      }
      g.globalAlpha = 1;
    }
  }
}
