import type { Scene, SceneContext } from "../core/Scene";
import { VIRTUAL_W, VIRTUAL_H } from "../core/Renderer";
import { NIGHT, shade } from "../core/Palette";
import { NightBackdrop } from "../pixel/NightBackdrop";
import { drawText } from "../pixel/Text";
import { HomeScene } from "./HomeScene";
import { FEEDBACK_FORM_URL } from "../config";

// ごいけん・ごかんそう画面。
// このアプリはサーバを持たない静的サイトなので、感想は外部フォーム（Googleフォーム）
// へ送ってもらう。Enter で新しいタブを開き、このゲームの画面はそのまま残す。

const LINES: Array<[string, string]> = [
  ["きいてみたいこと", "打ちやすさ、むずかしさ、絵や音のこと"],
  ["ほしい作品", "つぎに入れてほしい賢治の物語や詩"],
  ["うまく動かない", "打てない文字、表示のくずれ、音が出ない など"],
];

export class FeedbackScene implements Scene {
  private bg = new NightBackdrop(true, NIGHT);
  private t = 0;
  private opened = 0; // 「開きました」の表示が残る時間

  update(dt: number, ctx: SceneContext): void {
    this.t += dt;
    this.bg.update(dt, 0);
    if (this.opened > 0) this.opened -= dt;
    if (this.t < 0.3) return;

    const inp = ctx.input;
    if (inp.wasPressed("Escape") || inp.wasPressed("Backspace")) {
      ctx.go(new HomeScene());
    } else if (inp.wasPressed("Enter") || inp.wasPressed(" ")) {
      if (!FEEDBACK_FORM_URL) return;
      window.open(FEEDBACK_FORM_URL, "_blank", "noopener,noreferrer");
      this.opened = 3;
    }
  }

  draw(ctx: SceneContext): void {
    const g = ctx.renderer.ctx;
    this.bg.draw(g);

    drawText(g, "ごいけん・ごかんそう", VIRTUAL_W / 2, 14, {
      size: 19,
      color: shade(NIGHT, 3),
      align: "center",
      shadow: shade(NIGHT, 0),
      bold: true,
    });
    drawText(g, "あなたの一言が、このゲームを育てます。", VIRTUAL_W / 2, 40, {
      size: 12,
      color: shade(NIGHT, 2),
      align: "center",
      shadow: shade(NIGHT, 0),
    });

    LINES.forEach(([head, body], i) => {
      const y = 68 + i * 32;
      drawText(g, `◆ ${head}`, 40, y, {
        size: 13,
        color: "#9fc7ff",
        shadow: shade(NIGHT, 0),
      });
      drawText(g, body, 56, y + 15, {
        size: 11,
        color: shade(NIGHT, 3),
        shadow: shade(NIGHT, 0),
      });
    });

    if (!FEEDBACK_FORM_URL) {
      drawText(g, "※ 送り先のフォームは準備中です", VIRTUAL_W / 2, VIRTUAL_H - 44, {
        size: 11,
        color: shade(NIGHT, 2),
        align: "center",
        shadow: shade(NIGHT, 0),
      });
    } else if (this.opened > 0) {
      drawText(g, "新しいタブでフォームを開きました", VIRTUAL_W / 2, VIRTUAL_H - 44, {
        size: 12,
        color: "#9fc7ff",
        align: "center",
        shadow: shade(NIGHT, 0),
        bold: true,
      });
    } else {
      drawText(g, "Enter で 感想フォームをひらく（新しいタブ）", VIRTUAL_W / 2, VIRTUAL_H - 44, {
        size: 12,
        color: shade(NIGHT, 3),
        align: "center",
        shadow: shade(NIGHT, 0),
      });
    }

    drawText(g, "Esc で もどる", VIRTUAL_W / 2, VIRTUAL_H - 18, {
      size: 11,
      color: shade(NIGHT, 2),
      align: "center",
      shadow: shade(NIGHT, 0),
    });
  }
}
