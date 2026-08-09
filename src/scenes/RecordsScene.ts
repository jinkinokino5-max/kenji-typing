import type { Scene, SceneContext } from "../core/Scene";
import { VIRTUAL_W, VIRTUAL_H } from "../core/Renderer";
import { NIGHT, shade } from "../core/Palette";
import { NightBackdrop } from "../pixel/NightBackdrop";
import { drawText, fitText, measureText } from "../pixel/Text";
import { levelOf, weakKeyRanking } from "../core/Storage";
import { EDITIONS } from "../data/stories";
import type { Story } from "../data/story";
import { HomeScene } from "./HomeScene";

// きろく画面：レベル・KP・作品別ランク（編ごと）・苦手キー・獲得バッジ。

/** 1カラムに積む行（見出し or 作品）。 */
type Row = { kind: "head"; label: string } | { kind: "story"; story: Story };

const COL_X = [8, 168, 328];
const COL_W = 144;
const LINE_H = 13;
const LIST_TOP = 60;

/** 章が多い詩歌編は2カラムに割り、画面外へはみ出さないようにする。 */
function buildColumns(): Row[][] {
  const [story, poem, special] = EDITIONS;
  const cols: Row[][] = [[], [], []];
  cols[0].push({ kind: "head", label: story.label });
  for (const s of story.stories) cols[0].push({ kind: "story", story: s });
  if (special) {
    cols[0].push({ kind: "head", label: special.label });
    for (const s of special.stories) cols[0].push({ kind: "story", story: s });
  }
  const half = Math.ceil(poem.stories.length / 2);
  cols[1].push({ kind: "head", label: `${poem.label} (1)` });
  for (const s of poem.stories.slice(0, half)) cols[1].push({ kind: "story", story: s });
  cols[2].push({ kind: "head", label: `${poem.label} (2)` });
  for (const s of poem.stories.slice(half)) cols[2].push({ kind: "story", story: s });
  return cols;
}

export class RecordsScene implements Scene {
  private bg = new NightBackdrop(false, NIGHT);
  private t = 0;
  private readonly columns = buildColumns();

  update(dt: number, ctx: SceneContext): void {
    this.t += dt;
    this.bg.update(dt, 0);
    if (this.t > 0.3 && ctx.input.anyPressed()) ctx.go(new HomeScene());
  }

  draw(ctx: SceneContext): void {
    const g = ctx.renderer.ctx;
    this.bg.draw(g);
    const s = ctx.state.save;

    drawText(g, "きろく", VIRTUAL_W / 2, 6, {
      size: 18,
      color: shade(NIGHT, 3),
      align: "center",
      shadow: shade(NIGHT, 0),
      bold: true,
    });

    // 上部サマリー（2行）
    drawText(g, `Lv.${levelOf(s.totalKeys)}    文学知識KP ${s.kp}`, VIRTUAL_W / 2, 28, {
      size: 12,
      color: shade(NIGHT, 3),
      align: "center",
    });
    drawText(g, `総打鍵 ${s.totalKeys}    最高 ${s.bestScore} (${s.bestRank})`, VIRTUAL_W / 2, 42, {
      size: 11,
      color: shade(NIGHT, 2),
      align: "center",
    });

    // 作品別ランク（3カラム）
    this.columns.forEach((rows, ci) => {
      const x = COL_X[ci];
      let y = LIST_TOP;
      for (const row of rows) {
        if (row.kind === "head") {
          drawText(g, `── ${row.label} ──`, x, y, {
            size: 10,
            color: "#9fc7ff",
            shadow: shade(NIGHT, 0),
          });
        } else {
          const rec = s.perStory[row.story.key];
          const right = rec ? `${rec.rank} ${rec.readRate}%` : "未挑戦";
          // 長い章題はランク表示にぶつかる前で切り詰める。
          const avail = COL_W - 6 - measureText(g, right, 10) - 4;
          drawText(g, fitText(g, row.story.title, 10, avail), x + 6, y, {
            size: 10,
            color: shade(NIGHT, 3),
          });
          drawText(g, right, x + COL_W, y, {
            size: 10,
            color: rec ? shade(NIGHT, 3) : shade(NIGHT, 1),
            align: "right",
          });
        }
        y += LINE_H;
      }
    });

    // 苦手キー（累積）。次に何を練習すべきかを1行で示す。
    const weak = weakKeyRanking(s, 6);
    const weakText = weak.length
      ? weak.map((w) => `${w.key.toUpperCase()}×${w.count}`).join("   ")
      : "まだありません";
    drawText(g, "◆ 苦手キー", 8, VIRTUAL_H - 52, {
      size: 11,
      color: "#9fc7ff",
      shadow: shade(NIGHT, 0),
    });
    // 背景（丘）に重なる位置なので、影を付けて読めるようにする。
    drawText(g, weakText, 78, VIRTUAL_H - 52, {
      size: 11,
      color: shade(NIGHT, weak.length ? 3 : 2),
      shadow: shade(NIGHT, 0),
    });

    // バッジ
    const badges = s.badges.length ? s.badges.join(" / ") : "まだありません";
    drawText(g, "★ バッジ", 8, VIRTUAL_H - 36, {
      size: 11,
      color: "#9fc7ff",
      shadow: shade(NIGHT, 0),
    });
    drawText(g, badges, 78, VIRTUAL_H - 36, {
      size: 11,
      color: shade(NIGHT, s.badges.length ? 3 : 2),
      shadow: shade(NIGHT, 0),
    });

    if (Math.floor(this.t * 1.6) % 2 === 0) {
      drawText(g, "- キーで もどる -", VIRTUAL_W / 2, VIRTUAL_H - 16, {
        size: 11,
        color: shade(NIGHT, 3),
        align: "center",
      });
    }
  }
}
