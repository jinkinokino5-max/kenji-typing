import { VIRTUAL_W, VIRTUAL_H } from "../../core/Renderer";
import { ONO_IKIMONO_P, shade } from "../../core/Palette";
import type { ThemeBackdrop } from "../theme/SceneTheme";

// 特別編『けものたちの声』— 雪の野原。奥に林、空に月。
//
// 象・狐・犬・鳥がまざる章なので、画面の主役は“通り過ぎる影”にする。
// 打鍵のたびに雪へ足あとが増え、けものの影が林の前を横切っていく。
//
//   打鍵 wind  … 大きな影（象）がどしどし横切り、地面が揺れる（「グララアガア」）
//   打鍵 light … 雪を踏む足あとが増え、雪がチカチカ光る（「キシリキシリ」）
//   打鍵 water … 天井の穴からぽろん。上から粒が落ちて雪に埋まる
//   ミス       … 雪煙が舞い、月が翳る
//   最高潮     … 影が次々によぎる
//   締め       … 足あとが月へ向かってつづき、狐の子があらわれる

interface Walker {
  x: number;
  dir: number;
  /** 0=小さい獣（狐・犬）, 1=大きい獣（象） */
  big: number;
  life: number;
}

interface Print {
  x: number;
  y: number;
  life: number;
}

interface Fall {
  x: number;
  y: number;
  vy: number;
}

interface Twinkle {
  x: number;
  y: number;
  phase: number;
}

export class OnoIkimonoBackdrop implements ThemeBackdrop {
  private t = 0;
  private intensity = 0;
  private peak = 0;
  private quake = 0; // 地響き（象）
  private haze = 0; // ミスの雪煙
  private fin = 0;
  private readonly treeline = VIRTUAL_H - 52;
  private readonly snow = VIRTUAL_H - 40;

  private walkers: Walker[] = [];
  private prints: Print[] = [];
  private falls: Fall[] = [];
  private twinkles: Twinkle[] = [];
  /** 足あとを置く位置。踏むたびに右へ進む。 */
  private printX = 8;

  constructor() {
    for (let i = 0; i < 34; i++) {
      this.twinkles.push({
        x: Math.random() * VIRTUAL_W,
        y: this.snow + Math.random() * (VIRTUAL_H - this.snow),
        phase: Math.random() * Math.PI * 2,
      });
    }
  }

  gust(): void {
    this.haze = 1;
  }

  pulse(kind = "wind"): void {
    if (kind === "wind") {
      this.walkers.push({
        x: Math.random() < 0.5 ? -20 : VIRTUAL_W + 20,
        dir: 0,
        big: 1,
        life: 1,
      });
      const w = this.walkers[this.walkers.length - 1];
      w.dir = w.x < 0 ? 1 : -1;
      this.quake = 1;
      return;
    }
    if (kind === "water") {
      for (let i = 0; i < 5; i++) {
        this.falls.push({
          x: VIRTUAL_W * 0.3 + Math.random() * VIRTUAL_W * 0.4,
          y: -Math.random() * 20,
          vy: 90 + Math.random() * 50,
        });
      }
      return;
    }
    // light：キシリキシリ雪を踏む
    this.printX += 9 + Math.floor(Math.random() * 4);
    if (this.printX > VIRTUAL_W - 8) this.printX = 8;
    this.prints.push({
      x: this.printX,
      y: this.snow + 6 + Math.floor(Math.random() * 8),
      life: 1,
    });
    if (Math.random() < 0.45) {
      this.walkers.push({ x: -14, dir: 1, big: 0, life: 1 });
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

    this.quake = Math.max(0, this.quake - dt * 2.2);
    this.haze = Math.max(0, this.haze - dt * 1.1);
    if (this.peak > 0.05 && Math.random() < this.peak * dt * 6) {
      this.pulse(Math.random() < 0.5 ? "light" : "wind");
    }

    for (const w of this.walkers) {
      w.x += w.dir * (w.big ? 46 : 74) * dt;
      w.life -= dt * 0.25;
    }
    this.walkers = this.walkers.filter((w) => w.life > 0 && w.x > -30 && w.x < VIRTUAL_W + 30);

    for (const pr of this.prints) pr.life -= dt * 0.16; // ゆっくり雪に埋もれる
    this.prints = this.prints.filter((pr) => pr.life > 0);

    for (const f of this.falls) f.y += f.vy * dt;
    this.falls = this.falls.filter((f) => f.y < this.snow + 6);

    for (const tw of this.twinkles) tw.phase += dt * (1.6 + this.intensity * 2.4);
  }

  draw(g: CanvasRenderingContext2D): void {
    const p = ONO_IKIMONO_P;
    const finK = this.fin > 0 ? Math.min(1, this.fin / 2.8) : 0;
    const shakeY = this.quake > 0.02 ? Math.round(Math.sin(this.t * 46) * this.quake * 2) : 0;

    g.save();
    g.translate(0, shakeY);

    // 夜空
    g.fillStyle = shade(p, 0);
    g.fillRect(0, -4, VIRTUAL_W, this.treeline + 4);
    // 星
    g.fillStyle = shade(p, 2);
    for (let i = 0; i < 30; i++) {
      const x = (i * 71) % VIRTUAL_W;
      const y = (i * 37) % (this.treeline - 6);
      if ((Math.sin(this.t * 1.3 + i) + 1) / 2 > 0.55) g.fillRect(x, y, 1, 1);
    }
    // 月（締めで大きく明るくなる）。上部バー（22px）に食われない高さに置く。
    const moonR = 9 + Math.round(finK * 3);
    this.disc(g, Math.round(VIRTUAL_W * 0.78), 40, moonR, shade(p, 3));

    // 地平の明かり。これが無いと林が空と同じ色になり、シルエットが消える。
    g.fillStyle = shade(p, 1);
    for (let y = this.treeline - 38; y < this.treeline; y++) {
      const near = (y - (this.treeline - 38)) / 38; // 地平に近いほど密なディザ
      const step = near > 0.75 ? 1 : near > 0.5 ? 2 : near > 0.25 ? 4 : 8;
      for (let x = (y % step); x < VIRTUAL_W; x += step) g.fillRect(x, y, 1, 1);
    }

    // 林のシルエット
    g.fillStyle = shade(p, 0);
    for (let x = 0; x < VIRTUAL_W; x += 6) {
      const h = 16 + ((x * 13) % 16);
      g.fillRect(x, this.treeline - h, 3, h + 6);
      g.fillRect(x - 1, this.treeline - h - 2, 5, 3); // 梢
    }
    g.fillStyle = shade(p, 1);
    g.fillRect(0, this.treeline, VIRTUAL_W, this.snow - this.treeline);

    // 横切るけものの影（林の前）
    for (const w of this.walkers) {
      g.fillStyle = shade(p, 0);
      const x = Math.round(w.x);
      const y = this.snow - (w.big ? 14 : 6);
      if (w.big) {
        g.fillRect(x - 12, y, 24, 12); // 胴
        g.fillRect(x + 10 * w.dir, y - 4, 6, 6); // 頭
        g.fillRect(x + 14 * w.dir, y + 2, 2, 8); // 鼻
        const step = Math.sin(this.t * 9) > 0 ? 1 : -1;
        g.fillRect(x - 8, y + 12, 3, 3 + step);
        g.fillRect(x + 5, y + 12, 3, 3 - step);
      } else {
        g.fillRect(x - 5, y, 10, 4); // 胴
        g.fillRect(x + 5 * w.dir, y - 3, 4, 4); // 頭
        g.fillRect(x - 7 * w.dir, y - 2, 3, 2); // 尾
        const step = Math.sin(this.t * 13) > 0 ? 1 : 0;
        g.fillRect(x - 3, y + 4, 1, 3 - step);
        g.fillRect(x + 2, y + 4, 1, 2 + step);
      }
    }

    // 雪原
    g.fillStyle = shade(p, 1);
    g.fillRect(0, this.snow, VIRTUAL_W, VIRTUAL_H - this.snow + 4);
    // チカチカ光る雪
    for (const tw of this.twinkles) {
      if ((Math.sin(tw.phase) + 1) / 2 < 0.72) continue;
      g.fillStyle = shade(p, 3);
      g.fillRect(Math.round(tw.x), Math.round(tw.y), 1, 1);
    }
    // 足あと
    for (const pr of this.prints) {
      g.fillStyle = pr.life > 0.5 ? shade(p, 0) : shade(p, 2);
      g.fillRect(Math.round(pr.x), Math.round(pr.y), 2, 1);
      g.fillRect(Math.round(pr.x) + 3, Math.round(pr.y) + 2, 2, 1);
    }
    // 落ちてくる粒（ぽろん）
    g.fillStyle = shade(p, 3);
    for (const f of this.falls) g.fillRect(Math.round(f.x), Math.round(f.y), 1, 2);

    g.restore();

    // 締め：狐の子が雪の上に立ちどまる
    if (finK > 0.35) {
      const x = Math.round(VIRTUAL_W * 0.5);
      const y = this.snow - 2;
      g.fillStyle = shade(p, 3);
      g.fillRect(x - 4, y - 4, 9, 4); // 胴
      g.fillRect(x + 4, y - 7, 4, 4); // 頭
      g.fillRect(x + 4, y - 9, 1, 2); // 耳
      g.fillRect(x + 7, y - 9, 1, 2);
      g.fillRect(x - 7, y - 6, 3, 2); // 尾
      g.globalAlpha = (finK - 0.35) * 0.22;
      g.fillStyle = shade(p, 3); // 月あかりが野原に満ちる
      g.fillRect(0, 0, VIRTUAL_W, VIRTUAL_H);
      g.globalAlpha = 1;
    }

    // ミス：雪煙
    if (this.haze > 0.02) {
      g.globalAlpha = this.haze * 0.4;
      g.fillStyle = "#000000";
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
