import { VIRTUAL_W, VIRTUAL_H } from "../../core/Renderer";
import { SLEET, shade } from "../../core/Palette";
import type { ThemeBackdrop } from "../theme/SceneTheme";

// 『永訣の朝』みぞれの夜明け。
// 濡れた霙が斜めに降り、地面で潰れて飛沫。地平にうすあかい陰惨な雲。
// コンボで暁が温まり、二つの灯（＝欠けた陶椀）がまたたく。
// 締め：二つの灯が昇って一つの白い魂となり、空が白く明ける。

interface Flake { x: number; y: number; vx: number; vy: number; wob: number; wet: boolean; }
interface Splash { x: number; y: number; life: number; }

export class EiketsuBackdrop implements ThemeBackdrop {
  private t = 0;
  private intensity = 0;
  private peak = 0;  // 最高潮 0..1
  private flakes: Flake[] = [];
  private splashes: Splash[] = [];
  private cover = 0; // ミスの翳り
  private fin = 0;   // 締め演出タイマー（>0で進行）
  private readonly horizon = VIRTUAL_H - 40;

  constructor() {
    for (let i = 0; i < 70; i++) this.flakes.push(this.newFlake(Math.random() * this.horizon));
  }

  private newFlake(y = -2): Flake {
    const wet = Math.random() < 0.5;
    return {
      x: Math.random() * (VIRTUAL_W + 40) - 20,
      y,
      vx: -14 - Math.random() * 10,
      vy: (wet ? 44 : 66) + Math.random() * 20,
      wob: Math.random() * 6,
      wet,
    };
  }

  gust(): void {
    this.cover = 1;
  }

  finale(): void {
    this.fin = 0.0001;
  }

  update(dt: number, intensity = 0): void {
    this.t += dt;
    this.intensity = intensity;
    const target = Math.max(0, Math.min(1, (intensity - 0.75) / 0.25));
    this.peak += (target - this.peak) * Math.min(1, dt * (target > this.peak ? 3 : 1.8));
    if (this.fin > 0) this.fin += dt;
    if (this.cover > 0) this.cover = Math.max(0, this.cover - dt * 0.9);

    const windBoost = 1 + this.cover * 1.6;
    for (const f of this.flakes) {
      f.x += f.vx * windBoost * dt;
      f.y += f.vy * dt;
      f.wob += dt * 3;
      if (f.y >= this.horizon) {
        if (f.wet) this.splashes.push({ x: f.x, y: this.horizon, life: 1 });
        Object.assign(f, this.newFlake());
      } else if (f.x < -20) {
        Object.assign(f, this.newFlake(Math.random() * this.horizon));
      }
    }
    for (const s of this.splashes) s.life -= dt * 2.2;
    this.splashes = this.splashes.filter((s) => s.life > 0);
  }

  draw(g: CanvasRenderingContext2D): void {
    const p = SLEET;
    const finGlow = Math.min(1, this.fin / 2.8);

    // 空
    g.fillStyle = shade(p, 0);
    g.fillRect(0, 0, VIRTUAL_W, VIRTUAL_H);

    // 地平のうすあかい陰惨な雲（コンボ・最高潮・締めで暖かく強まる）
    const warm = Math.min(1, this.intensity * 0.8 + this.peak * 0.6 + finGlow) * (1 - this.cover * 0.5);
    for (let y = this.horizon - 30; y < this.horizon; y++) {
      const k = (y - (this.horizon - 30)) / 30;
      if ((Math.sin(y * 0.7) + 1) / 2 < k * 0.9) {
        g.fillStyle = warm > 0.3 ? "#e6a6a6" : shade(p, 1);
        g.globalAlpha = 0.25 + warm * 0.4;
        g.fillRect(0, y, VIRTUAL_W, 1);
        g.globalAlpha = 1;
      }
    }

    // 表がふしぎに明るむ（地面）
    const bright = 0.4 + this.intensity * 0.4 + this.peak * 0.5 + finGlow * 0.6;
    g.fillStyle = shade(p, bright > 0.8 ? 3 : 2);
    g.globalAlpha = Math.min(1, bright);
    g.fillRect(0, this.horizon, VIRTUAL_W, VIRTUAL_H - this.horizon);
    g.globalAlpha = 1;

    // 軒のシルエット
    g.fillStyle = shade(p, 0);
    g.fillRect(0, this.horizon - 10, 90, 3);
    for (let i = 0; i < 90; i += 6) g.fillRect(i, this.horizon - 7, 1, 3); // 雫の下地

    // 二つの灯（欠けた陶椀）— コンボで灯る
    const lit = this.intensity > 0.25 || finGlow > 0 || this.peak > 0.05;
    if (lit) {
      // 最高潮ではまたたきが鎮まり、暖かく一定に灯り続ける。
      const tw = (Math.sin(this.t * 4) + 1) / 2 * (1 - this.peak) + this.peak;
      const a = 0.3 + tw * 0.5 + this.peak * 0.4 + finGlow * 0.4;
      g.globalAlpha = Math.min(1, a);
      g.fillStyle = "#e6a6a6";
      const ly = this.horizon - 26;
      if (this.fin <= 0) {
        this.bowlLight(g, VIRTUAL_W / 2 - 26, ly);
        this.bowlLight(g, VIRTUAL_W / 2 + 26, ly);
      }
      g.globalAlpha = 1;
    }

    // みぞれ
    for (const f of this.flakes) {
      const sway = Math.sin(f.wob);
      g.fillStyle = f.wet ? shade(p, 2) : shade(p, 3);
      const len = f.wet ? 3 : 2;
      g.fillRect(Math.round(f.x + sway), Math.round(f.y), 1, len);
    }
    // 飛沫（びちょ）
    for (const s of this.splashes) {
      g.fillStyle = shade(p, 3);
      const r = Math.round((1 - s.life) * 3);
      g.fillRect(Math.round(s.x) - r, Math.round(s.y), 1, 1);
      g.fillRect(Math.round(s.x) + r, Math.round(s.y), 1, 1);
    }

    // 息の白
    const bx = 70 + Math.sin(this.t * 0.6) * 8;
    const by = this.horizon - 22 - (this.t * 6) % 30;
    g.globalAlpha = 0.18;
    g.fillStyle = shade(p, 3);
    g.fillRect(Math.round(bx), Math.round(by), 3, 2);
    g.globalAlpha = 1;

    // 最高潮：朝が“ふしぎに明るく”白く咲く（締め中は締め側が担当）
    if (this.peak > 0.01 && this.fin <= 0) {
      g.globalAlpha = this.peak * 0.3;
      g.fillStyle = "#ffffff";
      g.fillRect(0, 0, VIRTUAL_W, VIRTUAL_H);
      g.globalAlpha = 1;
    }

    // 締め：二つの灯が昇り一つの白い魂に
    if (this.fin > 0) this.drawFinale(g, finGlow);
  }

  private bowlLight(g: CanvasRenderingContext2D, x: number, y: number): void {
    g.fillRect(x - 1, y, 3, 1);
    g.fillRect(x, y - 1, 1, 3);
  }

  private drawFinale(g: CanvasRenderingContext2D, k: number): void {
    // 二つの灯が中央へ寄り、合わさって上昇する白い星
    const mergeY = this.horizon - 26 - k * (this.horizon - 40);
    const sep = Math.max(0, 26 * (1 - k * 2));
    g.fillStyle = "#e6a6a6";
    this.bowlLight(g, VIRTUAL_W / 2 - sep, this.horizon - 26 - k * 20);
    this.bowlLight(g, VIRTUAL_W / 2 + sep, this.horizon - 26 - k * 20);
    if (k > 0.4) {
      const tw = (Math.sin(this.t * 8) + 1) / 2;
      g.fillStyle = tw > 0.4 ? "#ffffff" : "#eef2f5";
      const cx = VIRTUAL_W / 2;
      const cy = Math.round(mergeY);
      g.fillRect(cx - 1, cy - 1, 3, 3);
      const arm = 2 + Math.round((k - 0.4) * 6 + tw * 2);
      for (let i = 1; i <= arm; i++) {
        g.fillRect(cx, cy - 1 - i, 1, 1);
        g.fillRect(cx, cy + 1 + i, 1, 1);
        g.fillRect(cx - 1 - i, cy, 1, 1);
        g.fillRect(cx + 1 + i, cy, 1, 1);
      }
    }
    // 空が白く明ける
    g.globalAlpha = Math.max(0, (k - 0.3)) * 0.6;
    g.fillStyle = "#ffffff";
    g.fillRect(0, 0, VIRTUAL_W, VIRTUAL_H);
    g.globalAlpha = 1;
  }
}
