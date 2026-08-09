import type { Scene, SceneContext } from "../core/Scene";
import { VIRTUAL_W, VIRTUAL_H } from "../core/Renderer";
import { shade } from "../core/Palette";
import type { SceneTheme, ThemeBackdrop } from "../pixel/theme/SceneTheme";
import { themeForStory } from "../pixel/theme/themes";
import { drawText } from "../pixel/Text";
import { HomeScene } from "./HomeScene";
import { GameScene } from "./GameScene";
import { IntroScene } from "./IntroScene";
import { storyByKey, nextStory } from "../data/stories";

// リザルト画面。主役が成就し（星化／到着 等）、章の世界のまま結果を見せる。
export class ResultScene implements Scene {
  private theme: SceneTheme = themeForStory("yodaka");
  private bg: ThemeBackdrop = this.theme.makeBackdrop();
  private t = 0;

  enter(ctx: SceneContext): void {
    const o = ctx.state.lastOutcome;
    this.theme = themeForStory(o?.storyKey ?? "yodaka");
    this.bg = this.theme.makeBackdrop();
  }

  update(dt: number, ctx: SceneContext): void {
    this.t += dt;
    // 成就の余韻として背景を最大強度で盛り上げる
    this.bg.update(dt, 1);
    if (this.t < 0.6) return;
    const o = ctx.state.lastOutcome;
    const next = o ? nextStory(o.storyKey) : null;
    if (next && (ctx.input.wasPressed("n") || ctx.input.wasPressed("N"))) {
      ctx.go(new IntroScene(next));
    } else if (ctx.input.wasPressed("Enter") || ctx.input.wasPressed(" ")) {
      ctx.go(new HomeScene(o?.storyKey));
    } else if (ctx.input.wasPressed("r") || ctx.input.wasPressed("R")) {
      const cur = o ? storyByKey(o.storyKey) : null;
      if (cur) ctx.go(new GameScene(cur));
    }
  }

  draw(ctx: SceneContext): void {
    const g = ctx.renderer.ctx;
    const p = this.theme.palette;
    this.bg.draw(g);
    const o = ctx.state.lastOutcome;

    // 主役の成就（またたく大きな星）。色は章のアクセント。
    this.drawBigStar(g, VIRTUAL_W / 2, 44);

    drawText(g, "STAGE COMPLETE", VIRTUAL_W / 2, 66, {
      size: 22,
      color: shade(p, 3),
      align: "center",
      shadow: shade(p, 0),
      bold: true,
    });

    if (!o) {
      drawText(g, "記録がありません", VIRTUAL_W / 2, 120, {
        size: 14,
        color: shade(p, 2),
        align: "center",
      });
      return;
    }

    drawText(g, `『${o.storyTitle}』`, VIRTUAL_W / 2, 92, {
      size: 14,
      color: shade(p, 2),
      align: "center",
    });

    drawText(g, `${o.total}`, VIRTUAL_W / 2 - 30, 112, {
      size: 30,
      color: shade(p, 3),
      align: "right",
      bold: true,
      shadow: shade(p, 0),
    });
    drawText(g, `RANK ${o.rank}`, VIRTUAL_W / 2 + 10, 118, {
      size: 20,
      color: shade(p, 3),
      align: "left",
      bold: true,
      shadow: shade(p, 0),
    });

    // 左右2列に指標を並べる（縦に伸ばしすぎない）。
    const left = [
      `正答数    ${o.correctQuestions} / ${o.totalQuestions}`,
      `正確率    ${o.keyAccuracyPct}%`,
      `打鍵速度  ${o.keysPerSec.toFixed(1)} 打/秒`,
    ];
    const right = [
      `総打鍵    ${o.totalKeys}`,
      `最大コンボ ${o.maxCombo}`,
      `読破率    ${o.readRate}%`,
    ];
    left.forEach((l, i) => {
      drawText(g, l, 62, 148 + i * 15, { size: 12, color: shade(p, 2) });
    });
    right.forEach((l, i) => {
      drawText(g, l, 262, 148 + i * 15, { size: 12, color: shade(p, 2) });
    });

    // 苦手キー：次に何を練習すべきかを具体的に示す。
    const weak = Object.entries(o.missByKey)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);
    const weakText =
      weak.length > 0
        ? `苦手キー  ${weak.map(([k, n]) => `${k.toUpperCase()}×${n}`).join("  ")}`
        : "苦手キー  なし（ノーミス！）";
    drawText(g, weakText, VIRTUAL_W / 2, 196, {
      size: 12,
      color: weak.length > 0 ? shade(p, 3) : this.theme.accent,
      align: "center",
      shadow: shade(p, 0),
    });

    if (o.badges.length > 0) {
      drawText(g, `★ バッジ獲得: ${o.badges.join(" / ")}`, VIRTUAL_W / 2, 213, {
        size: 12,
        color: this.theme.accent,
        align: "center",
        shadow: shade(p, 0),
      });
    }

    if (Math.floor(this.t * 1.6) % 2 === 0) {
      const next = nextStory(o.storyKey);
      const guide = next
        ? "[N] つぎの章へ   [R] リトライ   [ENTER] ホーム"
        : "この編クリア！   [R] リトライ   [ENTER] ホーム";
      drawText(g, guide, VIRTUAL_W / 2, VIRTUAL_H - 22, {
        size: 12,
        color: shade(p, 3),
        align: "center",
        shadow: shade(p, 0),
      });
    }
  }

  private drawBigStar(g: CanvasRenderingContext2D, cx: number, cy: number): void {
    const tw = (Math.sin(this.t * 3) + 1) / 2;
    g.fillStyle = tw > 0.5 ? this.theme.accent : shade(this.theme.palette, 2);
    g.fillRect(cx - 1, cy - 1, 3, 3);
    const arm = 3 + Math.round(tw * 2);
    for (let i = 1; i <= arm; i++) {
      g.fillRect(cx, cy - 1 - i, 1, 1);
      g.fillRect(cx, cy + 1 + i, 1, 1);
      g.fillRect(cx - 1 - i, cy, 1, 1);
      g.fillRect(cx + 1 + i, cy, 1, 1);
    }
  }
}
