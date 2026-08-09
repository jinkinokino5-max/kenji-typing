import { VIRTUAL_W, VIRTUAL_H } from "../../core/Renderer";
import { LAMP, shade } from "../../core/Palette";
import type { ThemeBackdrop } from "../theme/SceneTheme";

// 『春と修羅（序）』有機交流電燈。
// 青い照明のノードが網を成し、交流電流のように明滅。透明な幽霊像が漂う。
// コンボで明滅が同期して確かな青へ収束（＝心象スケッチと同調）。
// ミス：一瞬の停電（失はれ）。締め：全ノードが一斉点灯し青が満ちる。

interface Node { x: number; y: number; phase: number; speed: number; lit: number; }
interface Ghost { x: number; y: number; vx: number; w: number; h: number; phase: number; }

export class HarushuraBackdrop implements ThemeBackdrop {
  private t = 0;
  private intensity = 0;
  private peak = 0;     // 最高潮 0..1
  private nodes: Node[] = [];
  private ghosts: Ghost[] = [];
  private blackout = 0; // ミスの停電
  private blink = 0;    // 自発的な一瞬の明滅
  private fin = 0;
  private readonly cx = VIRTUAL_W / 2;
  private readonly cy = VIRTUAL_H / 2 - 4;

  constructor() {
    for (let i = 0; i < 16; i++) {
      this.nodes.push({
        x: 30 + Math.random() * (VIRTUAL_W - 60),
        y: 34 + Math.random() * (VIRTUAL_H - 80),
        phase: Math.random() * Math.PI * 2,
        speed: 1.5 + Math.random() * 2.5,
        lit: 0,
      });
    }
    for (let i = 0; i < 4; i++) {
      this.ghosts.push({
        x: Math.random() * VIRTUAL_W,
        y: 40 + Math.random() * (VIRTUAL_H - 90),
        vx: 6 + Math.random() * 8,
        w: 20 + Math.random() * 24,
        h: 26 + Math.random() * 22,
        phase: Math.random() * 6,
      });
    }
  }

  gust(): void {
    this.blackout = 1;
  }

  // 打鍵でノードが1つ灯る。
  pulse(): void {
    const n = this.nodes[Math.floor(Math.random() * this.nodes.length)];
    if (n) n.lit = 1;
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
    if (this.blackout > 0) this.blackout = Math.max(0, this.blackout - dt * 1.6);
    // 自発的な明滅（コンボが高いほど起きにくい＝安定）
    this.blink = Math.max(0, this.blink - dt * 3);
    if (Math.random() < 0.006 * (1 - intensity)) this.blink = 1;
    for (const n of this.nodes) { n.phase += n.speed * dt; if (n.lit > 0) n.lit = Math.max(0, n.lit - dt * 1.2); }
    for (const gh of this.ghosts) {
      gh.x += gh.vx * dt;
      gh.phase += dt;
      if (gh.x - gh.w > VIRTUAL_W) { gh.x = -gh.w; gh.y = 40 + Math.random() * (VIRTUAL_H - 90); }
    }
  }

  draw(g: CanvasRenderingContext2D): void {
    const p = LAMP;
    const finK = this.fin > 0 ? Math.min(1, this.fin / 2.6) : 0;
    g.fillStyle = shade(p, 0);
    g.fillRect(0, 0, VIRTUAL_W, VIRTUAL_H);

    // 透明な幽霊の複合体
    for (const gh of this.ghosts) {
      g.globalAlpha = 0.1 + (Math.sin(gh.phase) + 1) * 0.05;
      g.fillStyle = shade(p, 2);
      for (let yy = 0; yy < gh.h; yy += 2)
        for (let xx = ((yy + Math.floor(gh.x)) % 4); xx < gh.w; xx += 4)
          g.fillRect(Math.round(gh.x) + xx, Math.round(gh.y) + yy, 1, 1);
    }
    g.globalAlpha = 1;

    // 各ノードの灯り（明滅→コンボ/締めで安定・増光）
    const sync = Math.min(1, this.intensity + finK);
    const nodeBright = (n: Node) => {
      const flick = (Math.sin(n.phase) + 1) / 2;
      const base = flick * (1 - sync) + sync; // syncで明滅が消え一定に
      return Math.max(base, n.lit) * (1 - this.blink * 0.8) * (1 - this.blackout);
    };

    // 結線（隣接ノードを淡い線で）
    for (let i = 0; i < this.nodes.length; i++) {
      const a = this.nodes[i];
      const b = this.nodes[(i + 3) % this.nodes.length];
      const br = (nodeBright(a) + nodeBright(b)) / 2;
      if (br < 0.15) continue;
      g.globalAlpha = br * (0.15 + sync * 0.3);
      g.fillStyle = "#8fe0ff";
      this.line(g, a.x, a.y, b.x, b.y);
    }
    g.globalAlpha = 1;

    // ノード本体
    for (const n of this.nodes) {
      const br = nodeBright(n);
      g.fillStyle = br > 0.6 ? "#8fe0ff" : shade(p, br > 0.3 ? 3 : 2);
      g.fillRect(Math.round(n.x), Math.round(n.y), 1, 1);
      if (br > 0.7 || finK > 0.5) {
        g.globalAlpha = 0.5;
        g.fillRect(Math.round(n.x) - 1, Math.round(n.y), 1, 1);
        g.fillRect(Math.round(n.x) + 1, Math.round(n.y), 1, 1);
        g.fillRect(Math.round(n.x), Math.round(n.y) - 1, 1, 1);
        g.fillRect(Math.round(n.x), Math.round(n.y) + 1, 1, 1);
        g.globalAlpha = 1;
      }
    }

    // 中央の青いフィラメント（脈打つ）
    const pulse = (Math.sin(this.t * 3) + 1) / 2;
    const glow = (0.4 + pulse * 0.4 + sync * 0.4) * (1 - this.blackout) * (1 - this.blink * 0.7);
    g.globalAlpha = Math.min(1, glow);
    g.fillStyle = "#8fe0ff";
    g.fillRect(this.cx, this.cy - 10, 1, 20);
    g.fillRect(this.cx - 1, this.cy - 6, 3, 1);
    g.fillRect(this.cx - 1, this.cy + 5, 3, 1);
    g.globalAlpha = 1;

    // 最高潮：中央フィラメントが超新星のように閃き、青が満ちて像を結ぶ。
    if (this.peak > 0.01) {
      const k = this.peak;
      const fl = (Math.sin(this.t * 10) + 1) / 2;
      const arm = Math.round(6 + k * 16 + fl * 4);
      g.fillStyle = fl > 0.4 ? "#ffffff" : "#8fe0ff";
      g.fillRect(this.cx - 1, this.cy - 1, 3, 3);
      g.fillStyle = "#8fe0ff";
      for (let i = 1; i <= arm; i++) {
        g.globalAlpha = k * (1 - i / arm);
        g.fillRect(this.cx, this.cy - 1 - i, 1, 1);
        g.fillRect(this.cx, this.cy + 1 + i, 1, 1);
        g.fillRect(this.cx - 1 - i, this.cy, 1, 1);
        g.fillRect(this.cx + 1 + i, this.cy, 1, 1);
      }
      g.globalAlpha = k * 0.3;
      g.fillRect(0, 0, VIRTUAL_W, VIRTUAL_H);
      g.globalAlpha = 1;
    }

    // 締め：一面の澄んだ青が満ちる
    if (finK > 0) {
      g.globalAlpha = finK * 0.5 * (0.7 + pulse * 0.3);
      g.fillStyle = "#8fe0ff";
      g.fillRect(0, 0, VIRTUAL_W, VIRTUAL_H);
      g.globalAlpha = 1;
    }

    // 停電（ミス）
    if (this.blackout > 0.05) {
      g.globalAlpha = this.blackout * 0.7;
      g.fillStyle = "#02030a";
      g.fillRect(0, 0, VIRTUAL_W, VIRTUAL_H);
      g.globalAlpha = 1;
    }
  }

  private line(g: CanvasRenderingContext2D, x0: number, y0: number, x1: number, y1: number): void {
    const steps = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0));
    for (let i = 0; i <= steps; i += 2) {
      const x = x0 + ((x1 - x0) * i) / steps;
      const y = y0 + ((y1 - y0) * i) / steps;
      g.fillRect(Math.round(x), Math.round(y), 1, 1);
    }
  }
}
