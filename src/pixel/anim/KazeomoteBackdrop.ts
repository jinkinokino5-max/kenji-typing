import { VIRTUAL_W, VIRTUAL_H } from "../../core/Renderer";
import { KAZE_P, shade } from "../../core/Palette";
import type { ThemeBackdrop } from "../theme/SceneTheme";

// 『風がおもてで呼んでゐる』みぞれの荒天。
// みぞれの粒が横ざまに速く飛ぶ。しなる黒い林、稜ある巌。
// 打鍵：風の叫び＝風筋のバースト。ミス：逆風の暗転。
// 最高潮：風がソプラノで歌う＝光の筋が渦を巻き、みぞれが輝く。
// 締め：戸口から飛び出す＝白い風が満ち、渦の中心に光が結ばれる。

interface Sleet { x: number; y: number; vx: number; vy: number; bright: boolean; }
interface Burst { x: number; y: number; vx: number; life: number; }
interface Swirl { a: number; r: number; va: number; life: number; }

export class KazeomoteBackdrop implements ThemeBackdrop {
  private t = 0;
  private intensity = 0;
  private peak = 0;
  private sleet: Sleet[] = [];
  private bursts: Burst[] = [];
  private swirls: Swirl[] = [];
  private backlash = 0; // ミスの逆風
  private fin = 0;
  private readonly horizon = VIRTUAL_H - 46;
  private readonly cx = Math.round(VIRTUAL_W * 0.5);
  private readonly cy = Math.round(VIRTUAL_H * 0.42);

  constructor() {
    for (let i = 0; i < 80; i++) this.sleet.push(this.newSleet(true));
  }

  private newSleet(anywhere = false): Sleet {
    return {
      x: anywhere ? Math.random() * VIRTUAL_W : VIRTUAL_W + 8,
      y: Math.random() * VIRTUAL_H,
      vx: -(120 + Math.random() * 90),
      vy: 14 + Math.random() * 18,
      bright: Math.random() < 0.35,
    };
  }

  gust(): void {
    this.backlash = 1;
  }

  // 打鍵：風の叫び（速い風筋のバースト）。
  pulse(): void {
    const y = 10 + Math.random() * (VIRTUAL_H - 40);
    for (let i = 0; i < 2; i++) {
      this.bursts.push({
        x: VIRTUAL_W + 6 + i * 12,
        y: y + i * 3,
        vx: -(260 + Math.random() * 100),
        life: 1,
      });
    }
  }

  finale(): void {
    this.fin = 0.0001;
    for (let i = 0; i < 24; i++) {
      this.swirls.push({
        a: Math.random() * Math.PI * 2,
        r: 20 + Math.random() * 90,
        va: 2 + Math.random() * 2.5,
        life: 1,
      });
    }
  }

  update(dt: number, intensity = 0): void {
    this.t += dt;
    this.intensity = intensity;
    const target = Math.max(0, Math.min(1, (intensity - 0.75) / 0.25));
    this.peak += (target - this.peak) * Math.min(1, dt * (target > this.peak ? 3 : 1.8));
    if (this.fin > 0) this.fin += dt;
    if (this.backlash > 0) this.backlash = Math.max(0, this.backlash - dt * 1.4);

    const speed = 1 + this.intensity * 0.6 + this.peak * 0.6;
    const dir = this.backlash > 0.4 ? -0.6 : 1; // 逆風で吹き戻し
    for (const s of this.sleet) {
      s.x += s.vx * speed * dir * dt;
      s.y += s.vy * dt;
      if (s.x < -10 || s.x > VIRTUAL_W + 12 || s.y > VIRTUAL_H + 4) Object.assign(s, this.newSleet(dir < 0));
    }
    for (const b of this.bursts) { b.x += b.vx * dt; b.life -= dt * 1.8; }
    this.bursts = this.bursts.filter((b) => b.life > 0);

    // 最高潮：渦が自然発生
    if (this.peak > 0.2 && Math.random() < this.peak * 6 * dt) {
      this.swirls.push({
        a: Math.random() * Math.PI * 2,
        r: 26 + Math.random() * 60,
        va: 2.4 + Math.random() * 2,
        life: 1,
      });
    }
    for (const sw of this.swirls) {
      sw.a += sw.va * dt;
      sw.r -= dt * (this.fin > 0 ? 26 : 12); // 渦は中心へ巻き込む
      sw.life -= dt * (this.fin > 0 ? 0.28 : 0.6);
    }
    this.swirls = this.swirls.filter((sw) => sw.life > 0 && sw.r > 2);
  }

  draw(g: CanvasRenderingContext2D): void {
    const p = KAZE_P;
    const finK = this.fin > 0 ? Math.min(1, this.fin / 2.8) : 0;

    // 鉛色の空（荒天のディザ）
    g.fillStyle = shade(p, 1);
    g.fillRect(0, 0, VIRTUAL_W, VIRTUAL_H);
    g.fillStyle = shade(p, 0);
    for (let y = 0; y < this.horizon; y += 2) {
      const k = 1 - y / this.horizon;
      if ((Math.sin(y * 2.1) + 1) / 2 < k * 0.8) {
        for (let x = y % 4; x < VIRTUAL_W; x += 4) g.fillRect(x, y, 2, 1);
      }
    }
    // 流れる千切れ雲
    g.fillStyle = shade(p, 0);
    for (let i = 0; i < 5; i++) {
      const cx = ((i * 130 - this.t * (50 + this.intensity * 40)) % (VIRTUAL_W + 60)) + 30;
      const x = cx < 0 ? cx + VIRTUAL_W + 60 : cx;
      const y = 16 + i * 13;
      g.fillRect(Math.round(x) - 30, y, 46, 2);
      g.fillRect(Math.round(x) - 18, y - 1, 22, 1);
    }

    // 稜ある巌（右）
    g.fillStyle = shade(p, 0);
    for (let x = VIRTUAL_W - 92; x < VIRTUAL_W - 20; x++) {
      const k = (x - (VIRTUAL_W - 92)) / 72;
      const ridge = Math.abs(((x * 7) % 13) - 6) * 1.6; // 稜（かど）ばった稜線
      const h = Math.round(26 * Math.sin(k * Math.PI) + ridge);
      g.fillRect(x, this.horizon - h, 1, h);
    }

    // 地面（雪まじりの野）
    g.fillStyle = shade(p, 1);
    g.fillRect(0, this.horizon, VIRTUAL_W, VIRTUAL_H - this.horizon);
    g.fillStyle = shade(p, 2);
    for (let x = 0; x < VIRTUAL_W; x += 7) {
      g.fillRect(x + ((x * 3) % 4), this.horizon + 2 + (x % 5), 2, 1);
    }

    // 黒い林（しなる木々）
    const bendBase = 3 + this.intensity * 3 + this.peak * 2;
    g.fillStyle = shade(p, 0);
    for (let i = 0; i < 11; i++) {
      const x = 12 + i * 44;
      const h = 20 + (i % 4) * 5;
      const bend = bendBase * (0.7 + Math.sin(this.t * 3 + i) * 0.3) * (this.backlash > 0.4 ? -0.6 : 1);
      for (let d = 0; d < h; d++) {
        const dx = -Math.round(Math.pow(d / h, 2) * bend * 3); // 上ほど風下へ
        g.fillRect(x + dx, this.horizon - d, 2, 1);
      }
      // 裸の枝
      const topX = x - Math.round(bend * 3);
      g.fillRect(topX - 3, this.horizon - h + 3, 3, 1);
      g.fillRect(topX + 2, this.horizon - h + 6, 3, 1);
    }

    // みぞれ（横ざまの粒）
    for (const s of this.sleet) {
      const glow = this.peak > 0.3 && s.bright;
      g.fillStyle = glow ? "#9fdcff" : s.bright ? shade(p, 3) : shade(p, 2);
      g.fillRect(Math.round(s.x), Math.round(s.y), 3 + (glow ? 1 : 0), 1);
    }

    // 風の叫び（バースト）
    for (const b of this.bursts) {
      g.fillStyle = b.life > 0.5 ? shade(p, 3) : shade(p, 2);
      g.fillRect(Math.round(b.x), Math.round(b.y), 12 + Math.round(b.life * 10), 1);
    }

    // 渦（ソプラノの歌／締めの結び）
    for (const sw of this.swirls) {
      const x = this.cx + Math.cos(sw.a) * sw.r;
      const y = this.cy + Math.sin(sw.a) * sw.r * 0.6;
      g.globalAlpha = Math.min(1, sw.life);
      g.fillStyle = sw.life > 0.5 ? "#9fdcff" : shade(p, 3);
      g.fillRect(Math.round(x), Math.round(y), 2, 1);
      g.globalAlpha = 1;
    }

    // 最高潮：光の筋が空を渡り、空気が青く輝く
    if (this.peak > 0.01) {
      const k = this.peak;
      g.fillStyle = "#9fdcff";
      for (let i = 0; i < 4; i++) {
        const yy = 30 + i * 40 + Math.sin(this.t * 3 + i * 2) * 6;
        g.globalAlpha = k * 0.5;
        for (let x = 0; x < VIRTUAL_W; x += 3) {
          const wob = Math.sin(x * 0.04 + this.t * 6 + i) * 3;
          g.fillRect(x, Math.round(yy + wob), 2, 1);
        }
      }
      g.globalAlpha = k * 0.15;
      g.fillRect(0, 0, VIRTUAL_W, VIRTUAL_H);
      g.globalAlpha = 1;
    }

    // 締め：渦の中心に光が結ばれ、白い風が満ちる
    if (finK > 0) {
      const tw = (Math.sin(this.t * 9) + 1) / 2;
      g.fillStyle = tw > 0.4 ? "#ffffff" : "#9fdcff";
      g.fillRect(this.cx - 1, this.cy - 1, 3, 3);
      const arm = Math.round(3 + finK * 12 + tw * 3);
      for (let i = 1; i <= arm; i++) {
        g.globalAlpha = finK * (1 - i / arm);
        g.fillRect(this.cx, this.cy - 1 - i, 1, 1);
        g.fillRect(this.cx, this.cy + 1 + i, 1, 1);
        g.fillRect(this.cx - 1 - i, this.cy, 1, 1);
        g.fillRect(this.cx + 1 + i, this.cy, 1, 1);
      }
      g.globalAlpha = Math.max(0, finK - 0.2) * 0.7;
      g.fillStyle = "#ffffff";
      g.fillRect(0, 0, VIRTUAL_W, VIRTUAL_H);
      g.globalAlpha = 1;
    }

    // ミス：逆風の暗転
    if (this.backlash > 0.05) {
      g.globalAlpha = this.backlash * 0.4;
      g.fillStyle = shade(p, 0);
      g.fillRect(0, 0, VIRTUAL_W, VIRTUAL_H);
      g.globalAlpha = 1;
    }
  }
}
