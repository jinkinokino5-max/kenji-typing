import { VIRTUAL_W, VIRTUAL_H } from "../../core/Renderer";
import { YORU_P, shade } from "../../core/Palette";
import type { ThemeBackdrop } from "../theme/SceneTheme";

// 『夜』灯火ひとつの病室。極めて静かで内省的な演出（他3編とは対照的に控えめ）。
// 打鍵：燭台の灯がわずかに揺れて瞬く（息をひとつ、というだけの控えめな反応）。
// ミス：灯が大きく揺らぎ、部屋がさらに暗く沈む。
// 最高潮：燭台の光がじわりと広がる（音量が増すのみ、演出は静かなまま）。
// 締め：光がほのじろく満ちて、静かに収まる。

interface Ember {
  x: number;
  y: number;
  vy: number;
  life: number;
}

export class YoruBackdrop implements ThemeBackdrop {
  private t = 0;
  private intensity = 0;
  private flicker = 0; // 打鍵のたび軽く揺れる
  private darken = 0; // ミスの暗転
  private fin = 0;
  private embers: Ember[] = [];
  private readonly candleX = Math.round(VIRTUAL_W * 0.24);
  private readonly candleY = VIRTUAL_H - 44;
  private readonly shojiX = Math.round(VIRTUAL_W * 0.6);

  gust(): void {
    this.darken = 1;
  }

  // 打鍵：灯がわずかに瞬く（控えめ）。
  pulse(): void {
    this.flicker = Math.min(1, this.flicker + 0.4);
    if (Math.random() < 0.15) {
      this.embers.push({ x: this.candleX + (Math.random() - 0.5) * 2, y: this.candleY - 3, vy: -3, life: 1 });
    }
  }

  finale(): void {
    this.fin = 0.0001;
  }

  update(dt: number, intensity = 0): void {
    this.t += dt;
    this.intensity = intensity;
    if (this.flicker > 0) this.flicker = Math.max(0, this.flicker - dt * 1.2);
    if (this.darken > 0) this.darken = Math.max(0, this.darken - dt * 0.9);
    if (this.fin > 0) this.fin += dt;

    for (const e of this.embers) {
      e.y += e.vy * dt;
      e.life -= dt * 0.7;
    }
    this.embers = this.embers.filter((e) => e.life > 0);
  }

  draw(g: CanvasRenderingContext2D): void {
    const p = YORU_P;
    const finK = this.fin > 0 ? Math.min(1, this.fin / 2.8) : 0;

    // 暗い部屋
    g.fillStyle = shade(p, 0);
    g.fillRect(0, 0, VIRTUAL_W, VIRTUAL_H);

    // 障子越しの春の夜気配（淡い月明かり）
    const moon = (Math.sin(this.t * 0.6) + 1) / 2;
    for (let y = 20; y < VIRTUAL_H - 30; y += 8) {
      for (let x = this.shojiX; x < VIRTUAL_W - 6; x += 10) {
        g.fillStyle = shade(p, 1);
        g.fillRect(x, y, 8, 1);
        g.fillRect(x, y, 1, 8);
      }
    }
    g.globalAlpha = 0.12 + moon * 0.06;
    g.fillStyle = "#7fa0c0";
    g.fillRect(this.shojiX, 16, VIRTUAL_W - this.shojiX - 4, VIRTUAL_H - 46);
    g.globalAlpha = 1;

    // 横たわる人影（手前中央やや左）
    g.fillStyle = shade(p, 0);
    g.fillRect(Math.round(VIRTUAL_W * 0.38), VIRTUAL_H - 30, 46, 6);
    g.fillRect(Math.round(VIRTUAL_W * 0.34), VIRTUAL_H - 34, 12, 8);
    g.fillStyle = shade(p, 1);
    g.fillRect(Math.round(VIRTUAL_W * 0.36), VIRTUAL_H - 32, 40, 2);

    // 燭台
    const flick = (Math.sin(this.t * 9) + 1) / 2 * 0.5 + this.flicker * 0.5 + this.intensity * 0.05;
    const dark = Math.max(0, 1 - this.darken);
    const glowR = Math.round((5 + flick * 2 + finK * 14) * dark);
    g.fillStyle = shade(p, 1);
    g.fillRect(this.candleX - 1, this.candleY, 3, 10); // 燭台の柄
    g.fillRect(this.candleX - 2, this.candleY + 9, 5, 1); // 台座
    // 灯の光暈（ディザで柔らかく）
    for (let dy = -glowR; dy <= glowR; dy++) {
      for (let dx = -glowR; dx <= glowR; dx++) {
        const d = Math.sqrt(dx * dx + dy * dy);
        if (d > glowR) continue;
        const k = 1 - d / glowR;
        if (Math.random() < k * 0.5) {
          g.fillStyle = k > 0.6 ? "#f0c98a" : shade(p, 2);
          g.fillRect(this.candleX + dx, this.candleY - 4 + dy, 1, 1);
        }
      }
    }
    g.fillStyle = "#e8b26a";
    g.fillRect(this.candleX, this.candleY - 6, 1, 2 + Math.round(flick));

    // ごくまれに立ちのぼる、ほのかな赤い残り火（喀血のイメージ。控えめに）
    for (const e of this.embers) {
      g.globalAlpha = Math.max(0, e.life) * 0.5;
      g.fillStyle = "#7a2a2a";
      g.fillRect(Math.round(e.x), Math.round(e.y), 1, 1);
      g.globalAlpha = 1;
    }

    // 締め：ほのじろい光が静かに満ちる
    if (finK > 0) {
      g.globalAlpha = finK * 0.3;
      g.fillStyle = "#dce8f0";
      g.fillRect(0, 0, VIRTUAL_W, VIRTUAL_H);
      g.globalAlpha = 1;
    }

    // ミス：灯が揺らぎ、部屋が沈む
    if (this.darken > 0.05) {
      g.globalAlpha = this.darken * 0.4;
      g.fillStyle = shade(p, 0);
      g.fillRect(0, 0, VIRTUAL_W, VIRTUAL_H);
      g.globalAlpha = 1;
    }
  }
}
