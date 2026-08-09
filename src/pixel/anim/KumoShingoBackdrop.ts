import { VIRTUAL_W, VIRTUAL_H } from "../../core/Renderer";
import { SHINGO_P, shade } from "../../core/Palette";
import type { ThemeBackdrop } from "../theme/SceneTheme";

// 『雲の信号』春の農の朝。
// 流れる雲、ぼんやりした山なみ、四本杉、地上で農具がぴかぴか光る。
// コンボで信号旗が空高く昇る。打鍵：農具のグリント＋風の筋。
// ミス：空が翳る。最高潮：雲の信号が一斉に掲げられ空が金にきらめく。
// 締め：夕暮れ色に移ろい、雁の群れがVの字で四本杉へ降りてくる。

interface Cloud { x: number; y: number; w: number; v: number; }
interface Glint { x: number; y: number; life: number; }
interface Streak { x: number; y: number; vx: number; life: number; }
interface Goose { ox: number; oy: number; } // 群れの隊形オフセット

export class KumoShingoBackdrop implements ThemeBackdrop {
  private t = 0;
  private intensity = 0;
  private peak = 0;
  private clouds: Cloud[] = [];
  private glints: Glint[] = [];
  private streaks: Streak[] = [];
  private geese: Goose[] = [];
  private dim = 0;
  private fin = 0;
  private readonly horizon = VIRTUAL_H - 52;

  constructor() {
    for (let i = 0; i < 7; i++) {
      this.clouds.push({
        x: Math.random() * VIRTUAL_W,
        y: 14 + Math.random() * (this.horizon - 70),
        w: 18 + Math.random() * 26,
        v: 6 + Math.random() * 8,
      });
    }
    // 雁のVの字隊形
    for (let i = 0; i < 9; i++) {
      const k = Math.ceil(i / 2);
      this.geese.push({ ox: (i % 2 === 0 ? 1 : -1) * k * 7, oy: k * 4 });
    }
  }

  gust(): void {
    this.dim = 1;
  }

  // 打鍵：農具がぴかっと光り、風の筋が走る。
  pulse(): void {
    this.glints.push({
      x: 30 + Math.random() * (VIRTUAL_W - 60),
      y: this.horizon + 6 + Math.random() * 24,
      life: 1,
    });
    if (Math.random() < 0.5) {
      this.streaks.push({
        x: -8,
        y: 30 + Math.random() * (this.horizon - 50),
        vx: 150 + Math.random() * 70,
        life: 1,
      });
    }
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

    for (const c of this.clouds) {
      c.x += c.v * (1 + this.intensity * 0.5) * dt;
      if (c.x - c.w > VIRTUAL_W) {
        c.x = -c.w;
        c.y = 14 + Math.random() * (this.horizon - 70);
      }
    }
    for (const s of this.glints) s.life -= dt * 2.4;
    this.glints = this.glints.filter((s) => s.life > 0);
    for (const s of this.streaks) { s.x += s.vx * dt; s.life -= dt * 1.4; }
    this.streaks = this.streaks.filter((s) => s.life > 0);
  }

  draw(g: CanvasRenderingContext2D): void {
    const p = SHINGO_P;
    const finK = this.fin > 0 ? Math.min(1, this.fin / 2.8) : 0;

    // 春空（ディザグラデ：上ほど濃い青）
    g.fillStyle = shade(p, 2);
    g.fillRect(0, 0, VIRTUAL_W, this.horizon);
    g.fillStyle = shade(p, 1);
    for (let y = 0; y < this.horizon; y += 2) {
      const k = 1 - y / this.horizon;
      if ((Math.sin(y * 2.3) + 1) / 2 < k * 0.85) {
        for (let x = y % 4; x < VIRTUAL_W; x += 4) g.fillRect(x, y, 2, 1);
      }
    }

    // 雲（横に流れる）
    for (const c of this.clouds) {
      g.fillStyle = shade(p, 3);
      const x = Math.round(c.x);
      const y = Math.round(c.y);
      g.fillRect(x, y, Math.round(c.w), 3);
      g.fillRect(x + 3, y - 2, Math.round(c.w * 0.6), 2);
      g.fillStyle = shade(p, 2);
      g.fillRect(x + 1, y + 3, Math.round(c.w * 0.8), 1);
    }

    // ぼんやりした山なみ
    g.fillStyle = shade(p, 1);
    for (let x = 0; x < VIRTUAL_W; x++) {
      const h = 14 + Math.round(Math.sin(x * 0.02) * 7 + Math.sin(x * 0.007 + 2) * 5);
      g.globalAlpha = 0.6;
      g.fillRect(x, this.horizon - h, 1, h);
    }
    g.globalAlpha = 1;

    // 地面（畑）
    g.fillStyle = shade(p, 1);
    g.fillRect(0, this.horizon, VIRTUAL_W, VIRTUAL_H - this.horizon);
    g.fillStyle = shade(p, 0);
    for (let y = this.horizon + 4; y < VIRTUAL_H; y += 6) {
      for (let x = (y * 2) % 6; x < VIRTUAL_W; x += 6) g.fillRect(x, y, 3, 1);
    }

    // 四本杉（右手前）
    for (let i = 0; i < 4; i++) {
      this.drawCedar(g, VIRTUAL_W - 92 + i * 18, this.horizon, 26 + (i % 2) * 4);
    }

    // 農具のグリント（打鍵）
    for (const s of this.glints) {
      const r = Math.round((1 - s.life) * 4) + 1;
      g.fillStyle = s.life > 0.5 ? "#ffd870" : shade(p, 3);
      g.fillRect(Math.round(s.x) - r, Math.round(s.y), r * 2 + 1, 1);
      g.fillRect(Math.round(s.x), Math.round(s.y) - r, 1, r * 2 + 1);
    }

    // 風の筋
    for (const s of this.streaks) {
      g.fillStyle = s.life > 0.5 ? shade(p, 3) : shade(p, 2);
      g.fillRect(Math.round(s.x), Math.round(s.y), 8 + Math.round(s.life * 6), 1);
    }

    // 信号旗（コンボで昇る／最高潮で一斉掲揚）
    this.drawSignal(g, 96, finK);
    if (this.peak > 0.3) {
      this.drawSignal(g, 170, finK, this.peak);
      this.drawSignal(g, 260, finK, this.peak);
    }

    // 最高潮：空が金にきらめく
    if (this.peak > 0.01) {
      const k = this.peak;
      g.fillStyle = "#ffd870";
      for (let i = 0; i < 40; i++) {
        const x = Math.round((Math.sin(i * 12.9898) * 0.5 + 0.5) * VIRTUAL_W);
        const y = Math.round((Math.sin(i * 78.233) * 0.5 + 0.5) * this.horizon);
        const tw = (Math.sin(this.t * 6 + i) + 1) / 2;
        if (tw > 0.5) {
          g.globalAlpha = k * tw * 0.8;
          g.fillRect(x, y, 1, 1);
        }
      }
      g.globalAlpha = k * 0.15;
      g.fillRect(0, 0, VIRTUAL_W, this.horizon);
      g.globalAlpha = 1;
    }

    // 締め：夕暮れ＋雁の群れが四本杉へ降りる
    if (finK > 0) {
      g.globalAlpha = finK * 0.35;
      g.fillStyle = "#f4a860";
      g.fillRect(0, 0, VIRTUAL_W, VIRTUAL_H);
      g.globalAlpha = 1;
      // Vの字の雁：左上から四本杉の上へ
      const gx = 40 + finK * (VIRTUAL_W - 130);
      const gy = 30 + finK * (this.horizon - 70);
      g.fillStyle = shade(p, 0);
      for (const goose of this.geese) {
        const flap = Math.sin(this.t * 10 + goose.ox) > 0 ? -1 : 0;
        g.fillRect(Math.round(gx + goose.ox), Math.round(gy + goose.oy + flap), 2, 1);
      }
    }

    // ミスの翳り
    if (this.dim > 0.05) {
      g.globalAlpha = this.dim * 0.4;
      g.fillStyle = shade(p, 0);
      g.fillRect(0, 0, VIRTUAL_W, VIRTUAL_H);
      g.globalAlpha = 1;
    }
  }

  private drawCedar(g: CanvasRenderingContext2D, x: number, base: number, h: number): void {
    const p = SHINGO_P;
    g.fillStyle = shade(p, 0);
    g.fillRect(x, base - h, 1, h);
    for (let i = 0; i < h - 6; i += 2) {
      const w = Math.round(((h - 6 - i) / (h - 6)) * 5) + 1;
      g.fillRect(x - w, base - 6 - i, w * 2 + 1, 1);
    }
  }

  // 信号ポールと雲の旗。progress は intensity（メインポール）または peak。
  private drawSignal(g: CanvasRenderingContext2D, x: number, finK: number, forced?: number): void {
    const p = SHINGO_P;
    const lift = Math.min(1, forced ?? (this.intensity + finK));
    const top = 34;
    const base = this.horizon;
    const flagY = Math.round(base - 12 - lift * (base - top - 16));
    // ポール
    g.fillStyle = shade(p, 0);
    g.fillRect(x, top, 1, base - top);
    g.fillRect(x - 2, top - 2, 5, 1); // 横木
    // 雲でできた旗（はためく）
    const wave = Math.sin(this.t * 5 + x) * 2;
    g.fillStyle = shade(p, 3);
    g.fillRect(x + 2, flagY, 10, 4);
    g.fillRect(x + 12, flagY + 1 + Math.round(wave * 0.5), 4, 2);
    g.fillStyle = this.peak > 0.3 ? "#ffd870" : shade(p, 2);
    g.fillRect(x + 2, flagY + 4, 8, 1);
  }
}
