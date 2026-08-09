import { VIRTUAL_W, VIRTUAL_H } from "../../core/Renderer";
import { NEMURAU_P, shade } from "../../core/Palette";
import type { ThemeBackdrop } from "../theme/SceneTheme";

// 『眠らう眠らう』熱の夜とセピヤの記憶。
// 暗い部屋に柱時計（針は四時・振り子が揺れる）。画面に熱のゆらぎ。
// 上方にセピヤ色の記憶（木立と峠道）がコンボで鮮明になる。
// 打鍵：時計の刻みが光る。ミス：熱がぶり返し赤く歪む。
// 最高潮：記憶が大きく開き、初冬の空気がきらめき、石切たちが峠をのぼる。
// 締め：峠道が光に溶け、白く明ける。

interface Tick { life: number; }

export class NemurauBackdrop implements ThemeBackdrop {
  private t = 0;
  private intensity = 0;
  private peak = 0;
  private ticks: Tick[] = [];
  private fever = 0; // ミスの熱
  private fin = 0;
  private readonly clockX = 74;
  private readonly clockY = 96;

  gust(): void {
    this.fever = 1;
  }

  // 打鍵：時計の刻みが光る。
  pulse(): void {
    this.ticks.push({ life: 1 });
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
    if (this.fever > 0) this.fever = Math.max(0, this.fever - dt * 1.0);
    for (const tk of this.ticks) tk.life -= dt * 3;
    this.ticks = this.ticks.filter((tk) => tk.life > 0);
  }

  draw(g: CanvasRenderingContext2D): void {
    const p = NEMURAU_P;
    const finK = this.fin > 0 ? Math.min(1, this.fin / 2.8) : 0;
    // 記憶の窓の開き具合（コンボ→最高潮→締めで全開へ）
    const mem = Math.min(1, this.intensity * 0.6 + this.peak * 0.8 + finK);

    // 暗い部屋
    g.fillStyle = shade(p, 0);
    g.fillRect(0, 0, VIRTUAL_W, VIRTUAL_H);
    // 壁の木目（熱のゆらぎで縦線が波打つ）
    g.fillStyle = shade(p, 1);
    for (let x = 8; x < VIRTUAL_W; x += 22) {
      for (let y = 0; y < VIRTUAL_H; y += 2) {
        const shimmer = Math.sin(y * 0.12 + this.t * (2 + this.fever * 6) + x) * (0.8 + this.fever * 2.5);
        g.fillRect(Math.round(x + shimmer), y, 1, 1);
      }
    }
    // 床
    g.fillStyle = shade(p, 1);
    g.fillRect(0, VIRTUAL_H - 26, VIRTUAL_W, 26);
    g.fillStyle = shade(p, 0);
    for (let x = 0; x < VIRTUAL_W; x += 16) g.fillRect(x, VIRTUAL_H - 26, 1, 26);

    // セピヤの記憶（上方の窓：木立と峠道）
    this.drawMemory(g, mem, finK);

    // 柱時計
    this.drawClock(g);

    // 熱の赤い翳り（ミス）
    if (this.fever > 0.05) {
      g.globalAlpha = this.fever * 0.35;
      g.fillStyle = "#7a2418";
      g.fillRect(0, 0, VIRTUAL_W, VIRTUAL_H);
      g.globalAlpha = 1;
    }

    // 締め：白く明ける
    if (finK > 0) {
      g.globalAlpha = Math.max(0, finK - 0.35) * 0.8;
      g.fillStyle = "#ffffff";
      g.fillRect(0, 0, VIRTUAL_W, VIRTUAL_H);
      g.globalAlpha = 1;
    }
  }

  // 部屋の上方に浮かぶ、セピヤ色の記憶の風景。
  private drawMemory(g: CanvasRenderingContext2D, mem: number, finK: number): void {
    const p = NEMURAU_P;
    if (mem < 0.05) return;
    // 記憶はコンボで広がる（中央上部の楕円窓 → 最高潮でほぼ全面）
    const w = Math.round(120 + mem * (VIRTUAL_W - 140));
    const h = Math.round(50 + mem * 90);
    const cx = Math.round(VIRTUAL_W * 0.58);
    const cy = 64;
    const x0 = cx - Math.round(w / 2);
    const y0 = cy - Math.round(h / 2);

    g.globalAlpha = Math.min(1, 0.25 + mem * 0.75);
    // 記憶の空（明るいセピヤ）
    g.fillStyle = shade(p, 2);
    this.oval(g, cx, cy, w / 2, h / 2);
    g.fillStyle = shade(p, 3);
    for (let y = y0; y < y0 + Math.round(h * 0.5); y += 2) {
      for (let x = x0 + (y % 4); x < x0 + w; x += 4) {
        if (this.inOval(x, y, cx, cy, w / 2, h / 2)) g.fillRect(x, y, 2, 1);
      }
    }
    // 峠道（記憶の底から右上へ）
    g.fillStyle = shade(p, 3);
    for (let i = 0; i < w; i += 2) {
      const rx = x0 + i;
      const ry = y0 + h - 6 - Math.round((i / w) * h * 0.5) + Math.round(Math.sin(i * 0.15) * 1.5);
      if (this.inOval(rx, ry, cx, cy, w / 2, h / 2)) g.fillRect(rx, ry, 2, 1);
    }
    // 木立（セピヤいろの縦影）
    g.fillStyle = shade(p, 1);
    for (let i = 0; i < 8; i++) {
      const tx = x0 + 10 + i * Math.round(w / 8);
      const th = 8 + (i % 3) * 5;
      const ty = y0 + Math.round(h * 0.55);
      if (this.inOval(tx, ty, cx, cy, w / 2, h / 2)) {
        g.fillRect(tx, ty - th, 2, th);
        g.fillRect(tx - 1, ty - th - 2, 4, 3);
      }
    }
    // 最高潮：石切たちの一むれが峠をのぼる＋初冬の空気のきらめき
    if (this.peak > 0.15 || finK > 0.2) {
      const k = Math.max(this.peak, finK);
      const walk = (this.t * 8) % (w * 0.6);
      g.fillStyle = shade(p, 0);
      for (let i = 0; i < 5; i++) {
        const px = x0 + Math.round(w * 0.2) + Math.round(walk) - i * 8;
        const py = y0 + h - 8 - Math.round(((px - x0) / w) * h * 0.5);
        if (px > x0 && this.inOval(px, py, cx, cy, w / 2, h / 2)) {
          const bob = Math.sin(this.t * 6 + i) > 0 ? 0 : -1;
          g.fillRect(px, py - 3 + bob, 1, 3); // 人影
          g.fillRect(px, py - 4 + bob, 1, 1); // 頭
        }
      }
      // きらめく初冬の空気
      g.fillStyle = "#ffffff";
      for (let i = 0; i < 18; i++) {
        const sx = x0 + Math.round((Math.sin(i * 41.3) * 0.5 + 0.5) * w);
        const sy = y0 + Math.round((Math.sin(i * 17.9) * 0.5 + 0.5) * h);
        const tw = (Math.sin(this.t * 7 + i * 2) + 1) / 2;
        if (tw > 0.6 && this.inOval(sx, sy, cx, cy, w / 2, h / 2)) {
          g.globalAlpha = Math.min(1, k * tw);
          g.fillRect(sx, sy, 1, 1);
          g.globalAlpha = Math.min(1, 0.25 + mem * 0.75);
        }
      }
    }
    g.globalAlpha = 1;
  }

  private drawClock(g: CanvasRenderingContext2D): void {
    const p = NEMURAU_P;
    const x = this.clockX;
    const y = this.clockY;
    // 箱
    g.fillStyle = shade(p, 1);
    g.fillRect(x - 12, y - 34, 25, 92);
    g.fillStyle = shade(p, 0);
    g.fillRect(x - 10, y - 32, 21, 88);
    // 文字盤
    g.fillStyle = shade(p, 3);
    this.oval(g, x, y - 16, 9, 9);
    g.fillStyle = shade(p, 0);
    // 針は四時（時針=4時方向、分針=12時方向）
    for (let i = 1; i <= 5; i++) {
      g.fillRect(x + Math.round(i * 0.5), y - 16 + Math.round(i * 0.85), 1, 1); // 時針(4時)
    }
    g.fillRect(x, y - 23, 1, 7); // 分針(12時)
    g.fillRect(x, y - 16, 1, 1); // 軸
    // 振り子（揺れる）
    const swing = Math.sin(this.t * 2.4) * 8;
    const px = x + Math.round(swing);
    g.fillStyle = shade(p, 2);
    for (let i = 0; i < 22; i++) {
      g.fillRect(x + Math.round((swing * i) / 22), y - 4 + i, 1, 1);
    }
    // 錘（打鍵で光る）
    const lit = this.ticks.length > 0;
    g.fillStyle = lit ? "#ffb060" : shade(p, 3);
    g.fillRect(px - 1, y + 18, 3, 3);
    if (lit) {
      g.globalAlpha = this.ticks[this.ticks.length - 1].life * 0.5;
      g.fillRect(px - 2, y + 17, 5, 5);
      g.globalAlpha = 1;
    }
  }

  private oval(g: CanvasRenderingContext2D, cx: number, cy: number, rx: number, ry: number): void {
    for (let y = -ry; y <= ry; y++) {
      const w = Math.floor(rx * Math.sqrt(Math.max(0, 1 - (y * y) / (ry * ry))));
      g.fillRect(Math.round(cx - w), Math.round(cy + y), w * 2, 1);
    }
  }

  private inOval(x: number, y: number, cx: number, cy: number, rx: number, ry: number): boolean {
    const dx = (x - cx) / rx;
    const dy = (y - cy) / ry;
    return dx * dx + dy * dy <= 1;
  }
}
