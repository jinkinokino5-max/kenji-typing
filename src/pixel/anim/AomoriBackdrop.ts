import { VIRTUAL_W, VIRTUAL_H } from "../../core/Renderer";
import { AQUA, shade } from "../../core/Palette";
import type { ThemeBackdrop } from "../theme/SceneTheme";

// 『青森挽歌』銀河の夜汽車。
// 車窓が水族館になり、星の魚が漂う。電信柱が横に流れ、玲瓏レンズが回り、
// 遠くに巨きな水素のりんご（赤）。水の光網が揺らめき、窓に人影が映る。
// ミス：窓が曇り汽車が揺れる。締め：汽車が林檎の赤光を駆け抜ける。

interface Pole { x: number; }
interface Fish { x: number; y: number; vx: number; phase: number; jelly: boolean; }

export class AomoriBackdrop implements ThemeBackdrop {
  private t = 0;
  private intensity = 0;
  private peak = 0;  // 最高潮 0..1
  private poles: Pole[] = [];
  private fish: Fish[] = [];
  private fog = 0;   // ミスの曇り／揺れ
  private fin = 0;
  private readonly horizon = VIRTUAL_H - 36;

  constructor() {
    for (let i = 0; i < 6; i++) this.poles.push({ x: (i * VIRTUAL_W) / 6 });
    for (let i = 0; i < 10; i++) this.fish.push(this.newFish());
  }

  private newFish(): Fish {
    return {
      x: Math.random() * VIRTUAL_W,
      y: 30 + Math.random() * (this.horizon - 44),
      vx: 8 + Math.random() * 14,
      phase: Math.random() * 6,
      jelly: Math.random() < 0.4,
    };
  }

  gust(): void {
    this.fog = 1;
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
    if (this.fog > 0) this.fog = Math.max(0, this.fog - dt * 0.9);
    // 締めで汽車が加速＝スクロールが速まる
    const speed = 40 * (1 + this.intensity * 0.6) * (this.fin > 0 ? 1 + this.fin * 1.5 : 1);
    for (const pl of this.poles) {
      pl.x -= speed * dt;
      if (pl.x < -6) pl.x += VIRTUAL_W + 6;
    }
    for (const f of this.fish) {
      f.x += f.vx * dt;
      f.phase += dt * 2;
      if (f.x > VIRTUAL_W + 8) Object.assign(f, this.newFish(), { x: -8 });
    }
  }

  draw(g: CanvasRenderingContext2D): void {
    const p = AQUA;
    const finK = this.fin > 0 ? Math.min(1, this.fin / 2.8) : 0;
    const bright = 1 + this.intensity * 0.4;

    // 水底の闇
    g.fillStyle = shade(p, 0);
    g.fillRect(0, 0, VIRTUAL_W, VIRTUAL_H);

    // 水の caustics（光の網）
    g.fillStyle = shade(p, 1);
    for (let y = 6; y < this.horizon; y += 4) {
      const off = Math.sin(this.t * 0.8 + y * 0.15) * 6;
      for (let x = 0; x < VIRTUAL_W; x += 8) {
        g.fillRect(Math.round(x + off + ((y * 3) % 8)), y, 2, 1);
      }
    }

    // 玲瓏レンズ（銀河系）— ゆっくり回りグリント
    this.drawLens(g, Math.round(VIRTUAL_W * 0.5), Math.round(this.horizon * 0.42), 22, bright);

    // 巨きな水素のりんご（遠く・赤・脈打つ）
    const appleR = 10 + Math.round((Math.sin(this.t * 1.5) + 1) * 1.5) + Math.round(this.peak * 12) + Math.round(finK * 40);
    const ax = Math.round(VIRTUAL_W * 0.78);
    const ay = Math.round(this.horizon * 0.35);
    g.globalAlpha = 0.4 + this.intensity * 0.3 + finK * 0.3;
    this.disc(g, ax, ay, appleR, "#ff6a5a");
    g.globalAlpha = 1;
    g.fillStyle = "#ff6a5a";
    g.fillRect(ax, ay - appleR - 1, 1, 2); // 軸

    // 電信柱（横に流れ去る）
    g.fillStyle = shade(p, 1);
    for (const pl of this.poles) {
      const x = Math.round(pl.x);
      g.fillRect(x, this.horizon - 20, 1, 20);
      g.fillRect(x - 3, this.horizon - 18, 7, 1);
      g.fillRect(x - 2, this.horizon - 15, 5, 1);
    }

    // 発光する魚・くらげ
    for (const f of this.fish) {
      const bob = Math.round(Math.sin(f.phase) * 2);
      g.fillStyle = this.intensity > 0.5 ? "#dff2ee" : shade(p, 3);
      if (f.jelly) {
        g.fillRect(Math.round(f.x), Math.round(f.y) + bob, 3, 1);
        g.fillRect(Math.round(f.x) + 1, Math.round(f.y) - 1 + bob, 1, 1);
        g.fillStyle = shade(p, 2);
        g.fillRect(Math.round(f.x), Math.round(f.y) + 1 + bob, 1, 2);
        g.fillRect(Math.round(f.x) + 2, Math.round(f.y) + 1 + bob, 1, 2);
      } else {
        g.fillRect(Math.round(f.x), Math.round(f.y) + bob, 2, 1);
        g.fillRect(Math.round(f.x) - 1, Math.round(f.y) + bob, 1, 1); // 尾
      }
    }

    // 地面（線路の床）
    g.fillStyle = shade(p, 0);
    g.fillRect(0, this.horizon, VIRTUAL_W, VIRTUAL_H - this.horizon);
    g.fillStyle = shade(p, 1);
    for (let x = (Math.round(this.t * 40) % 12); x < VIRTUAL_W; x += 12) g.fillRect(x, this.horizon + 2, 6, 1);

    // 手前の車窓の枠＋映る人影
    this.drawWindow(g);

    // 最高潮：水族館が銀河の海へ開花。金の光網＋レンズの白閃光。
    if (this.peak > 0.01) {
      const k = this.peak;
      // 金色の光網
      g.globalAlpha = k * 0.28;
      g.fillStyle = "#dff2ee";
      for (let y = 6; y < this.horizon; y += 4) {
        const off = Math.sin(this.t * 1.2 + y * 0.2) * 8;
        for (let x = 0; x < VIRTUAL_W; x += 6) g.fillRect(Math.round(x + off), y, 2, 1);
      }
      g.globalAlpha = 1;
      // レンズの白い十字フレア
      const lx = Math.round(VIRTUAL_W * 0.5);
      const ly = Math.round(this.horizon * 0.42);
      const arm = Math.round(6 + k * 14);
      g.fillStyle = "#ffffff";
      for (let i = 1; i <= arm; i++) {
        g.globalAlpha = k * (1 - i / arm);
        g.fillRect(lx, ly - i, 1, 1);
        g.fillRect(lx, ly + i, 1, 1);
        g.fillRect(lx - i, ly, 1, 1);
        g.fillRect(lx + i, ly, 1, 1);
      }
      g.globalAlpha = 1;
    }

    // 締め：林檎の赤光が満ちる
    if (finK > 0) {
      g.globalAlpha = finK * 0.55;
      g.fillStyle = "#ff6a5a";
      g.fillRect(0, 0, VIRTUAL_W, VIRTUAL_H);
      g.globalAlpha = 1;
    }

    // ミスの曇り・揺れ
    if (this.fog > 0.05) {
      g.globalAlpha = this.fog * 0.4;
      g.fillStyle = shade(p, 3);
      g.fillRect(0, 0, VIRTUAL_W, VIRTUAL_H);
      g.globalAlpha = 1;
    }
  }

  private drawLens(g: CanvasRenderingContext2D, cx: number, cy: number, r: number, bright: number): void {
    const p = AQUA;
    // 回転する楕円レンズ
    const a = this.t * 0.5;
    const rx = Math.abs(Math.cos(a)) * r + 4;
    g.fillStyle = shade(p, 2);
    for (let y = -r; y <= r; y++) {
      const w = Math.floor((rx / r) * Math.sqrt(Math.max(0, r * r - y * y)));
      g.globalAlpha = 0.5;
      g.fillRect(cx - w, cy + y, w * 2, 1);
    }
    g.globalAlpha = 1;
    // 芯（コンボで焦点を結ぶ）
    g.fillStyle = bright > 1.2 ? "#dff2ee" : shade(p, 3);
    g.fillRect(cx - 1, cy, 3, 1);
    g.fillRect(cx, cy - 1, 1, 3);
    // グリント
    if ((Math.sin(this.t * 2) + 1) / 2 > 0.7) {
      g.fillStyle = "#ffffff";
      g.fillRect(cx + Math.round(rx * 0.6), cy, 1, 1);
    }
  }

  private drawWindow(g: CanvasRenderingContext2D): void {
    const p = AQUA;
    g.fillStyle = shade(p, 0);
    g.fillRect(0, 0, 6, VIRTUAL_H);
    g.fillRect(VIRTUAL_W - 6, 0, 6, VIRTUAL_H);
    g.fillRect(0, 0, VIRTUAL_W, 4);
    // 窓の桟
    g.fillStyle = shade(p, 1);
    g.fillRect(VIRTUAL_W / 2 - 1, 4, 2, this.horizon - 4);
    // 映る人影（かすかに）
    g.globalAlpha = 0.14 + (this.intensity + (this.fin > 0 ? 0.2 : 0)) * 0.1;
    g.fillStyle = shade(p, 3);
    const wx = Math.round(VIRTUAL_W * 0.28);
    const wy = this.horizon - 30;
    g.fillRect(wx, wy, 6, 6); // 頭
    g.fillRect(wx - 2, wy + 7, 10, 12); // 肩
    g.globalAlpha = 1;
  }

  private disc(g: CanvasRenderingContext2D, cx: number, cy: number, r: number, color: string): void {
    g.fillStyle = color;
    for (let y = -r; y <= r; y++) {
      const w = Math.floor(Math.sqrt(Math.max(0, r * r - y * y)));
      g.fillRect(cx - w, cy + y, w * 2, 1);
    }
  }
}
