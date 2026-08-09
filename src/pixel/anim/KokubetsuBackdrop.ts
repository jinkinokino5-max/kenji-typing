import { VIRTUAL_W, VIRTUAL_H } from "../../core/Renderer";
import { KOKUBETSU_P, shade } from "../../core/Palette";
import type { ThemeBackdrop } from "../theme/SceneTheme";
import { StarField } from "./StarField";

// 『告別』音楽の才を持つ教え子への別れ。夜空へ音符が放たれてゆく。
// 打鍵：竹管から音符が一つ、夜空へのぼる。
// ミス：不協和音の赤い揺らぎ、音符が散る。
// 最高潮：ライトモチーフが高まる＝空に光の柱が並び立つ。
// 締め：「そらいっぱいの光でできたパイプオルガン」＝全幅に光の管が立ち並び輝く。

interface Note {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  kind: 0 | 1; // 0:♪ 1:♫
}

interface Pipe {
  x: number;
  h: number;
  glow: number;
}

export class KokubetsuBackdrop implements ThemeBackdrop {
  private t = 0;
  private intensity = 0;
  private peak = 0;
  private notes: Note[] = [];
  private dissonance = 0; // ミスの赤い揺らぎ
  private fin = 0;
  private readonly horizon = VIRTUAL_H - 34;
  private readonly playerX = Math.round(VIRTUAL_W * 0.28);
  private pipes: Pipe[] = [];

  constructor() {
    for (let i = 0; i < 16; i++) {
      this.pipes.push({ x: Math.round((i + 0.5) * (VIRTUAL_W / 16)), h: 0, glow: 0 });
    }
  }

  private stars = new StarField(120);

  gust(): void {
    this.dissonance = 1;
    for (const n of this.notes) n.vx += (Math.random() - 0.5) * 60;
  }

  // 打鍵：竹管の先から音符が一つ立ちのぼる。
  pulse(): void {
    this.notes.push({
      x: this.playerX + 4 + (Math.random() - 0.5) * 2,
      y: this.horizon - 20,
      vx: (Math.random() - 0.5) * 10,
      vy: -(24 + Math.random() * 10),
      life: 1,
      kind: Math.random() < 0.5 ? 0 : 1,
    });
  }

  finale(): void {
    this.fin = 0.0001;
  }

  update(dt: number, intensity = 0): void {
    this.t += dt;
    this.intensity = intensity;
    const target = Math.max(0, Math.min(1, (intensity - 0.7) / 0.3));
    this.peak += (target - this.peak) * Math.min(1, dt * (target > this.peak ? 3 : 1.6));
    if (this.fin > 0) this.fin += dt;
    if (this.dissonance > 0) this.dissonance = Math.max(0, this.dissonance - dt * 1.6);

    this.stars.update(dt);

    for (const n of this.notes) {
      n.x += n.vx * dt;
      n.y += n.vy * dt;
      n.vy -= 4 * dt; // ゆるやかに加速して昇る
      n.life -= dt * 0.45;
    }
    this.notes = this.notes.filter((n) => n.life > 0 && n.y > -10);

    // パイプオルガンの管（最高潮・締めで立ち上がる）
    const finK = this.fin > 0 ? Math.min(1, this.fin / 2.8) : 0;
    for (let i = 0; i < this.pipes.length; i++) {
      const p = this.pipes[i];
      const base = 6 + (i % 5) * 4;
      const targetH = finK > 0
        ? base + finK * (40 + (i % 4) * 10)
        : this.peak * (base + (i % 3) * 6);
      p.h += (targetH - p.h) * Math.min(1, dt * 4);
      p.glow = finK > 0 ? finK : this.peak;
    }
  }

  draw(g: CanvasRenderingContext2D): void {
    const p = KOKUBETSU_P;
    const finK = this.fin > 0 ? Math.min(1, this.fin / 2.8) : 0;

    // 夜空
    g.fillStyle = shade(p, 0);
    g.fillRect(0, 0, VIRTUAL_W, VIRTUAL_H);
    this.stars.draw(g, p);

    // 地平の丘（静かな野）
    g.fillStyle = shade(p, 1);
    for (let x = 0; x < VIRTUAL_W; x++) {
      const y = this.horizon + Math.round(Math.sin(x * 0.025) * 3);
      g.fillRect(x, y, 1, VIRTUAL_H - y);
    }
    g.fillStyle = shade(p, 0);
    g.fillRect(0, VIRTUAL_H - 8, VIRTUAL_W, 8);

    // 竹管を吹く教え子のシルエット
    const sway = Math.round(Math.sin(this.t * 1.6) * (1 + this.intensity * 0.6));
    g.fillStyle = shade(p, 0);
    g.fillRect(this.playerX, this.horizon - 10, 5, 10); // 胴
    g.fillRect(this.playerX + 1, this.horizon - 14, 3, 4); // 頭
    g.fillRect(this.playerX + 4, this.horizon - 20 + sway, 1, 10); // 竹管（斜め上）
    g.fillRect(this.playerX + 3, this.horizon - 21 + sway, 2, 2);

    // 音符
    for (const n of this.notes) {
      g.globalAlpha = Math.max(0, Math.min(1, n.life));
      g.fillStyle = n.life > 0.5 ? "#f0e6b8" : shade(p, 3);
      const x = Math.round(n.x);
      const y = Math.round(n.y);
      g.fillRect(x, y, 1, 1);
      g.fillRect(x + 1, y - 1, 1, 1);
      if (n.kind === 1) g.fillRect(x + 1, y, 1, 1);
      g.globalAlpha = 1;
    }

    // 最高潮・締め：光のパイプオルガン（全幅に管が並び立つ）
    for (const pipe of this.pipes) {
      if (pipe.h <= 0.5) continue;
      g.globalAlpha = Math.max(0.25, pipe.glow);
      g.fillStyle = pipe.glow > 0.6 ? "#fff6d8" : "#f0e6b8";
      g.fillRect(pipe.x, this.horizon - Math.round(pipe.h), 2, Math.round(pipe.h));
      g.globalAlpha = 1;
    }
    if (finK > 0.15) {
      g.globalAlpha = Math.max(0, finK - 0.15) * 0.35;
      g.fillStyle = "#fff6d8";
      g.fillRect(0, 0, VIRTUAL_W, VIRTUAL_H);
      g.globalAlpha = 1;
    }

    // ミス：不協和音の赤い揺らぎ
    if (this.dissonance > 0.05) {
      g.globalAlpha = this.dissonance * 0.3;
      g.fillStyle = "#a03030";
      g.fillRect(0, 0, VIRTUAL_W, VIRTUAL_H);
      g.globalAlpha = 1;
    }
  }
}
