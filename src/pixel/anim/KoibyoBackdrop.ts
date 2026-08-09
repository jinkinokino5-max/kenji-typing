import { VIRTUAL_W, VIRTUAL_H } from "../../core/Renderer";
import { KOIBYO_P, shade } from "../../core/Palette";
import type { ThemeBackdrop } from "../theme/SceneTheme";

// 『恋と病熱』青銅の病室。
// 窓の外にやなぎの枝が揺れ、時折烏が横切る。中央に「透明薔薇の火」が
// 静かに燃え、打鍵ごとに炎の粒が立ちのぼる。
// ミス：火が翳り烏が横切る。最高潮：薔薇の火が開花し部屋が薔薇色に。
// 締め：火がやわらぎ、やなぎの花穂が舞って白く明ける。

interface Ember { x: number; y: number; vx: number; vy: number; life: number; }
interface Petal { x: number; y: number; vx: number; vy: number; life: number; spin: number; }

export class KoibyoBackdrop implements ThemeBackdrop {
  private t = 0;
  private intensity = 0;
  private peak = 0;   // 最高潮 0..1
  private embers: Ember[] = [];
  private petals: Petal[] = [];
  private dim = 0;    // ミスの翳り
  private crowX = -20;   // 横切る烏（<画面外で待機）
  private crowWait = 4;
  private fin = 0;
  private readonly cx = Math.round(VIRTUAL_W * 0.5);
  private readonly cy = Math.round(VIRTUAL_H * 0.52);
  private readonly floor = VIRTUAL_H - 34;

  gust(): void {
    this.dim = 1;
    if (this.crowX < -10) this.crowX = VIRTUAL_W + 10; // 烏が飛び立つ
  }

  // 打鍵：炎の粒がひとつ立ちのぼる。
  pulse(): void {
    this.embers.push({
      x: this.cx + (Math.random() * 14 - 7),
      y: this.cy + 6,
      vx: Math.random() * 8 - 4,
      vy: -(22 + Math.random() * 18),
      life: 1,
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
    if (this.dim > 0) this.dim = Math.max(0, this.dim - dt * 1.1);

    // 烏の横断（ミス時／たまに自発）
    if (this.crowX > -20) {
      this.crowX -= dt * 90;
    } else {
      this.crowWait -= dt;
      if (this.crowWait <= 0) {
        this.crowX = VIRTUAL_W + 10;
        this.crowWait = 7 + Math.random() * 6;
      }
    }

    for (const e of this.embers) {
      e.x += e.vx * dt;
      e.y += e.vy * dt;
      e.vy += 8 * dt;
      e.life -= dt * 1.4;
    }
    this.embers = this.embers.filter((e) => e.life > 0);

    // 最高潮・締め：花弁／花穂が舞う
    const rate = this.peak * 10 + (this.fin > 0 ? 8 : 0);
    if (rate > 0 && Math.random() < rate * dt) {
      const fromFire = this.fin <= 0;
      this.petals.push({
        x: fromFire ? this.cx + (Math.random() * 20 - 10) : Math.random() * VIRTUAL_W,
        y: fromFire ? this.cy : -4,
        vx: Math.random() * 20 - 10,
        vy: fromFire ? -(26 + Math.random() * 16) : 14 + Math.random() * 12,
        life: 1,
        spin: Math.random() * 6,
      });
    }
    for (const p of this.petals) {
      p.x += (p.vx + Math.sin(p.spin + this.t * 3) * 8) * dt;
      p.y += p.vy * dt;
      if (this.fin <= 0) p.vy += 20 * dt; // 火の花弁はやがて落ちる
      p.life -= dt * 0.7;
    }
    this.petals = this.petals.filter((p) => p.life > 0 && p.y < VIRTUAL_H + 4);
  }

  draw(g: CanvasRenderingContext2D): void {
    const p = KOIBYO_P;
    const finK = this.fin > 0 ? Math.min(1, this.fin / 2.8) : 0;

    // 青銅の壁（ディザで上を暗く）
    g.fillStyle = shade(p, 1);
    g.fillRect(0, 0, VIRTUAL_W, VIRTUAL_H);
    g.fillStyle = shade(p, 0);
    for (let y = 0; y < VIRTUAL_H; y += 2) {
      const k = 1 - y / VIRTUAL_H;
      if ((Math.sin(y * 1.7) + 1) / 2 < k * 0.9) {
        for (let x = y % 4; x < VIRTUAL_W; x += 4) g.fillRect(x, y, 2, 1);
      }
    }
    // 床
    g.fillStyle = shade(p, 0);
    g.fillRect(0, this.floor, VIRTUAL_W, VIRTUAL_H - this.floor);
    g.fillStyle = shade(p, 1);
    for (let x = 0; x < VIRTUAL_W; x += 14) g.fillRect(x, this.floor, 1, VIRTUAL_H - this.floor);

    // 窓（左）— 外は薄明、やなぎの枝
    this.drawWindow(g, 46, 46, 74, 96);

    // 烏（右→左へ横切る）
    if (this.crowX > -16 && this.crowX < VIRTUAL_W + 16) {
      const wy = 62 + Math.sin(this.t * 6) * 2;
      const flap = Math.sin(this.t * 14) > 0;
      g.fillStyle = shade(p, 0);
      const x = Math.round(this.crowX);
      g.fillRect(x, Math.round(wy), 4, 1);
      if (flap) {
        g.fillRect(x + 1, Math.round(wy) - 1, 1, 1);
        g.fillRect(x + 2, Math.round(wy) - 1, 1, 1);
      } else {
        g.fillRect(x + 1, Math.round(wy) + 1, 1, 1);
        g.fillRect(x + 2, Math.round(wy) + 1, 1, 1);
      }
    }

    // 透明薔薇の火（中央）
    this.drawRoseFire(g, finK);

    // 炎の粒
    for (const e of this.embers) {
      g.fillStyle = e.life > 0.5 ? "#ff9a8a" : shade(p, 3);
      g.fillRect(Math.round(e.x), Math.round(e.y), 1, 1);
    }

    // 花弁・花穂
    for (const pt of this.petals) {
      g.fillStyle = this.fin > 0 ? shade(p, 3) : "#ff9a8a";
      g.globalAlpha = Math.min(1, pt.life + 0.2);
      g.fillRect(Math.round(pt.x), Math.round(pt.y), 2, 1);
      g.globalAlpha = 1;
    }

    // 最高潮：部屋が薔薇色に染まる
    if (this.peak > 0.01) {
      g.globalAlpha = this.peak * 0.3;
      g.fillStyle = "#ff9a8a";
      g.fillRect(0, 0, VIRTUAL_W, VIRTUAL_H);
      g.globalAlpha = 1;
    }

    // 締め：白く明ける
    if (finK > 0) {
      g.globalAlpha = Math.max(0, finK - 0.2) * 0.7;
      g.fillStyle = "#ffffff";
      g.fillRect(0, 0, VIRTUAL_W, VIRTUAL_H);
      g.globalAlpha = 1;
    }

    // ミスの翳り
    if (this.dim > 0.05) {
      g.globalAlpha = this.dim * 0.45;
      g.fillStyle = shade(p, 0);
      g.fillRect(0, 0, VIRTUAL_W, VIRTUAL_H);
      g.globalAlpha = 1;
    }
  }

  private drawWindow(g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number): void {
    const p = KOIBYO_P;
    // 外光（薄明）
    g.fillStyle = shade(p, 2);
    g.fillRect(x, y, w, h);
    g.fillStyle = shade(p, 3);
    for (let yy = y; yy < y + h; yy += 2)
      for (let xx = x + (yy % 4); xx < x + w; xx += 4) g.fillRect(xx, yy, 1, 1);
    // やなぎの枝（垂れて揺れる）
    g.fillStyle = shade(p, 1);
    for (let i = 0; i < 4; i++) {
      const bx = x + 10 + i * 16;
      for (let d = 0; d < h - 16; d++) {
        const sway = Math.sin(this.t * 1.5 + i + d * 0.12) * (1 + d * 0.05);
        g.fillRect(Math.round(bx + sway), y + 4 + d, 1, 1);
      }
    }
    // 窓枠
    g.fillStyle = shade(p, 0);
    g.fillRect(x - 2, y - 2, w + 4, 2);
    g.fillRect(x - 2, y + h, w + 4, 2);
    g.fillRect(x - 2, y, 2, h);
    g.fillRect(x + w, y, 2, h);
    g.fillRect(x + Math.floor(w / 2), y, 1, h);
    g.fillRect(x, y + Math.floor(h / 2), w, 1);
  }

  // 薔薇のかたちに揺らめく透明な火。
  private drawRoseFire(g: CanvasRenderingContext2D, finK: number): void {
    const p = KOIBYO_P;
    const flick = (Math.sin(this.t * 7) + Math.sin(this.t * 11)) * 0.25 + 0.5;
    const size = 10 + this.intensity * 4 + this.peak * 8 - finK * 4;
    // 台座（枕辺の燭台）
    g.fillStyle = shade(p, 0);
    g.fillRect(this.cx - 5, this.cy + 8, 11, 2);
    g.fillRect(this.cx - 1, this.cy + 4, 3, 4);
    // 花弁状の炎（同心の弧を重ねる）
    for (let ring = 3; ring >= 1; ring--) {
      const r = (size * ring) / 3;
      const bright = ring === 1 || this.peak > 0.4;
      g.fillStyle = bright ? "#ff9a8a" : shade(p, ring === 2 ? 3 : 2);
      g.globalAlpha = (0.35 + flick * 0.3) * (ring === 3 ? 0.5 : 1) * (1 - finK * 0.5);
      const step = 1 / (r + 2);
      for (let a = 0; a < Math.PI * 2; a += step) {
        // 薔薇らしい波打つ輪郭
        const wob = 1 + Math.sin(a * 5 + this.t * 3 + ring) * 0.18;
        const px = this.cx + Math.cos(a) * r * wob;
        const py = this.cy + Math.sin(a) * r * wob * 0.85 - ring;
        g.fillRect(Math.round(px), Math.round(py), 1, 1);
      }
      g.globalAlpha = 1;
    }
    // 芯
    g.fillStyle = "#ffffff";
    g.globalAlpha = 0.5 + flick * 0.5;
    g.fillRect(this.cx, this.cy - 1, 1, 3);
    g.globalAlpha = 1;
  }
}
