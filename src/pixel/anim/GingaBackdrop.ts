import { VIRTUAL_W, VIRTUAL_H } from "../../core/Renderer";
import { GALAXY, shade } from "../../core/Palette";
import { fillDither } from "../dither";
import type { ThemeBackdrop } from "../theme/SceneTheme";

interface Star {
  x: number;
  y: number;
  phase: number;
  speed: number;
  layer: number; // 0:遠(遅) 1:中 2:近(速)
}

interface Landmark {
  x: number;
  kind: number; // 0:電柱 1:三角標 2:停車場の灯り
}

interface Scorpio {
  x: number;
  y: number;
  vx: number;
  life: number;
}

// 『銀河鐵道の夜』銀河を走る夜汽車の車窓。
// 天の川が脈打ち、星と沿線の標が右→左へ流れ、車輪のリズムで画面が微かに上下。
// コンボ強度で流れが増速し、天の川が濃くなる。
export class GingaBackdrop implements ThemeBackdrop {
  private stars: Star[] = [];
  private marks: Landmark[] = [];
  private scorpio: Scorpio[] = [];
  private t = 0;
  private intensity = 0;
  private peak = 0; // 最高潮 0..1
  private nextMark = 0;
  private nextScorpio = 4;
  private jolt = 0; // ミス時のトンネル暗転

  constructor() {
    for (let i = 0; i < 130; i++) {
      this.stars.push({
        x: Math.random() * VIRTUAL_W,
        y: Math.random() * (VIRTUAL_H - 60),
        phase: Math.random() * Math.PI * 2,
        speed: 0.6 + Math.random() * 1.6,
        layer: Math.floor(Math.random() * 3),
      });
    }
  }

  gust(): void {
    this.jolt = 1; // 汽笛とともにトンネルへ入るような暗転
  }

  update(dt: number, intensity = 0): void {
    this.t += dt;
    this.intensity = intensity;
    const target = Math.max(0, Math.min(1, (intensity - 0.75) / 0.25));
    this.peak += (target - this.peak) * Math.min(1, dt * (target > this.peak ? 3 : 1.8));
    if (this.jolt > 0) this.jolt = Math.max(0, this.jolt - dt * 1.5);

    const speed = 18 + intensity * 40; // コンボで増速
    // 星の流れ（レイヤで速度差＝パララックス）
    for (const s of this.stars) {
      s.x -= speed * (0.3 + s.layer * 0.45) * dt;
      s.phase += s.speed * dt;
      if (s.x < 0) {
        s.x += VIRTUAL_W;
        s.y = Math.random() * (VIRTUAL_H - 60);
      }
    }
    // 沿線の標
    this.nextMark -= dt;
    if (this.nextMark <= 0) {
      this.marks.push({ x: VIRTUAL_W + 6, kind: Math.floor(Math.random() * 3) });
      this.nextMark = 0.8 + Math.random() * 1.6;
    }
    for (const m of this.marks) m.x -= (speed + 10) * dt;
    this.marks = this.marks.filter((m) => m.x > -10);

    // さそりの火（稀に赤い尾）
    this.nextScorpio -= dt;
    if (this.nextScorpio <= 0) {
      this.scorpio.push({ x: VIRTUAL_W * 0.7, y: 40 + Math.random() * 40, vx: -40, life: 1.4 });
      this.nextScorpio = 6 + Math.random() * 8;
    }
    for (const sc of this.scorpio) {
      sc.x += sc.vx * dt;
      sc.life -= dt;
    }
    this.scorpio = this.scorpio.filter((s) => s.life > 0);
  }

  draw(g: CanvasRenderingContext2D): void {
    const p = GALAXY;
    // 濃紺の空
    g.fillStyle = shade(p, 0);
    g.fillRect(0, 0, VIRTUAL_W, VIRTUAL_H);

    // 車輪のリズムで微かに上下（描画オフセット）
    const bob = Math.round(Math.sin(this.t * 7) * 1);
    g.save();
    g.translate(0, bob);

    // 天の川の帯（斜め・コンボで濃く）
    const density = 0.28 + this.intensity * 0.4;
    for (let y = 24; y < 92; y++) {
      const band = 1 - Math.abs(y - 58) / 34;
      const lvl = band * density;
      if (lvl > 0) fillDither(g, 0, y, VIRTUAL_W, 1, shade(p, 0), shade(p, 2), lvl);
    }

    // 星
    for (const s of this.stars) {
      const tw = (Math.sin(s.phase) + 1) / 2;
      const idx = s.layer === 0 ? (tw > 0.6 ? 2 : 0) : Math.min(3, 1 + Math.round(tw + s.layer * 0.4));
      if (idx <= 0) continue;
      g.fillStyle = shade(p, idx);
      g.fillRect(Math.round(s.x), Math.round(s.y), 1, 1);
    }

    // さそりの火（赤い尾）
    for (const sc of this.scorpio) {
      for (let k = 0; k < 6; k++) {
        g.fillStyle = k === 0 ? "#ff5a3c" : "#b83a28";
        g.fillRect(Math.round(sc.x + k * 2), Math.round(sc.y + k), 1, 1);
      }
    }

    // 沿線の標（地平線付近を流れる）
    const horizon = VIRTUAL_H - 44;
    for (const m of this.marks) {
      g.fillStyle = shade(p, 1);
      const x = Math.round(m.x);
      if (m.kind === 0) {
        g.fillRect(x, horizon - 14, 1, 14); // 電柱
        g.fillRect(x - 3, horizon - 13, 7, 1);
      } else if (m.kind === 1) {
        // 三角標
        for (let i = 0; i < 8; i++) g.fillRect(x - i, horizon - i, 1 + i * 2, 1);
      } else {
        g.fillStyle = shade(p, 3);
        g.fillRect(x, horizon - 3, 2, 2); // 停車場の灯り
      }
    }

    // 地面（線路の土手）
    g.fillStyle = shade(p, 1);
    g.fillRect(0, horizon, VIRTUAL_W, VIRTUAL_H - horizon);

    // 最高潮：天の川が光の大河へ開き、南十字が昇り、星の雨が流れる。
    if (this.peak > 0.01) this.drawPeak(g, p);

    // 手前の窓枠（車内）
    g.fillStyle = shade(p, 0);
    g.fillRect(0, 0, 4, VIRTUAL_H);
    g.fillRect(VIRTUAL_W - 4, 0, 4, VIRTUAL_H);
    g.restore();

    // ミス時のトンネル暗転
    if (this.jolt > 0) {
      g.globalAlpha = this.jolt * 0.55;
      g.fillStyle = shade(p, 0);
      g.fillRect(0, 0, VIRTUAL_W, VIRTUAL_H);
      g.globalAlpha = 1;
    }
  }

  private drawPeak(g: CanvasRenderingContext2D, p: typeof GALAXY): void {
    const k = this.peak;
    // 天の川が光の大河へ
    for (let y = 20; y < 100; y++) {
      const band = 1 - Math.abs(y - 58) / 42;
      const lvl = band * k * 0.5;
      if (lvl > 0) fillDither(g, 0, y, VIRTUAL_W, 1, shade(p, 2), shade(p, 3), lvl);
    }
    // 星の雨（速い縦流れ）
    g.fillStyle = "#dfe6ff";
    for (let i = 0; i < 26; i++) {
      const x = (i * 41 + this.t * 30) % VIRTUAL_W;
      const y = (i * 53 + this.t * 120) % (VIRTUAL_H - 44);
      g.globalAlpha = k * 0.7;
      g.fillRect(Math.round(x), Math.round(y), 1, 3);
    }
    g.globalAlpha = 1;
    // 南十字（サザンクロス）が光を放って昇る
    const cx = Math.round(VIRTUAL_W * 0.62);
    const cy = 52;
    const tw = (Math.sin(this.t * 4) + 1) / 2;
    g.globalAlpha = Math.min(1, k * 1.1);
    g.fillStyle = tw > 0.4 ? "#ffffff" : "#9fe0d0";
    for (let i = -6; i <= 6; i++) {
      g.fillRect(cx, cy + i, 1, 1);
      g.fillRect(cx + i, cy, 1, 1);
    }
    g.fillStyle = "#9fe0d0";
    for (let i = 1; i <= 3; i++) {
      g.globalAlpha = k * (1 - i / 4);
      g.fillRect(cx, cy - 6 - i, 1, 1);
      g.fillRect(cx, cy + 6 + i, 1, 1);
      g.fillRect(cx - 6 - i, cy, 1, 1);
      g.fillRect(cx + 6 + i, cy, 1, 1);
    }
    g.globalAlpha = 1;
  }
}
