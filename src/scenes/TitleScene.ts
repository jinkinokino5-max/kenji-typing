import type { Scene, SceneContext } from "../core/Scene";
import { VIRTUAL_W, VIRTUAL_H } from "../core/Renderer";
import { NIGHT, shade } from "../core/Palette";
import { NightBackdrop } from "../pixel/NightBackdrop";
import { drawText } from "../pixel/Text";
import { drawYodaka, flapFrame } from "../pixel/anim/Yodaka";
import { HomeScene } from "./HomeScene";
import { trackByKey } from "../audio/tracks";

// タイトル画面：動く夜空＋題字。任意キーで物語へ。
export class TitleScene implements Scene {
  private bg = new NightBackdrop(true);
  private t = 0;

  update(dt: number, ctx: SceneContext): void {
    this.t += dt;
    this.bg.update(dt, 0);
    if (ctx.input.anyPressed()) {
      ctx.audio.init();
      ctx.audio.playBgm(trackByKey("yodaka"));
      ctx.go(new HomeScene());
    }
  }

  draw(ctx: SceneContext): void {
    const g = ctx.renderer.ctx;
    this.bg.draw(g);

    // 舞い上がるよだか（緩く上下）
    drawYodaka(
      g,
      Math.round(VIRTUAL_W * 0.78),
      Math.round(70 + Math.sin(this.t * 0.8) * 6),
      flapFrame(this.t),
      NIGHT,
      3,
    );

    // 題字
    drawText(g, "KENJI", VIRTUAL_W / 2, 54, {
      size: 60,
      color: shade(NIGHT, 3),
      align: "center",
      shadow: shade(NIGHT, 0),
      bold: true,
    });
    drawText(g, "TYPING", VIRTUAL_W / 2, 112, {
      size: 60,
      color: shade(NIGHT, 2),
      align: "center",
      shadow: shade(NIGHT, 0),
      bold: true,
    });
    drawText(g, "宮沢賢治 タイピング 〜言葉の銀河ステーション〜", VIRTUAL_W / 2, 176, {
      size: 14,
      color: shade(NIGHT, 2),
      align: "center",
      shadow: shade(NIGHT, 0),
    });

    // 最高記録
    const best = ctx.state.save;
    if (best.bestScore > 0) {
      drawText(g, `BEST ${best.bestScore}  RANK ${best.bestRank}`, VIRTUAL_W / 2, 200, {
        size: 12,
        color: shade(NIGHT, 2),
        align: "center",
        shadow: shade(NIGHT, 0),
      });
    }

    // 点滅する開始案内
    if (Math.floor(this.t * 1.6) % 2 === 0) {
      drawText(g, "- おしてはじめる -", VIRTUAL_W / 2, VIRTUAL_H - 34, {
        size: 14,
        color: shade(NIGHT, 3),
        align: "center",
        shadow: shade(NIGHT, 0),
      });
    }
  }
}
