import { VIRTUAL_W, VIRTUAL_H } from "../../core/Renderer";
import { MUSEI_P, shade } from "../../core/Palette";
import type { ThemeBackdrop } from "../theme/SceneTheme";

// 『無声慟哭』青ぐらい修羅の野原。
// 蛍光菌がぼうっと明滅し、毒草のシルエットが立つ。
// 打鍵：白い小花がひとつ咲く。ミス：野原が暗くざわめく。
// 最高潮：野原一面に白い花が咲き満ち、匂いのような淡い光が立ちのぼる。
// 締め：光の粒（魂）が天へ昇り、空に新しい星が灯って白く明ける。

interface Flower { x: number; y: number; bloom: number; } // bloom 0..1
interface Fungus { x: number; y: number; phase: number; speed: number; }
interface Soul { x: number; y: number; vy: number; life: number; }

export class MuseiBackdrop implements ThemeBackdrop {
  private t = 0;
  private peak = 0;
  private flowers: Flower[] = [];
  private fungi: Fungus[] = [];
  private souls: Soul[] = [];
  private dread = 0; // ミスのざわめき
  private fin = 0;
  private readonly horizon = VIRTUAL_H - 58;

  constructor() {
    for (let i = 0; i < 12; i++) {
      this.fungi.push({
        x: 10 + Math.random() * (VIRTUAL_W - 20),
        y: this.horizon + 6 + Math.random() * (VIRTUAL_H - this.horizon - 14),
        phase: Math.random() * Math.PI * 2,
        speed: 0.8 + Math.random() * 1.4,
      });
    }
  }

  gust(): void {
    this.dread = 1;
  }

  // 打鍵：白い花がひとつ咲く。
  pulse(): void {
    if (this.flowers.length < 160) {
      this.flowers.push({
        x: 6 + Math.random() * (VIRTUAL_W - 12),
        y: this.horizon + 2 + Math.random() * (VIRTUAL_H - this.horizon - 8),
        bloom: 0.01,
      });
    }
  }

  finale(): void {
    this.fin = 0.0001;
    // 咲いた花から魂の光が立ちのぼる
    for (const f of this.flowers) {
      if (f.bloom > 0.5 && Math.random() < 0.5) {
        this.souls.push({ x: f.x, y: f.y, vy: -(24 + Math.random() * 30), life: 1 });
      }
    }
  }

  update(dt: number, intensity = 0): void {
    this.t += dt;
    const target = Math.max(0, Math.min(1, (intensity - 0.75) / 0.25));
    this.peak += (target - this.peak) * Math.min(1, dt * (target > this.peak ? 3 : 1.8));
    if (this.fin > 0) this.fin += dt;
    if (this.dread > 0) this.dread = Math.max(0, this.dread - dt * 1.1);

    for (const fg of this.fungi) fg.phase += fg.speed * dt;
    for (const f of this.flowers) f.bloom = Math.min(1, f.bloom + dt * 0.8);

    // 最高潮：花が野原を埋めていく
    if (this.peak > 0.1 && this.flowers.length < 160 && Math.random() < this.peak * 30 * dt) {
      this.pulse();
    }
    // 最高潮：淡い光（匂い）が立ちのぼる
    if (this.peak > 0.2 && Math.random() < this.peak * 8 * dt) {
      this.souls.push({
        x: Math.random() * VIRTUAL_W,
        y: this.horizon + Math.random() * 30,
        vy: -(10 + Math.random() * 14),
        life: 0.7,
      });
    }
    for (const s of this.souls) { s.y += s.vy * dt; s.life -= dt * 0.5; }
    this.souls = this.souls.filter((s) => s.life > 0 && s.y > -4);
  }

  draw(g: CanvasRenderingContext2D): void {
    const p = MUSEI_P;
    const finK = this.fin > 0 ? Math.min(1, this.fin / 2.8) : 0;

    // 夜の底（空）
    g.fillStyle = shade(p, 0);
    g.fillRect(0, 0, VIRTUAL_W, VIRTUAL_H);
    // かすかな星
    g.fillStyle = shade(p, 2);
    for (let i = 0; i < 20; i++) {
      const x = Math.round((Math.sin(i * 91.7) * 0.5 + 0.5) * VIRTUAL_W);
      const y = Math.round((Math.sin(i * 13.3) * 0.5 + 0.5) * (this.horizon - 20));
      const tw = (Math.sin(this.t * 1.5 + i * 3) + 1) / 2;
      if (tw > 0.5) g.fillRect(x, y, 1, 1);
    }

    // 締め：あたらしい天の星（大きく明るく灯る）
    if (finK > 0) {
      const cx = Math.round(VIRTUAL_W / 2);
      const cy = 38;
      const tw = (Math.sin(this.t * 8) + 1) / 2;
      g.fillStyle = tw > 0.4 ? "#ffffff" : shade(p, 3);
      g.fillRect(cx - 1, cy - 1, 3, 3);
      const arm = Math.round(2 + finK * 10 + tw * 2);
      for (let i = 1; i <= arm; i++) {
        g.globalAlpha = finK * (1 - i / arm);
        g.fillRect(cx, cy - 1 - i, 1, 1);
        g.fillRect(cx, cy + 1 + i, 1, 1);
        g.fillRect(cx - 1 - i, cy, 1, 1);
        g.fillRect(cx + 1 + i, cy, 1, 1);
      }
      g.globalAlpha = 1;
    }

    // 遠い野原の稜線
    g.fillStyle = shade(p, 1);
    for (let x = 0; x < VIRTUAL_W; x++) {
      const h = 6 + Math.round(Math.sin(x * 0.025 + 1) * 3 + Math.sin(x * 0.01) * 2);
      g.fillRect(x, this.horizon - h, 1, h);
    }

    // 野原（地面）
    g.fillStyle = shade(p, 1);
    g.fillRect(0, this.horizon, VIRTUAL_W, VIRTUAL_H - this.horizon);
    g.fillStyle = shade(p, 0);
    for (let y = this.horizon + 2; y < VIRTUAL_H; y += 3) {
      for (let x = y % 6; x < VIRTUAL_W; x += 6) g.fillRect(x, y, 2, 1);
    }

    // 毒草のシルエット（とげとげした草）
    g.fillStyle = shade(p, 0);
    for (let i = 0; i < 9; i++) {
      const x = 20 + i * 52;
      const h = 10 + (i % 3) * 4;
      const sway = Math.sin(this.t * 1.4 + i) * 1.5;
      for (let d = 0; d < h; d++) g.fillRect(Math.round(x + (d / h) * sway), this.horizon - d + 4, 1, 1);
      g.fillRect(Math.round(x + sway) - 2, this.horizon - h + 6, 2, 1); // とげ
      g.fillRect(Math.round(x + sway) + 1, this.horizon - h + 9, 2, 1);
    }

    // 蛍光菌（ぼうっと明滅する光斑）
    for (const fg of this.fungi) {
      const glow = (Math.sin(fg.phase) + 1) / 2;
      if (glow < 0.25) continue;
      const bright = glow * (1 - this.dread * 0.7);
      g.globalAlpha = bright * 0.7;
      g.fillStyle = bright > 0.6 ? "#b8f0d0" : shade(p, 2);
      const x = Math.round(fg.x);
      const y = Math.round(fg.y);
      g.fillRect(x, y, 2, 1);
      if (bright > 0.5) {
        g.globalAlpha = bright * 0.3;
        g.fillRect(x - 1, y - 1, 4, 3);
      }
    }
    g.globalAlpha = 1;

    // 白い花（打鍵と最高潮で咲き増える）
    for (const f of this.flowers) {
      const x = Math.round(f.x);
      const y = Math.round(f.y);
      if (f.bloom < 0.4) {
        g.fillStyle = shade(p, 2);
        g.fillRect(x, y, 1, 1); // つぼみ
      } else {
        g.fillStyle = "#f4fff4";
        g.fillRect(x, y, 1, 1);
        g.fillStyle = shade(p, 3);
        g.fillRect(x - 1, y, 1, 1);
        g.fillRect(x + 1, y, 1, 1);
        g.fillRect(x, y - 1, 1, 1);
      }
    }

    // 立ちのぼる光（匂い／魂）
    for (const s of this.souls) {
      const drift = Math.sin(this.t * 3 + s.x) * 1.5;
      g.globalAlpha = Math.min(1, s.life);
      g.fillStyle = s.life > 0.5 ? "#f4fff4" : shade(p, 2);
      g.fillRect(Math.round(s.x + drift), Math.round(s.y), 1, 1);
      g.globalAlpha = 1;
    }

    // 最高潮：野原に淡い白光が満ちる
    if (this.peak > 0.01) {
      g.globalAlpha = this.peak * 0.22;
      g.fillStyle = "#f4fff4";
      g.fillRect(0, this.horizon - 20, VIRTUAL_W, VIRTUAL_H - this.horizon + 20);
      g.globalAlpha = 1;
    }

    // 締め：白く明ける
    if (finK > 0) {
      g.globalAlpha = Math.max(0, finK - 0.3) * 0.65;
      g.fillStyle = "#ffffff";
      g.fillRect(0, 0, VIRTUAL_W, VIRTUAL_H);
      g.globalAlpha = 1;
    }

    // ミス：暗いざわめき
    if (this.dread > 0.05) {
      g.globalAlpha = this.dread * 0.45;
      g.fillStyle = "#04070c";
      g.fillRect(0, 0, VIRTUAL_W, VIRTUAL_H);
      g.globalAlpha = 1;
    }
  }
}
