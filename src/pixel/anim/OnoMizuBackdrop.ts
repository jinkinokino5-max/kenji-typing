import { VIRTUAL_W, VIRTUAL_H } from "../../core/Renderer";
import { ONO_MIZU_P, shade } from "../../core/Palette";
import type { ThemeBackdrop } from "../theme/SceneTheme";

// 特別編『水とひかりの声』— 谷川の底から水面を見上げている。
//
// クラムボンの章なので、視点を水の中に置く。画面上端が水面で、
// そこを通った光が網目になって水底の砂へ落ちる（コースティクス）。
//
//   打鍵 water … 蟹の子供がつぶつぶと泡を吐く（「かぷかぷ」「ぽつぽつぽつ」）
//   打鍵 light … 水面の光の網が強まり、月光の虹が「もかもか」集まる
//   打鍵 wind  … 流れが速まり、水底の砂がふっと舞い上がる
//   ミス       … かわせみの影が横切り、水底が翳る
//   最高潮     … 泡が絶えず湧き、光の網が波立つ
//   締め       … やまなしが落ちてきて、ぽかぽか流れていく

interface Bubble {
  x: number;
  y: number;
  vy: number;
  wob: number;
  size: number;
}

interface Sand {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
}

export class OnoMizuBackdrop implements ThemeBackdrop {
  private t = 0;
  private intensity = 0;
  private peak = 0;
  private glow = 0; // 月光の虹「もかもか」
  private shadow = 0; // かわせみの影 0..1（1で画面外、進むほど横切る）
  private fin = 0;
  private readonly surface = 16;
  // 蟹は水底の砂の上に立つ。下部バーと「Esc … ひとやすみ」の案内に重ならない高さに置く。
  private readonly floor = VIRTUAL_H - 46;

  private bubbles: Bubble[] = [];
  private sands: Sand[] = [];
  /** 蟹の子供ら。水底に二疋ならぶ。 */
  private readonly crabs = [
    { x: Math.round(VIRTUAL_W * 0.34), phase: 0 },
    { x: Math.round(VIRTUAL_W * 0.62), phase: Math.PI },
  ];

  gust(): void {
    this.shadow = 0.0001;
  }

  pulse(kind = "water"): void {
    if (kind === "light") {
      this.glow = Math.min(1, this.glow + 0.7);
      return;
    }
    if (kind === "wind") {
      for (let i = 0; i < 10; i++) {
        this.sands.push({
          x: Math.random() * VIRTUAL_W,
          y: this.floor - Math.random() * 3,
          vx: 18 + Math.random() * 22,
          vy: -(6 + Math.random() * 14),
          life: 1,
        });
      }
      return;
    }
    // water：蟹が泡を吐く
    const c = this.crabs[Math.floor(Math.random() * this.crabs.length)];
    for (let i = 0; i < 4; i++) {
      this.bubbles.push({
        x: c.x + (Math.random() * 6 - 3),
        y: this.floor - 4 - i,
        vy: 16 + Math.random() * 14,
        wob: Math.random() * Math.PI * 2,
        size: Math.random() < 0.3 ? 2 : 1,
      });
    }
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

    this.glow = Math.max(0, this.glow - dt * 1.4);
    if (this.shadow > 0) {
      this.shadow += dt * 0.9;
      if (this.shadow > 1.4) this.shadow = 0;
    }
    if (this.peak > 0.05 && Math.random() < this.peak * dt * 10) this.pulse("water");

    for (const b of this.bubbles) {
      b.y -= b.vy * dt;
      b.wob += dt * 3.4;
    }
    this.bubbles = this.bubbles.filter((b) => b.y > this.surface - 2);

    for (const s of this.sands) {
      s.x += s.vx * dt;
      s.y += s.vy * dt;
      s.vy += 22 * dt;
      s.life -= dt * 0.9;
    }
    this.sands = this.sands.filter((s) => s.life > 0);
  }

  draw(g: CanvasRenderingContext2D): void {
    const p = ONO_MIZU_P;
    const finK = this.fin > 0 ? Math.min(1, this.fin / 2.8) : 0;
    // 谷川の流れ。コンボが上がるほど水面も光の網も速く動く。
    const flow = this.t * (1 + this.intensity * 0.7);

    // 水の中。上ほど明るく、下ほど暗い（ディザで4段に割る）
    g.fillStyle = shade(p, 0);
    g.fillRect(0, 0, VIRTUAL_W, VIRTUAL_H);
    g.fillStyle = shade(p, 1);
    for (let y = this.surface; y < this.floor; y += 2) {
      const depth = (y - this.surface) / (this.floor - this.surface);
      const step = depth < 0.3 ? 2 : depth < 0.6 ? 4 : 8;
      for (let x = (y % step); x < VIRTUAL_W; x += step) g.fillRect(x, y, 1, 1);
    }

    // 水面。波打つ帯として画面上端に置く。
    for (let x = 0; x < VIRTUAL_W; x++) {
      const w = Math.sin(x * 0.14 + flow * 1.6) * 2 + Math.sin(x * 0.05 - flow * 0.9) * 1.5;
      const y = Math.round(this.surface + w);
      g.fillStyle = shade(p, 2);
      g.fillRect(x, 0, 1, y);
      g.fillStyle = shade(p, 3);
      g.fillRect(x, y, 1, 1);
    }

    // 水面を通った光の網（コースティクス）。水底の砂の上でゆれる。
    const netStrength = 0.35 + this.glow * 0.5 + this.peak * 0.25;
    g.globalAlpha = Math.min(1, netStrength);
    g.fillStyle = shade(p, 2);
    for (let x = 0; x < VIRTUAL_W; x += 2) {
      const v = Math.sin(x * 0.22 + flow * 1.3) + Math.sin(x * 0.077 - flow * 0.8);
      if (v < 1.15) continue;
      for (let y = this.surface + 6; y < this.floor; y += 3) {
        const dx = Math.round(Math.sin(y * 0.12 + flow) * 2);
        g.fillRect(x + dx, y, 1, 2);
      }
    }
    g.globalAlpha = 1;

    // 月光の虹（もかもか集まる淡い弧）
    if (this.glow > 0.02) {
      g.globalAlpha = this.glow * 0.5;
      g.fillStyle = shade(p, 3);
      const cx = VIRTUAL_W / 2;
      const cy = this.surface + 6;
      for (let r = 22; r < 30; r += 3) {
        for (let a = Math.PI * 0.15; a < Math.PI * 0.85; a += 0.06) {
          g.fillRect(Math.round(cx - Math.cos(a) * r), Math.round(cy + Math.sin(a) * r * 0.7), 1, 1);
        }
      }
      g.globalAlpha = 1;
    }

    // 舞い上がる砂
    for (const s of this.sands) {
      g.fillStyle = shade(p, 1);
      g.fillRect(Math.round(s.x), Math.round(s.y), 1, 1);
    }

    // 泡（ゆらぎながらのぼる）
    for (const b of this.bubbles) {
      g.fillStyle = shade(p, 3);
      const x = Math.round(b.x + Math.sin(b.wob) * 2);
      g.fillRect(x, Math.round(b.y), b.size, b.size);
    }

    // 締め：やまなしが落ちてきて、ぽかぽか流れる
    if (finK > 0) {
      const yy = this.surface + finK * (this.floor - this.surface - 14);
      const xx = VIRTUAL_W * 0.5 + Math.sin(this.fin * 1.6) * 22;
      g.fillStyle = "#ffe9a0";
      this.disc(g, Math.round(xx), Math.round(yy), 4, "#ffe9a0");
      g.fillStyle = shade(p, 1);
      g.fillRect(Math.round(xx), Math.round(yy) - 6, 1, 3); // 軸
      g.globalAlpha = finK * 0.16;
      g.fillStyle = "#ffe9a0";
      g.fillRect(0, 0, VIRTUAL_W, VIRTUAL_H);
      g.globalAlpha = 1;
    }

    // 水底の砂
    g.fillStyle = shade(p, 1);
    g.fillRect(0, this.floor, VIRTUAL_W, VIRTUAL_H - this.floor);
    g.fillStyle = shade(p, 2);
    for (let x = 0; x < VIRTUAL_W; x += 7) {
      g.fillRect(x + ((x * 7) % 3), this.floor + 3 + ((x * 5) % 6), 2, 1); // 小石
    }

    // 蟹の子供ら（横に少しずつ動き、はさみを開閉する）
    for (const c of this.crabs) {
      const bx = c.x + Math.round(Math.sin(this.t * 0.7 + c.phase) * 5);
      const by = this.floor - 3;
      const open = Math.sin(this.t * 6 + c.phase) > 0 ? 1 : 0;
      g.fillStyle = shade(p, 3); // 輪郭。砂と同じ階調だと沈んで見えない
      g.fillRect(bx - 4, by - 1, 9, 5);
      g.fillStyle = shade(p, 1);
      g.fillRect(bx - 3, by, 7, 3); // 甲羅
      g.fillStyle = shade(p, 3);
      g.fillRect(bx - 6, by - open, 2, 2); // 左はさみ
      g.fillRect(bx + 5, by - open, 2, 2); // 右はさみ
      g.fillRect(bx - 3, by + 4, 1, 2); // 脚
      g.fillRect(bx + 3, by + 4, 1, 2);
      g.fillStyle = shade(p, 0);
      g.fillRect(bx - 2, by + 1, 1, 1);
      g.fillRect(bx + 2, by + 1, 1, 1); // 目
    }

    // ミス：かわせみの影が横切り、水底が翳る
    if (this.shadow > 0) {
      const k = Math.min(1, this.shadow / 1.4);
      const x = -30 + k * (VIRTUAL_W + 60);
      g.globalAlpha = 0.5;
      g.fillStyle = "#000000";
      g.fillRect(Math.round(x) - 14, this.surface + 8, 30, 5);
      g.fillRect(Math.round(x) - 4, this.surface + 6, 8, 9);
      g.globalAlpha = 0.28 * Math.sin(k * Math.PI);
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
}
