import { VIRTUAL_W, VIRTUAL_H } from "../../core/Renderer";
import { HARUGA_P, shade } from "../../core/Palette";
import type { ThemeBackdrop } from "../theme/SceneTheme";

// 『春の蛾（一〇一五）』井戸とアムバアの光。
// 画面下半分は水面（波・気泡・きらめき）。斜めに差す琥珀光。
// 水面に溺れかける一匹の蛾。打鍵：気泡と波紋。ミス：水面が乱れ暗く。
// 最高潮：琥珀の光が満ち、水面が虹色（イリデスセンス）にきらめく。
// 締め：蛾が水けむりを上げ、ジグザグの軌跡で雲間へ飛び立つ。

interface Bubble { x: number; y: number; vy: number; life: number; }
interface Ripple { x: number; y: number; r: number; life: number; }
interface Trail { x: number; y: number; life: number; }

const IRIDESCENT = ["#ff9a8a", "#ffd45e", "#8ae0a0", "#8fd0ff", "#d0a0ff"];

export class HarugaBackdrop implements ThemeBackdrop {
  private t = 0;
  private intensity = 0;
  private peak = 0;
  private bubbles: Bubble[] = [];
  private ripples: Ripple[] = [];
  private trail: Trail[] = [];
  private churn = 0; // ミスの乱れ
  private fin = 0;
  private readonly waterY = Math.round(VIRTUAL_H * 0.55);
  private mothX = VIRTUAL_W * 0.45;
  private mothY = 0; // waterY からの相対（締めで上昇）

  gust(): void {
    this.churn = 1;
  }

  // 打鍵：気泡がのぼり、波紋がひろがる。
  pulse(): void {
    const x = 40 + Math.random() * (VIRTUAL_W - 80);
    this.bubbles.push({ x, y: VIRTUAL_H - 8, vy: 26 + Math.random() * 16, life: 1 });
    this.ripples.push({ x, y: this.waterY + 2, r: 1, life: 1 });
  }

  finale(): void {
    this.fin = 0.0001;
    // 飛び立ちの水けむり
    for (let i = 0; i < 10; i++) {
      this.ripples.push({
        x: this.mothX + Math.random() * 10 - 5,
        y: this.waterY + 2,
        r: 1 + Math.random() * 3,
        life: 1,
      });
    }
  }

  update(dt: number, intensity = 0): void {
    this.t += dt;
    this.intensity = intensity;
    const target = Math.max(0, Math.min(1, (intensity - 0.75) / 0.25));
    this.peak += (target - this.peak) * Math.min(1, dt * (target > this.peak ? 3 : 1.8));
    if (this.fin > 0) this.fin += dt;
    if (this.churn > 0) this.churn = Math.max(0, this.churn - dt * 1.2);

    for (const b of this.bubbles) {
      b.y -= b.vy * dt;
      b.x += Math.sin(this.t * 4 + b.vy) * 6 * dt;
      b.life -= dt * 0.8;
      if (b.y < this.waterY) b.life = Math.min(b.life, 0.15); // 水面で弾ける
    }
    this.bubbles = this.bubbles.filter((b) => b.life > 0);

    for (const r of this.ripples) { r.r += dt * 34; r.life -= dt * 1.6; }
    this.ripples = this.ripples.filter((r) => r.life > 0);

    // 締め：蛾がジグザグに上昇し軌跡を残す
    if (this.fin > 0) {
      const k = Math.min(1, this.fin / 2.8);
      this.mothY = -k * (this.waterY - 20);
      this.mothX += Math.sin(this.fin * 7) * 60 * dt; // ジグザグ航行
      if (Math.random() < 18 * dt) {
        this.trail.push({ x: this.mothX, y: this.waterY - 4 + this.mothY, life: 1 });
      }
    } else {
      // もがく蛾（小刻み）
      this.mothX += Math.sin(this.t * 9) * 3 * dt;
    }
    for (const tr of this.trail) tr.life -= dt * 0.6;
    this.trail = this.trail.filter((tr) => tr.life > 0);
  }

  draw(g: CanvasRenderingContext2D): void {
    const p = HARUGA_P;
    const finK = this.fin > 0 ? Math.min(1, this.fin / 2.8) : 0;

    // 井戸の中の闇（上半分）
    g.fillStyle = shade(p, 0);
    g.fillRect(0, 0, VIRTUAL_W, this.waterY);

    // 斜めに差すアムバアの光（3本のシャフト）
    const beamGlow = 0.3 + this.intensity * 0.3 + this.peak * 0.4 + finK * 0.3;
    for (let b = 0; b < 3; b++) {
      const bx = 100 + b * 110;
      g.globalAlpha = beamGlow * (0.5 + (Math.sin(this.t * 1.2 + b) + 1) * 0.15);
      g.fillStyle = shade(p, b === 1 ? 3 : 2);
      for (let y = 0; y < this.waterY; y += 2) {
        const x = bx + Math.round(y * 0.5);
        const w = 8 + Math.round(b * 3 + y * 0.06);
        for (let xx = x + (y % 4); xx < x + w; xx += 4) g.fillRect(xx, y, 2, 1);
      }
    }
    g.globalAlpha = 1;

    // 雲の間（最上部にのぞく空＝締めの行き先）
    g.fillStyle = shade(p, 1);
    g.fillRect(0, 0, VIRTUAL_W, 10);
    g.fillStyle = shade(p, 2);
    for (let x = 0; x < VIRTUAL_W; x += 8) {
      g.fillRect(x + Math.round(Math.sin(x * 0.2 + this.t * 0.5) * 2), 8, 5, 2);
    }

    // 水面より下（琥珀の水）
    g.fillStyle = shade(p, 1);
    g.fillRect(0, this.waterY, VIRTUAL_W, VIRTUAL_H - this.waterY);
    g.fillStyle = shade(p, 0);
    for (let y = this.waterY + 8; y < VIRTUAL_H; y += 3) {
      for (let x = y % 6; x < VIRTUAL_W; x += 6) g.fillRect(x, y, 3, 1);
    }

    // 水面の波（うららかな sin ライン。ミスで乱れる）
    const rough = 1 + this.churn * 3;
    for (let i = 0; i < 3; i++) {
      g.fillStyle = i === 0 ? shade(p, 3) : shade(p, 2);
      for (let x = 0; x < VIRTUAL_W; x += 2) {
        const yy = this.waterY + i * 4 + Math.sin(x * 0.05 + this.t * (2 + i) + i * 2) * rough;
        g.fillRect(x, Math.round(yy), 2, 1);
      }
    }

    // イリデスセンスのきらめき（最高潮で虹色に）
    const shimmer = 0.2 + this.intensity * 0.3 + this.peak;
    for (let i = 0; i < 26; i++) {
      const x = Math.round((Math.sin(i * 37.1) * 0.5 + 0.5) * VIRTUAL_W);
      const y = this.waterY + 2 + Math.round((Math.sin(i * 53.7) * 0.5 + 0.5) * 30);
      const tw = (Math.sin(this.t * 5 + i * 1.7) + 1) / 2;
      if (tw > 0.6) {
        g.globalAlpha = Math.min(1, shimmer * tw);
        g.fillStyle = this.peak > 0.3 ? IRIDESCENT[i % IRIDESCENT.length] : shade(p, 3);
        g.fillRect(x, y, 1, 1);
      }
    }
    g.globalAlpha = 1;

    // 気泡
    for (const b of this.bubbles) {
      g.fillStyle = b.life > 0.4 ? shade(p, 3) : shade(p, 2);
      g.fillRect(Math.round(b.x), Math.round(b.y), 1, 1);
      if (b.life > 0.7) g.fillRect(Math.round(b.x) + 1, Math.round(b.y) - 1, 1, 1);
    }

    // 波紋
    for (const r of this.ripples) {
      g.fillStyle = r.life > 0.4 ? shade(p, 3) : shade(p, 2);
      this.ring(g, Math.round(r.x), Math.round(r.y), Math.round(r.r));
    }

    // 蛾の軌跡（締め）
    for (const tr of this.trail) {
      g.globalAlpha = tr.life * 0.8;
      g.fillStyle = "#ffd45e";
      g.fillRect(Math.round(tr.x), Math.round(tr.y), 1, 1);
      g.globalAlpha = 1;
    }

    // 蛾（水面でもがく／締めで飛び立つ）
    this.drawMoth(g, Math.round(this.mothX), Math.round(this.waterY - 2 + this.mothY), finK);

    // 最高潮：琥珀の光が満ちる
    if (this.peak > 0.01) {
      g.globalAlpha = this.peak * 0.25;
      g.fillStyle = "#ffd45e";
      g.fillRect(0, 0, VIRTUAL_W, VIRTUAL_H);
      g.globalAlpha = 1;
    }

    // 締め：光が満ち、空へ
    if (finK > 0) {
      g.globalAlpha = Math.max(0, finK - 0.3) * 0.6;
      g.fillStyle = "#f8e8b4";
      g.fillRect(0, 0, VIRTUAL_W, VIRTUAL_H);
      g.globalAlpha = 1;
    }

    // ミス：暗い乱れ
    if (this.churn > 0.05) {
      g.globalAlpha = this.churn * 0.35;
      g.fillStyle = shade(p, 0);
      g.fillRect(0, 0, VIRTUAL_W, VIRTUAL_H);
      g.globalAlpha = 1;
    }
  }

  private drawMoth(g: CanvasRenderingContext2D, x: number, y: number, finK: number): void {
    const p = HARUGA_P;
    // 締め中は速い羽ばたき、水面では弱いもがき
    const flapSpd = finK > 0 ? 18 : 6;
    const flap = Math.sin(this.t * flapSpd) > 0;
    g.fillStyle = shade(p, 3);
    g.fillRect(x, y, 2, 2); // 胴
    g.fillStyle = finK > 0.3 ? "#ffd45e" : shade(p, 2);
    if (flap) {
      g.fillRect(x - 3, y - 1, 3, 2); // 開いた翅
      g.fillRect(x + 2, y - 1, 3, 2);
    } else {
      g.fillRect(x - 2, y, 2, 1); // 閉じた翅
      g.fillRect(x + 2, y, 2, 1);
    }
  }

  // 水面の波紋（縦を潰した楕円リング）。
  private ring(g: CanvasRenderingContext2D, cx: number, cy: number, r: number): void {
    if (r < 1) return;
    const step = 1 / (r + 2);
    for (let a = 0; a < Math.PI * 2; a += step) {
      const x = cx + Math.round(Math.cos(a) * r);
      const y = cy + Math.round(Math.sin(a) * r * 0.35);
      g.fillRect(x, y, 1, 1);
    }
  }
}
