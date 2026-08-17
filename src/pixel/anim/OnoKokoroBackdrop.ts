import { VIRTUAL_W, VIRTUAL_H } from "../../core/Renderer";
import { ONO_KOKORO_P, shade } from "../../core/Palette";
import type { ThemeBackdrop } from "../theme/SceneTheme";

// 特別編『こころの声』— 灯りひとつの部屋。がたがた、わくわく、ぱちぱち。
//
// 外の景色ではなく“内側”の章なので、画面の中心に鼓動を置く。
// 灯りは常に心拍（ドッ・ドッの二連打）で脈打ち、床と壁に光の輪を投げる。
// コンボが上がるほど鼓動が速くなり、部屋が明るくなる。
//
//   打鍵 water … ふるえ。画面が小刻みに震える（「がたがた」「ぶるぶる」）
//   打鍵 light … ぱちぱち。灯りから火花が散る（「パチパチ」「ぱちん」）
//   打鍵 wind  … ぐるぐる。光の粒が渦を巻いて回る
//   ミス       … 灯りが消えかけ、部屋が暗く沈む
//   最高潮     … 鼓動が速まり、光の輪が部屋を満たす
//   締め       … 灯りがふくらみ、部屋がまるごと明るくなる

interface Spark {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
}

interface Swirl {
  a: number;
  r: number;
  spd: number;
  life: number;
}

export class OnoKokoroBackdrop implements ThemeBackdrop {
  private t = 0;
  private intensity = 0;
  private peak = 0;
  private beat = 0; // 心拍の位相 0..1
  private tremble = 0; // ふるえ
  private dim = 0; // ミスで灯りが翳る
  private fin = 0;
  private readonly cx = Math.round(VIRTUAL_W * 0.5);
  // 灯りは画面の下半分に置く。中央に置くと文字ウィンドウの裏へ隠れてしまう。
  private readonly cy = Math.round(VIRTUAL_H * 0.62);
  private readonly floorY = VIRTUAL_H - 30;

  private sparks: Spark[] = [];
  private swirls: Swirl[] = [];

  gust(): void {
    this.dim = 1;
    this.tremble = Math.max(this.tremble, 0.6);
  }

  pulse(kind = "water"): void {
    if (kind === "light") {
      for (let i = 0; i < 7; i++) {
        const a = Math.random() * Math.PI * 2;
        const sp = 30 + Math.random() * 45;
        this.sparks.push({
          x: this.cx,
          y: this.cy,
          vx: Math.cos(a) * sp,
          vy: Math.sin(a) * sp,
          life: 1,
        });
      }
      return;
    }
    if (kind === "wind") {
      for (let i = 0; i < 5; i++) {
        this.swirls.push({
          a: Math.random() * Math.PI * 2,
          r: 14 + Math.random() * 26,
          spd: 2.2 + Math.random() * 1.8,
          life: 1,
        });
      }
      return;
    }
    // water：ふるえ
    this.tremble = Math.min(1, this.tremble + 0.55);
  }

  finale(): void {
    this.fin = 0.0001;
  }

  /** 心拍のかたち。ドッ（強）・ドッ（弱）・休み、を 0..1 の明るさで返す。 */
  private heart(phase: number): number {
    if (phase < 0.12) return 1 - phase / 0.12;
    if (phase < 0.26) return 0;
    if (phase < 0.36) return (1 - (phase - 0.26) / 0.1) * 0.6;
    return 0;
  }

  update(dt: number, intensity = 0): void {
    this.t += dt;
    this.intensity = intensity;
    const target = Math.max(0, Math.min(1, (intensity - 0.7) / 0.3));
    this.peak += (target - this.peak) * Math.min(1, dt * (target > this.peak ? 3 : 1.6));
    if (this.fin > 0) this.fin += dt;

    // コンボが上がるほど脈が速い（毎分 62 → 100 拍あたり）
    this.beat = (this.beat + dt * (1.03 + this.intensity * 0.6)) % 1;
    this.tremble = Math.max(0, this.tremble - dt * 2.4);
    this.dim = Math.max(0, this.dim - dt * 1.3);

    for (const s of this.sparks) {
      s.x += s.vx * dt;
      s.y += s.vy * dt;
      s.vy += 70 * dt;
      s.life -= dt * 1.5;
    }
    this.sparks = this.sparks.filter((s) => s.life > 0);

    for (const w of this.swirls) {
      w.a += w.spd * dt;
      w.r += dt * 10;
      w.life -= dt * 0.8;
    }
    this.swirls = this.swirls.filter((w) => w.life > 0);
  }

  draw(g: CanvasRenderingContext2D): void {
    const p = ONO_KOKORO_P;
    const finK = this.fin > 0 ? Math.min(1, this.fin / 2.8) : 0;
    const pulse = this.heart(this.beat) * (1 - this.dim * 0.8);
    // ふるえは画面全体を1〜2pxずらす。補間せず整数でガタつかせる。
    const sx = this.tremble > 0.05 ? Math.round(Math.sin(this.t * 61) * this.tremble * 2) : 0;
    const sy = this.tremble > 0.05 ? Math.round(Math.cos(this.t * 53) * this.tremble * 2) : 0;

    g.save();
    g.translate(sx, sy);

    // 部屋の闇
    g.fillStyle = shade(p, 0);
    g.fillRect(-2, -2, VIRTUAL_W + 4, VIRTUAL_H + 4);

    // 羽目板の壁。真っ黒だと部屋に見えないので、うっすら横線だけ入れる。
    g.globalAlpha = 0.5 + pulse * 0.3;
    g.fillStyle = shade(p, 1);
    for (let y = 6; y < this.floorY; y += 12) {
      for (let x = -2; x < VIRTUAL_W + 4; x += 3) g.fillRect(x, y, 2, 1);
    }
    g.globalAlpha = 1;

    // 灯りが投げる光の輪。鼓動と最高潮で広がる。
    const rings = 4;
    for (let i = rings; i >= 1; i--) {
      const base = 22 + i * 15;
      const r = base + pulse * 6 + this.peak * 10 + finK * 26;
      g.globalAlpha = Math.max(0, (0.5 - i * 0.09) * (0.45 + pulse * 0.55 + this.peak * 0.3));
      g.fillStyle = shade(p, 1);
      this.ellipse(g, this.cx, this.cy, Math.round(r), Math.round(r * 0.78));
      g.globalAlpha = 1;
    }

    // 床（灯りの下だけ照らされる板の間）
    g.fillStyle = shade(p, 1);
    g.fillRect(-2, this.floorY, VIRTUAL_W + 4, VIRTUAL_H - this.floorY + 4);
    g.fillStyle = shade(p, 0);
    for (let x = -2; x < VIRTUAL_W + 4; x += 16) g.fillRect(x, this.floorY, 1, VIRTUAL_H - this.floorY + 4);

    // 渦を巻く光の粒（ぐるぐる）
    for (const w of this.swirls) {
      g.fillStyle = w.life > 0.5 ? shade(p, 3) : shade(p, 2);
      g.fillRect(
        Math.round(this.cx + Math.cos(w.a) * w.r),
        Math.round(this.cy + Math.sin(w.a) * w.r * 0.7),
        1,
        1,
      );
    }

    // 灯り本体。芯が鼓動で明滅する。
    const coreR = 5 + Math.round(pulse * 2) + Math.round(finK * 5);
    this.disc(g, this.cx, this.cy, coreR + 3, shade(p, 2));
    this.disc(g, this.cx, this.cy, coreR, pulse > 0.35 || finK > 0.4 ? shade(p, 3) : "#ffb3b3");
    // 灯台（ランプの脚）
    g.fillStyle = shade(p, 1);
    g.fillRect(this.cx - 1, this.cy + coreR + 3, 2, this.floorY - this.cy - coreR - 3);
    g.fillRect(this.cx - 5, this.floorY - 2, 10, 2);

    // 火花（ぱちぱち）
    for (const s of this.sparks) {
      g.fillStyle = s.life > 0.5 ? shade(p, 3) : shade(p, 2);
      g.fillRect(Math.round(s.x), Math.round(s.y), 1, 1);
    }

    g.restore();

    // 締め：灯りがふくらみ、部屋がまるごと明るくなる
    if (finK > 0) {
      g.globalAlpha = finK * 0.2;
      g.fillStyle = shade(p, 2);
      g.fillRect(0, 0, VIRTUAL_W, VIRTUAL_H);
      g.globalAlpha = 1;
    }
    // ミス：灯りが消えかけて部屋が沈む
    if (this.dim > 0.02) {
      g.globalAlpha = this.dim * 0.45;
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

  /** 塗りつぶしの楕円（光の輪に使う）。 */
  private ellipse(g: CanvasRenderingContext2D, cx: number, cy: number, rx: number, ry: number): void {
    for (let y = -ry; y <= ry; y++) {
      const w = Math.floor(rx * Math.sqrt(Math.max(0, 1 - (y * y) / (ry * ry))));
      g.fillRect(cx - w, cy + y, w * 2, 1);
    }
  }
}
