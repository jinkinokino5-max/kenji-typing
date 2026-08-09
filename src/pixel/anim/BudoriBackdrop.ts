import { VIRTUAL_W, VIRTUAL_H } from "../../core/Renderer";
import { VOLCANO, shade } from "../../core/Palette";
import { fillDither } from "../dither";
import type { ThemeBackdrop } from "../theme/SceneTheme";

interface Puff {
  x: number;
  y: number;
  r: number;
  life: number;
  max: number;
}
interface Ember {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
}
interface Cloud {
  x: number;
  y: number;
  w: number;
  speed: number;
}

// 『グスコーブドリの伝記』火山と雲。
// 噴煙がパフパフと脈打ち、火口が呼吸するように明滅、火の粉が舞う。
// コンボ強度で火口が輝き、噴煙が高くなる。ミスで火が萎む。
export class BudoriBackdrop implements ThemeBackdrop {
  private puffs: Puff[] = [];
  private embers: Ember[] = [];
  private clouds: Cloud[] = [];
  private t = 0;
  private intensity = 0;
  private peak = 0; // 最高潮 0..1
  private nextPuff = 0;
  private wither = 0; // ミス時の火の萎み
  private readonly coneX = Math.round(VIRTUAL_W * 0.5);
  private readonly craterY = 96;

  constructor() {
    for (let i = 0; i < 5; i++) {
      this.clouds.push({
        x: Math.random() * VIRTUAL_W,
        y: 24 + Math.random() * 40,
        w: 14 + Math.random() * 22,
        speed: 4 + Math.random() * 6,
      });
    }
  }

  gust(): void {
    this.wither = 1;
  }

  update(dt: number, intensity = 0): void {
    this.t += dt;
    this.intensity = intensity;
    const target = Math.max(0, Math.min(1, (intensity - 0.75) / 0.25));
    this.peak += (target - this.peak) * Math.min(1, dt * (target > this.peak ? 3 : 1.8));
    if (this.wither > 0) this.wither = Math.max(0, this.wither - dt * 1.2);
    const vigor = Math.max(0.2, 0.5 + intensity * 0.8 - this.wither * 0.6);

    // 噴煙
    this.nextPuff -= dt;
    if (this.nextPuff <= 0) {
      this.puffs.push({ x: this.coneX, y: this.craterY, r: 2, life: 0, max: 2.2 });
      this.nextPuff = 0.28 - intensity * 0.1;
    }
    for (const p of this.puffs) {
      p.life += dt;
      p.y -= (10 + vigor * 14) * dt; // vigorで高く昇る
      p.x += Math.sin(p.life * 2 + p.y * 0.1) * 6 * dt;
      p.r += 6 * dt;
    }
    this.puffs = this.puffs.filter((p) => p.life < p.max);

    // 火の粉
    if (Math.random() < 0.4 + intensity * 0.5) {
      this.embers.push({
        x: this.coneX + (Math.random() - 0.5) * 8,
        y: this.craterY,
        vx: (Math.random() - 0.5) * 20,
        vy: -20 - Math.random() * 30,
        life: 0.8 + Math.random() * 0.6,
      });
    }
    for (const e of this.embers) {
      e.x += e.vx * dt;
      e.y += e.vy * dt;
      e.vy += 30 * dt;
      e.life -= dt;
    }
    this.embers = this.embers.filter((e) => e.life > 0);

    for (const c of this.clouds) {
      c.x += c.speed * dt;
      if (c.x - c.w > VIRTUAL_W) c.x = -c.w;
    }
  }

  draw(g: CanvasRenderingContext2D): void {
    const p = VOLCANO;
    const vigor = Math.max(0.2, 0.5 + this.intensity * 0.8 - this.wither * 0.6);

    // 夜空（暗赤）
    g.fillStyle = shade(p, 0);
    g.fillRect(0, 0, VIRTUAL_W, VIRTUAL_H);
    // 火口の照り返し（空がほのかに赤らむ）
    for (let y = 0; y < 90; y++) {
      const lvl = (1 - y / 90) * 0.12 * vigor;
      if (lvl > 0) fillDither(g, 0, y, VIRTUAL_W, 1, shade(p, 0), shade(p, 1), lvl);
    }

    // 雲（横流れ）
    for (const c of this.clouds) {
      g.fillStyle = shade(p, 1);
      g.fillRect(Math.round(c.x), Math.round(c.y), c.w, 3);
      g.fillRect(Math.round(c.x + 3), Math.round(c.y - 2), c.w - 6, 2);
    }

    // 噴煙（下ほど新しく明るい）
    for (const pf of this.puffs) {
      const k = pf.life / pf.max;
      g.fillStyle = shade(p, k < 0.5 ? 2 : 1);
      const r = Math.round(pf.r);
      g.fillRect(Math.round(pf.x) - r, Math.round(pf.y) - r, r * 2, r * 2);
    }

    // 火山のシルエット（三角）
    const baseY = VIRTUAL_H - 12;
    g.fillStyle = shade(p, 1);
    for (let y = this.craterY; y <= baseY; y++) {
      const half = Math.round((y - this.craterY) * 0.9) + 10;
      g.fillRect(this.coneX - half, y, half * 2, 1);
    }
    // 火口の明滅
    const glow = 0.6 + Math.sin(this.t * 4) * 0.2 + this.intensity * 0.4;
    g.fillStyle = glow > 0.9 ? shade(p, 3) : shade(p, 2);
    g.fillRect(this.coneX - 8, this.craterY, 16, 3);
    // 溶岩の筋
    g.fillStyle = "#ff7a2a";
    if (glow > 0.8) {
      g.fillRect(this.coneX - 1, this.craterY, 2, 6 + Math.round(vigor * 4));
    }

    // 火の粉
    for (const e of this.embers) {
      g.fillStyle = e.life > 0.4 ? "#ff7a2a" : shade(p, 2);
      g.fillRect(Math.round(e.x), Math.round(e.y), 1, 1);
    }

    // 最高潮：噴火が成就し、空が朝焼けに暖まり、火の粉が蛍のように昇る。
    if (this.peak > 0.01) this.drawPeak(g, baseY);

    // 手前の黒い地面
    g.fillStyle = shade(p, 0);
    g.fillRect(0, baseY, VIRTUAL_W, VIRTUAL_H - baseY);
  }

  private drawPeak(g: CanvasRenderingContext2D, baseY: number): void {
    const p = VOLCANO;
    const k = this.peak;
    // 朝焼けの暖色ウォッシュ（空〜山を暖める）
    for (let y = 0; y < baseY; y++) {
      const lvl = (1 - y / baseY) * 0.32 * k;
      if (lvl > 0) fillDither(g, 0, y, VIRTUAL_W, 1, shade(p, 1), "#f2c14e", lvl);
    }
    // 昇る火の粉（蛍）
    g.fillStyle = "#f2c14e";
    for (let i = 0; i < 26; i++) {
      const x = (i * 67 + 11) % VIRTUAL_W;
      const yy = (((i * 29 - this.t * 40) % VIRTUAL_H) + VIRTUAL_H) % VIRTUAL_H;
      g.globalAlpha = k * 0.8 * ((Math.sin(this.t * 3 + i) + 1) / 2);
      g.fillRect(x, Math.round(yy), 1, 1);
    }
    g.globalAlpha = 1;
    // 火口の大噴出
    g.fillStyle = "#f2c14e";
    g.fillRect(this.coneX - 2, this.craterY - Math.round(k * 10), 4, 10 + Math.round(k * 10));
  }
}
