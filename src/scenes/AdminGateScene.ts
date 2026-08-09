import type { Scene, SceneContext } from "../core/Scene";
import { VIRTUAL_W, VIRTUAL_H } from "../core/Renderer";
import { NIGHT, shade } from "../core/Palette";
import { NightBackdrop } from "../pixel/NightBackdrop";
import { drawText } from "../pixel/Text";
import { HomeScene } from "./HomeScene";
import { EditScene } from "./EditScene";

const ADMIN_CODE = "12345";

// 管理者コード入力画面。正しいコードで編集ページへ。数字のみ＝IME不要。
export class AdminGateScene implements Scene {
  private bg = new NightBackdrop(false, NIGHT);
  private t = 0;
  private code = "";
  private error = 0; // エラー点滅の残り時間

  update(dt: number, ctx: SceneContext): void {
    this.t += dt;
    this.bg.update(dt, 0);
    if (this.error > 0) this.error = Math.max(0, this.error - dt);
    const inp = ctx.input;
    if (this.t < 0.15) return;

    // 数字の入力を受理（最大8桁）。
    for (const c of inp.takeTyped()) {
      if (c >= "0" && c <= "9" && this.code.length < 8) this.code += c;
    }

    if (inp.wasPressed("Backspace")) {
      if (this.code.length > 0) this.code = this.code.slice(0, -1);
      else ctx.go(new HomeScene());
    } else if (inp.wasPressed("Escape")) {
      ctx.go(new HomeScene());
    } else if (inp.wasPressed("Enter")) {
      if (this.code === ADMIN_CODE) {
        ctx.go(new EditScene());
      } else {
        this.error = 1.2;
        this.code = "";
      }
    }
  }

  draw(ctx: SceneContext): void {
    const g = ctx.renderer.ctx;
    this.bg.draw(g);

    drawText(g, "管理者コード", VIRTUAL_W / 2, 70, {
      size: 20,
      color: shade(NIGHT, 3),
      align: "center",
      shadow: shade(NIGHT, 0),
      bold: true,
    });

    // 入力枠
    const boxW = 160;
    const boxX = VIRTUAL_W / 2 - boxW / 2;
    const boxY = 118;
    g.fillStyle = shade(NIGHT, 0);
    g.fillRect(boxX, boxY, boxW, 24);
    g.fillStyle = this.error > 0 && Math.floor(this.t * 8) % 2 === 0 ? "#e86a6a" : shade(NIGHT, 2);
    g.fillRect(boxX, boxY, boxW, 1);
    g.fillRect(boxX, boxY + 23, boxW, 1);
    g.fillRect(boxX, boxY, 1, 24);
    g.fillRect(boxX + boxW - 1, boxY, 1, 24);

    // 伏字（●）＋点滅カーソル
    const masked = "●".repeat(this.code.length);
    const cursor = Math.floor(this.t * 3) % 2 === 0 ? "_" : " ";
    drawText(g, masked + cursor, VIRTUAL_W / 2, boxY + 6, {
      size: 16,
      color: shade(NIGHT, 3),
      align: "center",
    });

    if (this.error > 0) {
      drawText(g, "コードが違います", VIRTUAL_W / 2, boxY + 34, {
        size: 12,
        color: "#e86a6a",
        align: "center",
      });
    }

    drawText(g, "数字を入力 → Enter で決定", VIRTUAL_W / 2, VIRTUAL_H - 40, {
      size: 12,
      color: shade(NIGHT, 2),
      align: "center",
    });
    drawText(g, "Esc で もどる", VIRTUAL_W / 2, VIRTUAL_H - 22, {
      size: 11,
      color: shade(NIGHT, 2),
      align: "center",
    });
  }
}
