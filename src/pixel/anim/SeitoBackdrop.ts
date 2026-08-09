import { VIRTUAL_W, VIRTUAL_H } from "../../core/Renderer";
import { SEITO_P, shade } from "../../core/Palette";
import type { ThemeBackdrop } from "../theme/SceneTheme";
import { StarField } from "./StarField";
import { StarBurst } from "./StarBurst";

// 『生徒諸君に寄せる』教室から飛び立つ群像。地上の生徒が次々と光になり昇る。
// 打鍵：ひとりの生徒が地を蹴り、光の粒になって夜明けの空へ飛び立つ。
// ミス：足並みが乱れ、暗く沈む。
// 最高潮：地平線の金色がふくらみ高まる＝空が輝きを増す。
// 締め：諸君全員が一斉に光となり、新しい時代の地平線へ昇りきる。

interface Figure {
  x: number;
  baseY: number;
  y: number;
  rising: boolean;
  vy: number;
  t: number;
}

export class SeitoBackdrop implements ThemeBackdrop {
  private t = 0;
  private intensity = 0;
  private peak = 0;
  private fin = 0;
  private stumble = 0;
  private figures: Figure[] = [];
  private next = 0;
  private stars = new StarField(90);
  private burst = new StarBurst();
  private readonly horizon = VIRTUAL_H - 30;

  constructor() {
    const n = 7;
    for (let i = 0; i < n; i++) {
      const x = Math.round(((i + 0.5) / n) * (VIRTUAL_W - 40)) + 20;
      this.figures.push({ x, baseY: this.horizon, y: this.horizon, rising: false, vy: 0, t: Math.random() * 6 });
    }
  }

  gust(): void {
    this.stumble = 1;
  }

  // 打鍵：ひとりが地を蹴って飛び立つ。
  pulse(): void {
    const f = this.figures[this.next % this.figures.length];
    this.next++;
    if (!f.rising) {
      f.rising = true;
      f.vy = -(30 + Math.random() * 12);
    }
  }

  finale(): void {
    this.fin = 0.0001;
    for (const f of this.figures) f.rising = true;
  }

  update(dt: number, intensity = 0): void {
    this.t += dt;
    this.intensity = intensity;
    const target = Math.max(0, Math.min(1, (intensity - 0.7) / 0.3));
    this.peak += (target - this.peak) * Math.min(1, dt * (target > this.peak ? 3 : 1.6));
    if (this.fin > 0) this.fin += dt;
    if (this.stumble > 0) this.stumble = Math.max(0, this.stumble - dt * 1.4);

    this.stars.update(dt);
    this.burst.update(dt);

    const finBoost = this.fin > 0 ? 1.8 : 1;
    for (const f of this.figures) {
      if (f.rising) {
        f.y += f.vy * dt * finBoost;
        f.vy -= 10 * dt;
        if (f.y < this.horizon - 14 && Math.random() < dt * 10) {
          this.burst.burst(f.x, f.y, 3);
        }
        if (f.y < -6) {
          this.burst.burst(f.x, 0, 5);
          f.y = this.horizon;
          f.rising = this.fin > 0; // 締め中は昇り続ける（次々に発光して消える）
        }
      } else {
        f.t += dt;
      }
    }
  }

  draw(g: CanvasRenderingContext2D): void {
    const p = SEITO_P;
    const finK = this.fin > 0 ? Math.min(1, this.fin / 2.8) : 0;
    const dawn = Math.min(1, this.peak * 0.6 + finK);

    // 夜明けの空（下ほど金色ににじむグラデーション風ディザ）
    g.fillStyle = shade(p, 0);
    g.fillRect(0, 0, VIRTUAL_W, VIRTUAL_H);
    this.stars.draw(g, p);
    const bandTop = Math.round(VIRTUAL_H * 0.45);
    for (let y = bandTop; y < this.horizon; y += 1) {
      const k = (y - bandTop) / (this.horizon - bandTop);
      const glow = k * (0.35 + dawn * 0.65);
      if ((Math.sin(y * 1.7 + this.t) + 1) / 2 < glow) {
        g.fillStyle = k > 0.6 ? "#ffe9a8" : shade(p, 2);
        for (let x = y % 3; x < VIRTUAL_W; x += 3) g.fillRect(x, y, 2, 1);
      }
    }

    // 地平線（うねる北上山地の稜）
    g.fillStyle = shade(p, 1);
    for (let x = 0; x < VIRTUAL_W; x++) {
      const ridge = Math.round(Math.sin(x * 0.02) * 4 + Math.sin(x * 0.07) * 2);
      g.fillRect(x, this.horizon + ridge, 1, VIRTUAL_H - (this.horizon + ridge));
    }
    g.fillStyle = shade(p, 0);
    g.fillRect(0, VIRTUAL_H - 6, VIRTUAL_W, 6);

    // 生徒たちのシルエット（地上）と、飛び立つ光の軌跡
    for (const f of this.figures) {
      if (f.rising) {
        const k = Math.max(0, Math.min(1, (this.horizon - f.y) / (this.horizon + 10)));
        g.globalAlpha = Math.max(0.15, 1 - k * 0.6);
        g.fillStyle = k > 0.5 ? "#ffe9a8" : shade(p, 3);
        g.fillRect(Math.round(f.x), Math.round(f.y), 1, 2);
        g.globalAlpha = 1;
      } else {
        const bob = Math.round(Math.sin(f.t * (2 + this.intensity)) * 0.6);
        g.fillStyle = shade(p, 0);
        g.fillRect(f.x, f.baseY - 6 + bob, 3, 6); // 胴
        g.fillRect(f.x, f.baseY - 8 + bob, 3, 2); // 頭
      }
    }

    this.burst.draw(g, p);

    // 締め：全景が金色に満ちる
    if (finK > 0.1) {
      g.globalAlpha = Math.max(0, finK - 0.1) * 0.4;
      g.fillStyle = "#ffe9a8";
      g.fillRect(0, 0, VIRTUAL_W, VIRTUAL_H);
      g.globalAlpha = 1;
    }

    // ミス：足並みの乱れ（暗転）
    if (this.stumble > 0.05) {
      g.globalAlpha = this.stumble * 0.35;
      g.fillStyle = shade(p, 0);
      g.fillRect(0, 0, VIRTUAL_W, VIRTUAL_H);
      g.globalAlpha = 1;
    }
  }
}
