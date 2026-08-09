import { VIRTUAL_W, VIRTUAL_H } from "../../core/Renderer";
import { ONO_P, shade } from "../../core/Palette";
import type { ThemeBackdrop } from "../theme/SceneTheme";

// 特別章『オノマトペの野原』の背景。
// 打鍵(pulse)ごとに、出題の種別に応じて風・水・光が“同期して”弾ける。
//   wind  … 横に走る風の筋＋草が一斉にしなる
//   water … 波紋のリング＋のぼる泡
//   light … 画面のきらめき＋放射する光の粒
// これによりタイピングのリズムが、そのまま野原の音・情景になる。

interface Streak { x: number; y: number; vx: number; life: number; }
interface Ripple { x: number; y: number; r: number; life: number; }
interface Spark { x: number; y: number; vx: number; vy: number; life: number; }
interface Bubble { x: number; y: number; vy: number; life: number; }
interface Grass { x: number; h: number; }

export class OnomatopoeiaBackdrop implements ThemeBackdrop {
  private t = 0;
  private intensity = 0;
  private readonly horizon = VIRTUAL_H - 46;

  private streaks: Streak[] = [];
  private ripples: Ripple[] = [];
  private sparks: Spark[] = [];
  private bubbles: Bubble[] = [];
  private grass: Grass[] = [];

  private flash = 0; // 光の全画面きらめき 0..1
  private bend = 0;  // 草のしなり（風で増減、符号で向き）
  private darkGust = 0; // ミス時の暗い突風
  private peak = 0;  // 最高潮 0..1
  private peakBeat = 0; // 合奏の拍

  constructor() {
    for (let x = 1; x < VIRTUAL_W; x += 3 + Math.floor(Math.random() * 3)) {
      this.grass.push({ x, h: 5 + Math.floor(Math.random() * 7) });
    }
  }

  gust(): void {
    // ミス：野原がざわっと翳り、草が乱れる。
    this.darkGust = 1;
    this.bend = -3;
  }

  // 打鍵に同期して情景を弾けさせる。
  pulse(kind = "wind"): void {
    if (kind === "wind") {
      const dir = Math.random() < 0.5 ? 1 : -1;
      const y = 20 + Math.random() * (this.horizon - 30);
      for (let i = 0; i < 3; i++) {
        this.streaks.push({
          x: dir > 0 ? -8 - i * 10 : VIRTUAL_W + 8 + i * 10,
          y: y + i * 2,
          vx: dir * (140 + Math.random() * 80),
          life: 1,
        });
      }
      this.bend = 3 * (Math.random() < 0.5 ? 1 : -1);
    } else if (kind === "water") {
      const x = VIRTUAL_W * 0.3 + Math.random() * VIRTUAL_W * 0.4;
      this.ripples.push({ x, y: this.horizon - 6, r: 1, life: 1 });
      this.bubbles.push({ x: x + (Math.random() * 8 - 4), y: this.horizon - 4, vy: 18 + Math.random() * 10, life: 1 });
    } else {
      // light
      this.flash = Math.min(1, this.flash + 0.7);
      const cx = VIRTUAL_W / 2;
      const cy = this.horizon - 40;
      for (let i = 0; i < 8; i++) {
        const a = (Math.PI * 2 * i) / 8 + Math.random() * 0.4;
        const sp = 40 + Math.random() * 40;
        this.sparks.push({ x: cx, y: cy, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: 1 });
      }
    }
  }

  update(dt: number, intensity = 0): void {
    this.t += dt;
    this.intensity = intensity;
    const target = Math.max(0, Math.min(1, (intensity - 0.75) / 0.25));
    this.peak += (target - this.peak) * Math.min(1, dt * (target > this.peak ? 3 : 1.8));
    // 最高潮：風・水・光が拍に乗って一斉に湧き立つ合奏。
    if (this.peak > 0.05) {
      this.peakBeat -= dt;
      if (this.peakBeat <= 0) {
        this.pulse("wind");
        this.pulse("water");
        this.pulse("light");
        this.peakBeat = 0.22 - this.peak * 0.08;
      }
    }
    this.flash = Math.max(0, this.flash - dt * 3);
    this.bend *= Math.pow(0.02, dt); // すばやく中央へ戻す
    if (this.darkGust > 0) this.darkGust = Math.max(0, this.darkGust - dt * 1.2);

    for (const s of this.streaks) { s.x += s.vx * dt; s.life -= dt * 1.6; }
    this.streaks = this.streaks.filter((s) => s.life > 0);

    for (const r of this.ripples) { r.r += dt * 46; r.life -= dt * 1.5; }
    this.ripples = this.ripples.filter((r) => r.life > 0);

    for (const b of this.bubbles) { b.y -= b.vy * dt; b.life -= dt * 1.4; }
    this.bubbles = this.bubbles.filter((b) => b.life > 0);

    for (const s of this.sparks) { s.x += s.vx * dt; s.y += s.vy * dt; s.vy += 40 * dt; s.life -= dt * 1.8; }
    this.sparks = this.sparks.filter((s) => s.life > 0);
  }

  draw(g: CanvasRenderingContext2D): void {
    const p = ONO_P;

    // 空（ディザで淡いグラデ）
    g.fillStyle = shade(p, 1);
    g.fillRect(0, 0, VIRTUAL_W, this.horizon);
    g.fillStyle = shade(p, 2);
    for (let y = 0; y < this.horizon; y += 2) {
      const on = y < this.horizon * 0.5;
      if (on) for (let x = (y % 4); x < VIRTUAL_W; x += 4) g.fillRect(x, y, 1, 1);
    }

    // 遠い丘
    g.fillStyle = shade(p, 1);
    for (let x = 0; x < VIRTUAL_W; x++) {
      const h = 10 + Math.round(Math.sin(x * 0.03) * 6 + Math.sin(x * 0.011) * 4);
      g.fillRect(x, this.horizon - h, 1, h);
    }

    // 太陽（コンボで明るく脈打つ／最高潮で眩く光条を放つ）
    const sunPulse = this.intensity > 0.4 ? 1 : 0;
    const sunX = Math.round(VIRTUAL_W * 0.5);
    const sunY = this.horizon - 40;
    const sunR = 12 + sunPulse + Math.round(this.peak * 3);
    if (this.peak > 0.01) {
      g.globalAlpha = this.peak * 0.5;
      g.fillStyle = "#ffe27a";
      for (let a = 0; a < 12; a++) {
        const ang = (Math.PI * 2 * a) / 12 + this.t * 0.4;
        for (let r = sunR; r < sunR + 30; r += 2)
          g.fillRect(Math.round(sunX + Math.cos(ang) * r), Math.round(sunY + Math.sin(ang) * r), 1, 1);
      }
      g.globalAlpha = 1;
    }
    this.disc(g, sunX, sunY, sunR, this.peak > 0.3 ? "#ffe27a" : shade(p, 3));

    // 風の筋
    for (const s of this.streaks) {
      g.fillStyle = s.life > 0.5 ? shade(p, 3) : shade(p, 2);
      const len = 6 + Math.round(s.life * 6);
      g.fillRect(Math.round(s.x), Math.round(s.y), len, 1);
    }

    // 波紋（地平線際の水面）
    for (const r of this.ripples) {
      g.fillStyle = r.life > 0.4 ? shade(p, 3) : shade(p, 2);
      this.ring(g, Math.round(r.x), Math.round(r.y), Math.round(r.r));
    }
    // のぼる泡
    for (const b of this.bubbles) {
      g.fillStyle = shade(p, 3);
      g.fillRect(Math.round(b.x), Math.round(b.y), 1, 1);
    }

    // 光の粒
    for (const s of this.sparks) {
      g.fillStyle = s.life > 0.5 ? "#fffbe0" : shade(p, 3);
      g.fillRect(Math.round(s.x), Math.round(s.y), 1, 1);
    }

    // 草原
    g.fillStyle = shade(p, 1);
    g.fillRect(0, this.horizon, VIRTUAL_W, VIRTUAL_H - this.horizon);
    // 波打つ草（風のしなり bend＋常時のそよぎ）
    g.fillStyle = shade(p, 2);
    for (const gr of this.grass) {
      const sway = this.bend + Math.sin(this.t * 2 + gr.x * 0.12) * (1 + this.intensity);
      for (let i = 0; i < gr.h; i++) {
        const dx = Math.round((i / gr.h) * sway);
        g.fillRect(gr.x + dx, this.horizon - i, 1, 1);
      }
    }

    // 光のフラッシュ（全画面の淡いきらめき）
    if (this.flash > 0.02) {
      g.globalAlpha = this.flash * 0.35;
      g.fillStyle = "#fffbe0";
      g.fillRect(0, 0, VIRTUAL_W, VIRTUAL_H);
      g.globalAlpha = 1;
    }
    // ミスの暗い突風
    if (this.darkGust > 0.02) {
      g.globalAlpha = this.darkGust * 0.4;
      g.fillStyle = shade(p, 0);
      g.fillRect(0, 0, VIRTUAL_W, VIRTUAL_H);
      g.globalAlpha = 1;
    }
  }

  private disc(g: CanvasRenderingContext2D, cx: number, cy: number, r: number, color: string): void {
    g.fillStyle = color;
    for (let y = -r; y <= r; y++) {
      const w = Math.floor(Math.sqrt(Math.max(0, r * r - y * y)));
      g.fillRect(cx - w, cy + y, w * 2, 1);
    }
  }

  // 中空の円（波紋用）。8方位近似のピクセルリング。
  private ring(g: CanvasRenderingContext2D, cx: number, cy: number, r: number): void {
    if (r < 1) return;
    const step = 1 / (r + 2);
    for (let a = 0; a < Math.PI * 2; a += step) {
      const x = cx + Math.round(Math.cos(a) * r);
      const y = cy + Math.round(Math.sin(a) * r * 0.5); // 水面なので縦を潰す
      g.fillRect(x, y, 1, 1);
    }
  }
}
