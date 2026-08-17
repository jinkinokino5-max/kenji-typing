import { VIRTUAL_W, VIRTUAL_H } from "../../core/Renderer";
import { ONO_KAZE_P, shade } from "../../core/Palette";
import type { ThemeBackdrop } from "../theme/SceneTheme";

// 特別編『風とそらの声』— 又三郎が通り過ぎていく荒天の野原。
//
// 「どっどど どどうど」の章なので、画面の主役は“横に走るもの”にする。
// 雲は層をなして絶えず流れ、地平の草はいっせいにしなる。
//
//   打鍵 wind  … 風の筋が走り、青いくるみ・すっぱいかりんが吹きとばされる
//   打鍵 light … 稲光がジグザグに落ちて空が白む（「キインキイン」「カンカン」）
//   打鍵 water … 斜めの雨が降り、草がしずくを払う（「ポタリポタリ」）
//   ミス       … 逆向きの黒い突風。空が翳り、草が乱れる
//   最高潮     … 風の筋が画面じゅうを走り、雲の流れが速まる
//   締め       … 雲が切れ、風がやんで青ぞらが開く

interface Streak {
  x: number;
  y: number;
  vx: number;
  life: number;
}

interface Nut {
  x: number;
  y: number;
  vx: number;
  vy: number;
  spin: number;
  life: number;
}

interface Drop {
  x: number;
  y: number;
  vy: number;
}

interface Bolt {
  /** 落雷のジグザグ。1本ぶんの折れ点列。 */
  pts: Array<[number, number]>;
  life: number;
}

interface Grass {
  x: number;
  h: number;
}

export class OnoKazeBackdrop implements ThemeBackdrop {
  private t = 0;
  private intensity = 0;
  private peak = 0;
  private bend = 0; // 草のしなり。符号が風向き
  private flash = 0; // 稲光の白み
  private dark = 0; // ミスの翳り
  private fin = 0;
  private readonly horizon = VIRTUAL_H - 44;

  private streaks: Streak[] = [];
  private nuts: Nut[] = [];
  private drops: Drop[] = [];
  private bolts: Bolt[] = [];
  private grass: Grass[] = [];

  constructor() {
    for (let x = 1; x < VIRTUAL_W; x += 3 + Math.floor(Math.random() * 3)) {
      this.grass.push({ x, h: 5 + Math.floor(Math.random() * 8) });
    }
  }

  gust(): void {
    this.dark = 1;
    this.bend = -4;
  }

  pulse(kind = "wind"): void {
    if (kind === "light") {
      this.flash = Math.min(1, this.flash + 0.8);
      this.bolts.push({ pts: this.makeBolt(), life: 1 });
      return;
    }
    if (kind === "water") {
      for (let i = 0; i < 14; i++) {
        this.drops.push({
          x: Math.random() * (VIRTUAL_W + 40) - 20,
          y: -Math.random() * 40,
          vy: 150 + Math.random() * 70,
        });
      }
      this.bend = 2;
      return;
    }
    // wind
    const dir = Math.random() < 0.5 ? 1 : -1;
    const y = 14 + Math.random() * (this.horizon - 24);
    for (let i = 0; i < 3; i++) {
      this.streaks.push({
        x: dir > 0 ? -10 - i * 12 : VIRTUAL_W + 10 + i * 12,
        y: y + i * 2,
        vx: dir * (170 + Math.random() * 90),
        life: 1,
      });
    }
    // 吹きとばされる青いくるみ／すっぱいかりん
    this.nuts.push({
      x: dir > 0 ? -4 : VIRTUAL_W + 4,
      y: this.horizon - 6 - Math.random() * 26,
      vx: dir * (90 + Math.random() * 60),
      vy: -(10 + Math.random() * 25),
      spin: Math.random() * Math.PI,
      life: 1,
    });
    this.bend = 4 * dir;
  }

  finale(): void {
    this.fin = 0.0001;
  }

  /** 空から地平へ落ちる稲光の折れ線をひとつ作る。 */
  private makeBolt(): Array<[number, number]> {
    const pts: Array<[number, number]> = [];
    let x = 30 + Math.random() * (VIRTUAL_W - 60);
    let y = 0;
    while (y < this.horizon - 8) {
      pts.push([Math.round(x), Math.round(y)]);
      y += 6 + Math.random() * 8;
      x += (Math.random() - 0.5) * 18;
    }
    return pts;
  }

  update(dt: number, intensity = 0): void {
    this.t += dt;
    this.intensity = intensity;
    const target = Math.max(0, Math.min(1, (intensity - 0.7) / 0.3));
    this.peak += (target - this.peak) * Math.min(1, dt * (target > this.peak ? 3 : 1.6));
    if (this.fin > 0) this.fin += dt;

    this.flash = Math.max(0, this.flash - dt * 2.6);
    this.dark = Math.max(0, this.dark - dt * 1.2);
    this.bend *= Math.pow(0.03, dt);

    // 最高潮：風がひとりでに走りつづける（又三郎の通過）
    if (this.peak > 0.05 && Math.random() < this.peak * dt * 14) this.pulse("wind");

    for (const s of this.streaks) {
      s.x += s.vx * dt;
      s.life -= dt * 1.5;
    }
    this.streaks = this.streaks.filter((s) => s.life > 0);

    for (const n of this.nuts) {
      n.x += n.vx * dt;
      n.y += n.vy * dt;
      n.vy += 55 * dt;
      n.spin += dt * 9;
      n.life -= dt * 0.7;
    }
    this.nuts = this.nuts.filter((n) => n.life > 0 && n.y < this.horizon + 2);

    for (const d of this.drops) {
      d.y += d.vy * dt;
      d.x += 70 * dt; // 斜めに吹き降る
    }
    this.drops = this.drops.filter((d) => d.y < this.horizon + 4);

    for (const b of this.bolts) b.life -= dt * 3.5;
    this.bolts = this.bolts.filter((b) => b.life > 0);
  }

  draw(g: CanvasRenderingContext2D): void {
    const p = ONO_KAZE_P;
    const finK = this.fin > 0 ? Math.min(1, this.fin / 2.8) : 0;

    // 空。締めが進むにつれて明るく晴れていく。
    g.fillStyle = finK > 0.5 ? shade(p, 1) : shade(p, 0);
    g.fillRect(0, 0, VIRTUAL_W, this.horizon);

    // 空を渡りつづける風の道。打鍵がなくても空が止まって見えないようにする。
    g.fillStyle = shade(p, 1);
    for (let i = 0; i < 6; i++) {
      const y = 12 + i * 30;
      const span = VIRTUAL_W + 60;
      const x = ((i * 83 - this.t * (34 + i * 11)) % span + span) % span - 30;
      for (let k = 0; k < 3; k++) g.fillRect(Math.round(x) + k * 5, y, 3, 1);
    }

    // 層をなして流れる雲。コンボが上がるほど速い。
    const speed = 12 + this.intensity * 26 + this.peak * 20;
    for (let i = 0; i < 10; i++) {
      const w = 40 + i * 8;
      const y = 4 + i * 12;
      // 締めでは雲が上下へ引いて青ぞらが割れる
      const drift = finK * (i < 2 ? -20 : 26) * finK;
      const span = VIRTUAL_W + w;
      let x = ((i * 97 - this.t * (speed + i * 4)) % span + span) % span - w;
      g.fillStyle = i < 2 ? shade(p, 1) : shade(p, 2);
      g.globalAlpha = 1 - finK * 0.7;
      g.fillRect(Math.round(x), Math.round(y + drift), w, 3);
      g.fillRect(Math.round(x) + 8, Math.round(y + drift) - 2, Math.round(w * 0.5), 2);
      g.globalAlpha = 1;
    }

    // 稲光
    for (const b of this.bolts) {
      g.fillStyle = b.life > 0.5 ? "#ffe27a" : shade(p, 3);
      for (let i = 1; i < b.pts.length; i++) {
        const [x0, y0] = b.pts[i - 1];
        const [x1, y1] = b.pts[i];
        // 折れ点どうしを1pxで結ぶ（Bresenham の簡略版）
        const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0));
        for (let k = 0; k <= n; k++) {
          g.fillRect(Math.round(x0 + ((x1 - x0) * k) / n), Math.round(y0 + ((y1 - y0) * k) / n), 1, 1);
        }
      }
    }

    // 遠い丘
    g.fillStyle = shade(p, 1);
    for (let x = 0; x < VIRTUAL_W; x++) {
      const h = 8 + Math.round(Math.sin(x * 0.028) * 5 + Math.sin(x * 0.009) * 4);
      g.fillRect(x, this.horizon - h, 1, h);
    }

    // 風の筋
    for (const s of this.streaks) {
      g.fillStyle = s.life > 0.5 ? shade(p, 3) : shade(p, 2);
      g.fillRect(Math.round(s.x), Math.round(s.y), 7 + Math.round(s.life * 8), 1);
    }

    // 吹きとばされる木の実（回るので縦横が入れ替わる）
    for (const n of this.nuts) {
      g.fillStyle = shade(p, 3);
      const x = Math.round(n.x);
      const y = Math.round(n.y);
      if (Math.sin(n.spin) > 0) g.fillRect(x, y, 2, 1);
      else g.fillRect(x, y, 1, 2);
    }

    // 雨
    g.fillStyle = shade(p, 2);
    for (const d of this.drops) g.fillRect(Math.round(d.x), Math.round(d.y), 1, 3);

    // 野原
    g.fillStyle = shade(p, 0);
    g.fillRect(0, this.horizon, VIRTUAL_W, VIRTUAL_H - this.horizon);
    g.fillStyle = shade(p, 1);
    for (const gr of this.grass) {
      const sway = this.bend + Math.sin(this.t * 3 + gr.x * 0.11) * (1 + this.intensity * 1.5);
      for (let i = 0; i < gr.h; i++) {
        const dx = Math.round((i / gr.h) * sway);
        g.fillRect(gr.x + dx, this.horizon - i, 1, 1);
      }
    }

    // 稲光の白み
    if (this.flash > 0.02) {
      g.globalAlpha = this.flash * 0.3;
      g.fillStyle = shade(p, 3);
      g.fillRect(0, 0, VIRTUAL_W, VIRTUAL_H);
      g.globalAlpha = 1;
    }
    // ミスの翳り
    if (this.dark > 0.02) {
      g.globalAlpha = this.dark * 0.45;
      g.fillStyle = "#000000";
      g.fillRect(0, 0, VIRTUAL_W, VIRTUAL_H);
      g.globalAlpha = 1;
    }
  }
}
