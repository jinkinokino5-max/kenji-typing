import { VIRTUAL_W, VIRTUAL_H } from "../../core/Renderer";
import { MENITE_P, shade } from "../../core/Palette";
import type { ThemeBackdrop } from "../theme/SceneTheme";

// 『眼にて云ふ』病床から見上げる青ぞら。
// 画面下辺は病室の暗がり（窓枠の視点）。上にもりあがって湧く雲、
// 右から左へ流れる透明な風の筋、窓辺に揺れる秋草。
// 打鍵：風の筋。ミス：下から暗赤の翳り（血）。
// 最高潮：青ぞらが湧き立ち風と光が満ちる。締め：視界が空へ昇り白へ。

interface Puff { x: number; y: number; r: number; v: number; }
interface Wind { x: number; y: number; vx: number; life: number; amp: number; }
interface Mote { x: number; y: number; vy: number; life: number; }

export class MeniteBackdrop implements ThemeBackdrop {
  private t = 0;
  private intensity = 0;
  private peak = 0;
  private puffs: Puff[] = [];
  private winds: Wind[] = [];
  private motes: Mote[] = [];
  private blood = 0; // ミスの暗赤
  private fin = 0;
  private readonly sill = VIRTUAL_H - 44; // 窓枠（病床の暗がり）の上端

  constructor() {
    for (let i = 0; i < 6; i++) {
      this.puffs.push({
        x: Math.random() * VIRTUAL_W,
        y: this.sill - 10 - Math.random() * 40,
        r: 8 + Math.random() * 12,
        v: 3 + Math.random() * 4,
      });
    }
  }

  gust(): void {
    this.blood = 1;
  }

  // 打鍵：透明な風の筋が流れる。
  pulse(): void {
    this.winds.push({
      x: VIRTUAL_W + 8,
      y: 16 + Math.random() * (this.sill - 40),
      vx: -(90 + Math.random() * 60),
      life: 1,
      amp: 1 + Math.random() * 2,
    });
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
    if (this.blood > 0) this.blood = Math.max(0, this.blood - dt * 0.9);

    // 雲は下から湧きあがる（コンボ・最高潮で速く）
    const rise = 1 + this.intensity + this.peak * 2 + (this.fin > 0 ? 3 : 0);
    for (const c of this.puffs) {
      c.y -= c.v * rise * 0.4 * dt;
      c.x += Math.sin(this.t * 0.4 + c.r) * 2 * dt;
      if (c.y < -c.r) {
        c.y = this.sill + c.r;
        c.x = Math.random() * VIRTUAL_W;
        c.r = 8 + Math.random() * 12;
      }
    }
    for (const w of this.winds) { w.x += w.vx * dt; w.life -= dt * 1.1; }
    this.winds = this.winds.filter((w) => w.life > 0);

    // 最高潮・締め：光の粒が立ちのぼる
    const rate = this.peak * 14 + (this.fin > 0 ? 10 : 0);
    if (rate > 0 && Math.random() < rate * dt) {
      this.motes.push({
        x: Math.random() * VIRTUAL_W,
        y: this.sill,
        vy: -(20 + Math.random() * 26),
        life: 1,
      });
    }
    for (const m of this.motes) { m.y += m.vy * dt; m.life -= dt * 0.9; }
    this.motes = this.motes.filter((m) => m.life > 0);
  }

  draw(g: CanvasRenderingContext2D): void {
    const p = MENITE_P;
    const finK = this.fin > 0 ? Math.min(1, this.fin / 2.8) : 0;

    // 青ぞら（上ほど深い青のディザグラデ）
    g.fillStyle = shade(p, 2);
    g.fillRect(0, 0, VIRTUAL_W, this.sill);
    g.fillStyle = shade(p, 1);
    for (let y = 0; y < this.sill; y += 2) {
      const k = 1 - y / this.sill;
      if ((Math.sin(y * 1.9) + 1) / 2 < k * 0.9) {
        for (let x = y % 4; x < VIRTUAL_W; x += 4) g.fillRect(x, y, 2, 1);
      }
    }

    // もりあがって湧く雲
    for (const c of this.puffs) {
      this.puffCloud(g, Math.round(c.x), Math.round(c.y), Math.round(c.r));
    }

    // 透明な風の筋（波打ちながら左へ）
    for (const w of this.winds) {
      g.fillStyle = w.life > 0.5 ? shade(p, 3) : shade(p, 2);
      g.globalAlpha = 0.7;
      for (let i = 0; i < 14; i += 2) {
        const yy = w.y + Math.sin((w.x + i * 4) * 0.06 + this.t * 4) * w.amp;
        g.fillRect(Math.round(w.x + i * 4), Math.round(yy), 3, 1);
      }
      g.globalAlpha = 1;
    }

    // 光の粒
    for (const m of this.motes) {
      g.fillStyle = m.life > 0.5 ? "#ffffff" : shade(p, 3);
      g.fillRect(Math.round(m.x), Math.round(m.y), 1, 1);
    }

    // 窓辺の秋草（下辺・波のやうに揺れる）
    g.fillStyle = shade(p, 1);
    for (let x = 4; x < VIRTUAL_W; x += 5) {
      const h = 6 + Math.round(Math.sin(x * 0.8) * 2);
      const sway = Math.sin(this.t * 2.2 + x * 0.1) * (1.5 + this.intensity);
      for (let i = 0; i < h; i++) {
        g.fillRect(Math.round(x + (i / h) * sway), this.sill - i, 1, 1);
      }
    }

    // 病床の暗がり（窓枠）— 締めでは視界が昇り、枠が下へ退く
    const sillY = this.sill + Math.round(finK * 50);
    g.fillStyle = shade(p, 0);
    g.fillRect(0, sillY, VIRTUAL_W, VIRTUAL_H - sillY);
    g.fillStyle = shade(p, 1);
    g.fillRect(0, sillY, VIRTUAL_W, 2);

    // 最高潮：青ぞらが湧き立ち、白いきらめきが満ちる
    if (this.peak > 0.01) {
      const k = this.peak;
      g.fillStyle = "#ffffff";
      for (let i = 0; i < 30; i++) {
        const x = Math.round((Math.sin(i * 45.7) * 0.5 + 0.5) * VIRTUAL_W);
        const y = Math.round((Math.sin(i * 91.3) * 0.5 + 0.5) * this.sill);
        const tw = (Math.sin(this.t * 7 + i * 2) + 1) / 2;
        if (tw > 0.55) {
          g.globalAlpha = k * tw * 0.9;
          g.fillRect(x, y, 1, 1);
        }
      }
      g.globalAlpha = k * 0.18;
      g.fillStyle = "#bfe8ff";
      g.fillRect(0, 0, VIRTUAL_W, this.sill);
      g.globalAlpha = 1;
    }

    // 締め：すきとほった風ばかりの白
    if (finK > 0) {
      g.globalAlpha = Math.max(0, finK - 0.15) * 0.75;
      g.fillStyle = "#ffffff";
      g.fillRect(0, 0, VIRTUAL_W, VIRTUAL_H);
      g.globalAlpha = 1;
    }

    // ミス：下から暗赤の翳りが上がる
    if (this.blood > 0.05) {
      const h = Math.round(this.blood * 60);
      g.globalAlpha = this.blood * 0.4;
      g.fillStyle = "#5a1a20";
      g.fillRect(0, VIRTUAL_H - h, VIRTUAL_W, h);
      g.globalAlpha = 1;
    }
  }

  // むくむくと湧く積雲（円の重なり）。
  private puffCloud(g: CanvasRenderingContext2D, cx: number, cy: number, r: number): void {
    const p = MENITE_P;
    g.fillStyle = shade(p, 3);
    this.disc(g, cx, cy, r);
    this.disc(g, cx - Math.round(r * 0.7), cy + 2, Math.round(r * 0.6));
    this.disc(g, cx + Math.round(r * 0.7), cy + 2, Math.round(r * 0.7));
    g.fillStyle = shade(p, 2);
    g.fillRect(cx - r, cy + Math.round(r * 0.5), r * 2, 1);
  }

  private disc(g: CanvasRenderingContext2D, cx: number, cy: number, r: number): void {
    for (let y = -r; y <= r; y++) {
      const w = Math.floor(Math.sqrt(Math.max(0, r * r - y * y)));
      g.fillRect(cx - w, cy + y, w * 2, 1);
    }
  }
}
