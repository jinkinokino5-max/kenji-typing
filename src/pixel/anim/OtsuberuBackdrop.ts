import { VIRTUAL_W, VIRTUAL_H } from "../../core/Renderer";
import { PASTURE, shade } from "../../core/Palette";
import type { ThemeBackdrop } from "../theme/SceneTheme";

interface Cloud {
  x: number;
  y: number;
  w: number;
  speed: number;
}
interface Grass {
  x: number;
  h: number;
  phase: number;
}

// 『オツベルと象』月夜の牧草地。
// 大きな満月に雲が流れ、牧草が風で波打ち、白象がのっそり尻尾を振る。
// コンボで月が満ち、草が高く波打つ。ミスで雲が月を隠す。
export class OtsuberuBackdrop implements ThemeBackdrop {
  private clouds: Cloud[] = [];
  private grass: Grass[] = [];
  private t = 0;
  private intensity = 0;
  private peak = 0; // 最高潮 0..1
  private cover = 0; // 月にかかる雲（ミスで増える）
  private readonly moonX = Math.round(VIRTUAL_W * 0.28);
  private readonly moonY = 54;
  private readonly moonR = 18;
  private readonly horizon = VIRTUAL_H - 42;

  constructor() {
    for (let i = 0; i < 4; i++) {
      this.clouds.push({
        x: Math.random() * VIRTUAL_W,
        y: 30 + Math.random() * 44,
        w: 20 + Math.random() * 28,
        speed: 5 + Math.random() * 6,
      });
    }
    for (let x = 2; x < VIRTUAL_W; x += 3 + Math.floor(Math.random() * 3)) {
      this.grass.push({ x, h: 4 + Math.floor(Math.random() * 6), phase: Math.random() * 6 });
    }
  }

  gust(): void {
    this.cover = 1;
  }

  update(dt: number, intensity = 0): void {
    this.t += dt;
    this.intensity = intensity;
    const target = Math.max(0, Math.min(1, (intensity - 0.75) / 0.25));
    this.peak += (target - this.peak) * Math.min(1, dt * (target > this.peak ? 3 : 1.8));
    if (this.cover > 0) this.cover = Math.max(0, this.cover - dt * 0.8);
    for (const c of this.clouds) {
      c.x += c.speed * dt;
      if (c.x - c.w > VIRTUAL_W) {
        c.x = -c.w;
        c.y = 30 + Math.random() * 44;
      }
    }
  }

  private disc(g: CanvasRenderingContext2D, cx: number, cy: number, r: number, color: string): void {
    g.fillStyle = color;
    for (let y = -r; y <= r; y++) {
      const w = Math.floor(Math.sqrt(r * r - y * y));
      g.fillRect(cx - w, cy + y, w * 2, 1);
    }
  }

  draw(g: CanvasRenderingContext2D): void {
    const p = PASTURE;
    // 夜空
    g.fillStyle = shade(p, 0);
    g.fillRect(0, 0, VIRTUAL_W, VIRTUAL_H);

    // 満月（コンボで明るく満ちる）
    const bright = this.intensity > 0.5 || this.cover < 0.3;
    this.disc(g, this.moonX, this.moonY, this.moonR, shade(p, bright ? 3 : 2));
    // 月のアクセント縁
    if (this.intensity > 0.3) {
      this.disc(g, this.moonX, this.moonY, this.moonR, "#f4e08a");
      this.disc(g, this.moonX, this.moonY, this.moonR - 1, shade(p, 3));
    }

    // 星（疎ら）
    g.fillStyle = shade(p, 2);
    for (let i = 0; i < 30; i++) {
      const x = (i * 53 + 11) % VIRTUAL_W;
      const y = (i * 29 + 7) % (this.horizon - 20);
      if ((Math.sin(this.t * 1.5 + i) + 1) / 2 > 0.6) g.fillRect(x, y, 1, 1);
    }

    // 雲（月を横切ると翳る）
    for (const c of this.clouds) {
      g.fillStyle = shade(p, 1);
      g.fillRect(Math.round(c.x), Math.round(c.y), c.w, 3);
      g.fillRect(Math.round(c.x + 4), Math.round(c.y - 2), c.w - 8, 2);
    }
    // ミス時、月に雲が濃くかかる
    if (this.cover > 0.05) {
      g.fillStyle = shade(p, 1);
      g.fillRect(this.moonX - this.moonR, this.moonY - 3, this.moonR * 2, Math.round(this.cover * 8));
    }

    // 納屋と柵のシルエット
    g.fillStyle = shade(p, 1);
    g.fillRect(VIRTUAL_W - 90, this.horizon - 18, 26, 18); // 納屋
    for (let i = 0; i < 6; i++) g.fillRect(VIRTUAL_W - 120 + i * 6, this.horizon - 6, 1, 6); // 柵

    // 牧草地
    g.fillStyle = shade(p, 1);
    g.fillRect(0, this.horizon, VIRTUAL_W, VIRTUAL_H - this.horizon);

    // 最高潮：月が白く炸裂し、地平に仲間の象の群れが現れる。
    if (this.peak > 0.01) this.drawPeak(g);

    // 波打つ牧草（コンボで振幅増）
    const amp = 1 + this.intensity * 2;
    g.fillStyle = shade(p, 2);
    for (const gr of this.grass) {
      const sway = Math.round(Math.sin(this.t * 2 + gr.x * 0.15) * amp);
      for (let i = 0; i < gr.h; i++) {
        const dx = Math.round((i / gr.h) * sway);
        g.fillRect(gr.x + dx, this.horizon - i, 1, 1);
      }
    }

    // 白象（手前でのっそり、尻尾を振る）
    this.drawElephant(g, 60, this.horizon - 2);

    // 手前の地面
    g.fillStyle = shade(p, 0);
    g.fillRect(0, VIRTUAL_H - 6, VIRTUAL_W, 6);
  }

  private drawPeak(g: CanvasRenderingContext2D): void {
    const p = PASTURE;
    const k = this.peak;
    // 月の白い炸裂＋光条
    this.disc(g, this.moonX, this.moonY, this.moonR + Math.round(k * 3), "#ffffff");
    g.globalAlpha = k * 0.4;
    g.fillStyle = "#f4e08a";
    for (let a = 0; a < 12; a++) {
      const ang = (Math.PI * 2 * a) / 12 + this.t * 0.2;
      for (let r = this.moonR + 2; r < this.moonR + 34; r += 2)
        g.fillRect(Math.round(this.moonX + Math.cos(ang) * r), Math.round(this.moonY + Math.sin(ang) * r), 1, 1);
    }
    g.globalAlpha = 1;
    // 地平に仲間の象のシルエット
    g.fillStyle = shade(p, 0);
    const n = Math.round(k * 5);
    for (let i = 0; i < n; i++) {
      const ex = 26 + i * 74 + Math.round(Math.sin(this.t * 1.2 + i) * 2);
      const ey = this.horizon - 2;
      g.fillRect(ex, ey - 6, 14, 6); // 胴
      g.fillRect(ex + 12, ey - 8, 6, 6); // 頭
      g.fillRect(ex + 17, ey - 4, 2, 4); // 鼻
    }
    // 草原が銀色に光る
    g.globalAlpha = k * 0.18;
    g.fillStyle = "#cfe0a8";
    g.fillRect(0, this.horizon, VIRTUAL_W, VIRTUAL_H - this.horizon);
    g.globalAlpha = 1;
  }

  private drawElephant(g: CanvasRenderingContext2D, x: number, y: number): void {
    const white = "#eef2ee";
    g.fillStyle = white;
    // 胴
    g.fillRect(x, y - 8, 16, 8);
    // 頭
    g.fillRect(x + 14, y - 10, 8, 8);
    // 鼻（ゆれる）
    const tr = Math.round(Math.sin(this.t * 2) * 2);
    g.fillRect(x + 21, y - 4 + tr, 2, 4);
    // 脚
    g.fillRect(x + 2, y, 3, 3);
    g.fillRect(x + 11, y, 3, 3);
    // 尻尾（振る）
    const tail = Math.sin(this.t * 4) > 0 ? -1 : 1;
    g.fillRect(x - 2, y - 6 + tail, 2, 1);
    // 目
    g.fillStyle = shade(PASTURE, 0);
    g.fillRect(x + 18, y - 8, 1, 1);
  }
}
