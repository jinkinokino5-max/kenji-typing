import type { Scene, SceneContext } from "../core/Scene";
import { VIRTUAL_W, VIRTUAL_H } from "../core/Renderer";
import { NIGHT, shade } from "../core/Palette";
import { NightBackdrop } from "../pixel/NightBackdrop";
import { drawText, fitText, measureText } from "../pixel/Text";
import { levelOf, weakKeyRanking } from "../core/Storage";
import { EDITIONS } from "../data/stories";
import { groupStories, type StoryGroup } from "../data/split";
import { HomeScene } from "./HomeScene";

// きろく画面：レベル・KP・作品別ランク（編ごと）・苦手キー・獲得バッジ。

/** 1カラムに積む行（見出し or 作品）。 */
type Row = { kind: "head"; label: string } | { kind: "story"; group: StoryGroup };

const COL_X = [8, 168, 328];
const COL_W = 144;
const LINE_H = 13;
const LIST_TOP = 60;

/** 1カラムに積める行数（下の「◆ 苦手キー」にぶつからない範囲）。 */
const CAP = Math.floor((VIRTUAL_H - 56 - LIST_TOP) / LINE_H);

/**
 * 編ごとの行（見出し＋章）を3カラムへ詰める。
 * ・現在のカラムに丸ごと入らない編は、次のカラムから始める。
 * ・1カラムに収まらない編だけ (1)(2) … と分割して続ける。
 * 章の分割（#1／#2…）で章数が増えても、画面外へはみ出さないようにするため
 * 固定の割り付けはせず、その時々の章数から組み立てる。
 */
function buildColumns(): Row[][] {
  const cols: Row[][] = [[], [], []];
  const heads: { row: { kind: "head"; label: string }; base: string; piece: number }[] = [];
  let ci = 0;
  for (const ed of EDITIONS) {
    const rest = groupStories(ed.stories);
    let piece = 0;
    while (rest.length > 0) {
      const last = ci >= cols.length - 1;
      const room = CAP - cols[ci].length - 1; // 見出し1行を除いた余り
      // 丸ごと入らないなら次のカラムへ送る（先頭が空のときは送らない）。
      if (piece === 0 && room < rest.length && cols[ci].length > 0 && !last) {
        ci++;
        continue;
      }
      if (room <= 0 && !last) {
        ci++;
        continue;
      }
      const take = last ? rest.splice(0) : rest.splice(0, Math.max(room, 1));
      piece++;
      const head = { kind: "head" as const, label: ed.label };
      heads.push({ row: head, base: ed.label, piece });
      cols[ci].push(head);
      for (const gp of take) cols[ci].push({ kind: "story", group: gp });
      if (rest.length > 0) ci++;
    }
  }
  // 分割された編にだけ (1)(2) を付ける。
  const total = new Map<string, number>();
  for (const h of heads) total.set(h.base, Math.max(total.get(h.base) ?? 0, h.piece));
  for (const h of heads) {
    if ((total.get(h.base) ?? 1) > 1) h.row.label = `${h.base} (${h.piece})`;
  }
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
          // 分割章は「#1…をいくつ終えたか」でまとめて1行に出す。
          const gp = row.group;
          const done = gp.parts.filter((p) => s.perStory[p.key]).length;
          const rec = gp.split ? undefined : s.perStory[gp.parts[0].key];
          const right = gp.split
            ? `${done}/${gp.parts.length}`
            : rec
              ? `${rec.rank} ${rec.readRate}%`
              : "未挑戦";
          const hasRec = gp.split ? done > 0 : !!rec;
          // 長い章題はランク表示にぶつかる前で切り詰める。
          const avail = COL_W - 6 - measureText(g, right, 10) - 4;
          drawText(g, fitText(g, gp.title, 10, avail), x + 6, y, {
            size: 10,
            color: shade(NIGHT, 3),
          });
          drawText(g, right, x + COL_W, y, {
            size: 10,
            color: hasRec ? shade(NIGHT, 3) : shade(NIGHT, 1),
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
