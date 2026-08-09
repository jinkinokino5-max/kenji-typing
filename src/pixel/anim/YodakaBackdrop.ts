import { VIRTUAL_W, VIRTUAL_H } from "../../core/Renderer";
import { NIGHT, shade } from "../../core/Palette";
import { fillDither } from "../dither";
import { Hills } from "./Hills";
import { drawYodaka, flapFrame } from "./Yodaka";
import type { ThemeBackdrop } from "../theme/SceneTheme";

// 『よだかの星』プレイ画面 専用背景（刷新版）。
// タイトル/ホームの汎用夜空(NightBackdrop)からは独立させ、
// よだか自身を画面の中を大きく飛ぶ主役として描く。
// コンボが伸びるほど高く舞い、ミスで一瞬つんのめり、
// 章クリアでは天頂へのぼって青い星に変わり、星座線が結ばれる。

interface Star {
  x: number;
  y: number;
  phase: number;
  speed: number;
  layer: number; // 0:遠(暗) 1:中 2:近(明)
}

interface Cloud {
  x: number;
  y: number;
  w: number;
  speed: number;
}

export class YodakaBackdrop implements ThemeBackdrop {
  private t = 0;
  private intensity = 0;
  private startle = 0; // ミスの動揺 0..1（一瞬つんのめり、雲が厚くなる）
  private fin = 0; // 締め演出タイマー（>0で進行、2.8秒で満了）
  private stars: Star[] = [];
  private clouds: Cloud[] = [];
  private readonly hills = new Hills();
  private readonly moon = { x: Math.round(VIRTUAL_W * 0.78), y: 42 };

  constructor() {
    for (let i = 0; i < 90; i++) {
      this.stars.push({
        x: Math.random() * VIRTUAL_W,
        y: Math.random() * (VIRTUAL_H - 120),
        phase: Math.random() * Math.PI * 2,
        speed: 0.5 + Math.random() * 1.6,
        layer: Math.floor(Math.random() * 3),
      });
    }
    for (let i = 0; i < 4; i++) {
      this.clouds.push({
        x: Math.random() * VIRTUAL_W,
        y: 58 + Math.random() * 76,
        w: 20 + Math.random() * 26,
        speed: 3 + Math.random() * 3,
      });
    }
  }

  gust(): void {
    this.startle = 1;
    this.hills.gust(1.4);
  }

  finale(): void {
    this.fin = 0.0001;
  }

  update(dt: number, intensity = 0): void {
    this.t += dt;
    this.intensity = intensity;
    if (this.startle > 0) this.startle = Math.max(0, this.startle - dt * 1.2);
    if (this.fin > 0) this.fin += dt;

    for (const s of this.stars) s.phase += s.speed * dt;
    for (const c of this.clouds) {
      c.x -= (c.speed + this.startle * 6) * dt;
      if (c.x < -c.w) c.x = VIRTUAL_W + c.w;
    }
    this.hills.update(dt);
  }

  /** よだかの現在位置。コンボで高く、ミスでつんのめり、締めで天頂へ収束する。 */
  private birdPos(finK: number): { x: number; y: number; frame: number } {
    const baseY = 152 - this.intensity * 55;
    const bob = Math.sin(this.t * 1.3) * 6;
    const dip = this.startle * 18;
    const x = VIRTUAL_W * 0.5 + Math.sin(this.t * 0.35) * VIRTUAL_W * 0.32;
    const y = baseY + bob + dip;
    if (this.fin > 0) {
      const k = Math.min(1, finK / 0.6);
      return {
        x: x + (VIRTUAL_W / 2 - x) * k,
        y: y + (this.moon.y - 2 - y) * k,
        frame: flapFrame(this.t, 10),
      };
    }
    return { x, y, frame: flapFrame(this.t, 6 + this.startle * 6) };
  }

  draw(g: CanvasRenderingContext2D): void {
    const p = NIGHT;
    const finK = Math.min(1, this.fin / 2.8);

    // 空（濃紺の地に、地平寄りをうっすら明るく）
    g.fillStyle = shade(p, 0);
    g.fillRect(0, 0, VIRTUAL_W, VIRTUAL_H);
    const bandTop = VIRTUAL_H - 130;
    for (let y = bandTop; y < VIRTUAL_H - 40; y++) {
      const level = ((y - bandTop) / 90) * 0.55;
      fillDither(g, 0, y, VIRTUAL_W, 1, shade(p, 0), shade(p, 1), level);
    }

    this.drawMoon(g);

    // 星（多層・明滅）
    for (const s of this.stars) {
      const tw = (Math.sin(s.phase) + 1) / 2;
      if (s.layer === 0 && tw < 0.55) continue;
      const idx = Math.min(3, Math.max(1, s.layer + Math.round(tw * 1.4)));
      g.fillStyle = shade(p, idx);
      g.fillRect(Math.round(s.x), Math.round(s.y), 1, 1);
    }

    // 雲（ふだんは薄く流れ、ミスの瞬間だけ厚く翳る）
    g.fillStyle = shade(p, 1);
    for (const c of this.clouds) {
      g.globalAlpha = 0.2 + this.startle * 0.45;
      g.fillRect(Math.round(c.x), Math.round(c.y), c.w, 3);
      g.fillRect(Math.round(c.x + c.w * 0.2), Math.round(c.y - 2), c.w * 0.5, 2);
    }
    g.globalAlpha = 1;

    // コンボが伸びるほど天の川がうっすら浮かぶ
    if (this.intensity > 0.05) {
      for (let y = 26; y < 86; y++) {
        const lvl = this.intensity * 0.22 * (1 - Math.abs(y - 56) / 30);
        if (lvl > 0) fillDither(g, 0, y, VIRTUAL_W, 1, shade(p, 0), shade(p, 2), lvl);
      }
    }

    // 地平の丘と、風になびく野原（手前）
    this.hills.draw(g, p);

    // よだか本体（画面内を大きく飛ぶ主役。締め中は天頂の星へ収束していく）
    if (finK < 0.55) {
      const b = this.birdPos(finK);
      drawYodaka(g, Math.round(b.x), Math.round(b.y), b.frame, p, 3, 3);
    }

    if (this.fin > 0) this.drawFinale(g, finK);

    // ミスの一瞬の翳り
    if (this.startle > 0) {
      g.globalAlpha = this.startle * 0.28;
      g.fillStyle = shade(p, 0);
      g.fillRect(0, 0, VIRTUAL_W, VIRTUAL_H);
      g.globalAlpha = 1;
    }
  }

  private drawMoon(g: CanvasRenderingContext2D): void {
    const p = NIGHT;
    const cx = this.moon.x;
    const cy = this.moon.y;
    // 淡いハロー
    const rHalo = 14;
    g.globalAlpha = 0.3;
    for (let dy = -rHalo; dy <= rHalo; dy++) {
      const w = Math.floor(Math.sqrt(Math.max(0, rHalo * rHalo - dy * dy)));
      g.fillStyle = shade(p, 1);
      g.fillRect(cx - w, cy + dy, w * 2, 1);
    }
    g.globalAlpha = 1;
    // 本体
    const r = 8;
    for (let dy = -r; dy <= r; dy++) {
      const w = Math.floor(Math.sqrt(Math.max(0, r * r - dy * dy)));
      g.fillStyle = shade(p, 3);
      g.fillRect(cx - w, cy + dy, w * 2, 1);
    }
    // クレーター
    g.fillStyle = shade(p, 2);
    g.fillRect(cx - 3, cy - 2, 2, 2);
    g.fillRect(cx + 2, cy + 3, 1, 1);
  }

  private line(
    g: CanvasRenderingContext2D,
    x0: number,
    y0: number,
    x1: number,
    y1: number,
    color: string,
    alpha: number,
  ): void {
    let px = Math.round(x0);
    let py = Math.round(y0);
    const ex = Math.round(x1);
    const ey = Math.round(y1);
    const dx = Math.abs(ex - px);
    const sx = px < ex ? 1 : -1;
    const dy = -Math.abs(ey - py);
    const sy = py < ey ? 1 : -1;
    let err = dx + dy;
    g.fillStyle = color;
    g.globalAlpha = alpha;
    for (;;) {
      g.fillRect(px, py, 1, 1);
      if (px === ex && py === ey) break;
      const e2 = 2 * err;
      if (e2 >= dy) {
        err += dy;
        px += sx;
      }
      if (e2 <= dx) {
        err += dx;
        py += sy;
      }
    }
    g.globalAlpha = 1;
  }

  /** 締め：よだかが天頂で青い星に変わり、周りの星と結ばれて星座になる。 */
  private drawFinale(g: CanvasRenderingContext2D, k: number): void {
    const cx = VIRTUAL_W / 2;
    const cy = this.moon.y - 2;
    if (k < 0.5) return;
    const bloom = Math.min(1, (k - 0.5) / 0.5);
    const tw = (Math.sin(this.t * 8) + 1) / 2;

    // 星座線（先に描いて、星自体を上に重ねる）
    if (bloom > 0.25) {
      const la = Math.min(1, (bloom - 0.25) / 0.5) * 0.7;
      const targets = [
        { x: cx - 62, y: cy + 34 },
        { x: cx + 56, y: cy + 22 },
        { x: cx - 22, y: cy + 62 },
        { x: cx + 32, y: cy + 56 },
      ];
      for (const pt of targets) {
        this.line(g, cx, cy, pt.x, pt.y, "#6f7ea8", la);
        g.globalAlpha = la + 0.2;
        g.fillStyle = "#cdd7f0";
        g.fillRect(Math.round(pt.x), Math.round(pt.y), 1, 1);
        g.globalAlpha = 1;
      }
    }

    // 青い大星（十字のフレア）
    g.fillStyle = tw > 0.4 ? "#ffffff" : "#9fc7ff";
    g.fillRect(cx - 1, cy - 1, 3, 3);
    const arm = Math.round(3 + bloom * 16 + tw * 3);
    g.fillStyle = "#9fc7ff";
    for (let i = 1; i <= arm; i++) {
      g.globalAlpha = bloom * (1 - i / arm);
      g.fillRect(cx, cy - 1 - i, 1, 1);
      g.fillRect(cx, cy + 1 + i, 1, 1);
      g.fillRect(cx - 1 - i, cy, 1, 1);
      g.fillRect(cx + 1 + i, cy, 1, 1);
    }
    g.globalAlpha = 1;

    // 空がわずかに白む
    g.globalAlpha = Math.max(0, bloom - 0.4) * 0.22;
    g.fillStyle = "#ffffff";
    g.fillRect(0, 0, VIRTUAL_W, VIRTUAL_H);
    g.globalAlpha = 1;
  }
}
