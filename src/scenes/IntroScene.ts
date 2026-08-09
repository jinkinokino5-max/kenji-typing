import type { Scene, SceneContext } from "../core/Scene";
import { VIRTUAL_W, VIRTUAL_H } from "../core/Renderer";
import { shade } from "../core/Palette";
import type { SceneTheme, ThemeBackdrop } from "../pixel/theme/SceneTheme";
import { themeForStory } from "../pixel/theme/themes";
import { trackByKey } from "../audio/tracks";
import { drawText } from "../pixel/Text";
import type { Story } from "../data/story";
import { GameScene } from "./GameScene";

// 物語導入。章題と数行の導入文をフェードインで見せ、キー/時間経過で本編へ。
// 背景・BGMは章のテーマに切り替わる。
export class IntroScene implements Scene {
  private readonly story: Story;
  private readonly theme: SceneTheme;
  private bg: ThemeBackdrop;
  private t = 0;

  constructor(story: Story) {
    this.story = story;
    this.theme = themeForStory(story.key);
    this.bg = this.theme.makeBackdrop();
  }

  enter(ctx: SceneContext): void {
    ctx.audio.playBgm(trackByKey(this.theme.bgmKey));
  }

  update(dt: number, ctx: SceneContext): void {
    this.t += dt;
    this.bg.update(dt, 0);
    // 少し見せたら任意キーでスキップ可能。放置でも7秒で自動開始。
    if ((this.t > 0.8 && ctx.input.anyPressed()) || this.t > 7) {
      ctx.go(new GameScene(this.story));
    }
  }

  draw(ctx: SceneContext): void {
    const g = ctx.renderer.ctx;
    const p = this.theme.palette;
    this.bg.draw(g);

    // 章題
    drawText(g, `${this.story.chapter}`, VIRTUAL_W / 2, 40, {
      size: 14,
      color: shade(p, 2),
      align: "center",
      shadow: shade(p, 0),
    });
    drawText(g, `『${this.story.title}』`, VIRTUAL_W / 2, 58, {
      size: 28,
      color: shade(p, 3),
      align: "center",
      shadow: shade(p, 0),
      bold: true,
    });

    // 導入文（1行ずつ順に出現）
    this.story.intro.forEach((line, i) => {
      const appear = this.t - (0.6 + i * 0.9);
      if (appear <= 0) return;
      const idx = appear < 0.4 ? 1 : 2;
      drawText(g, line, VIRTUAL_W / 2, 118 + i * 22, {
        size: 15,
        color: shade(p, idx),
        align: "center",
        shadow: shade(p, 0),
      });
    });

    // 開始案内
    if (this.t > this.story.intro.length * 0.9 + 0.5 && Math.floor(this.t * 1.6) % 2 === 0) {
      drawText(g, "- キーで はじめる -", VIRTUAL_W / 2, VIRTUAL_H - 26, {
        size: 12,
        color: shade(p, 3),
        align: "center",
        shadow: shade(p, 0),
      });
    }
  }
}
