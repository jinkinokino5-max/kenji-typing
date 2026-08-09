import type { Scene, SceneContext } from "../core/Scene";
import { VIRTUAL_W, VIRTUAL_H } from "../core/Renderer";
import { NIGHT, shade } from "../core/Palette";
import { NightBackdrop } from "../pixel/NightBackdrop";
import { drawText } from "../pixel/Text";
import { drawYodaka, flapFrame } from "../pixel/anim/Yodaka";
import { levelOf } from "../core/Storage";
import { EDITIONS, editionOfStory } from "../data/stories";
import { IntroScene } from "./IntroScene";
import { RecordsScene } from "./RecordsScene";
import { SettingsScene } from "./SettingsScene";
import { HowToScene } from "./HowToScene";
import { AdminGateScene } from "./AdminGateScene";
import { FeedbackScene } from "./FeedbackScene";
import { editModeEnabled } from "../config";
import { trackByKey } from "../audio/tracks";

type Zone = "chapter" | "feature";
// 「編集」は一般公開の画面には出さない。URL に ?edit=1 が付いたときだけ現れる。
const FEATURES: string[] = ["きろく", "せってい", "あそびかた", "ごいけん"];
if (editModeEnabled()) FEATURES.push("編集");
const PER_ROW = 3;
const COMING = "宮沢賢治の作品を、少しずつ増やしていきます";

// アプリ内ホーム＝「言葉の銀河ステーション」。
// 上部タブで編（物語編／詩歌編／特別編）を切替、選んだ編の章を縦に並べる。
export class HomeScene implements Scene {
  private bg = new NightBackdrop(true, NIGHT);
  private t = 0;
  private zone: Zone = "chapter";
  private ei = 0; // 編インデックス
  private ci = 0; // 編内の章インデックス
  private fi = 0; // 機能インデックス
  private scroll = 0; // 章リストのスクロール位置（先頭行）

  private readonly listTop = 66;
  private readonly rowH = 19;
  private readonly visibleRows = 5; // 一度に表示する章数（超過分はスクロール）

  /**
   * タイピングから戻ったとき等に、直前に選んでいた章へカーソルを合わせて開く。
   * 未指定時は先頭（物語編の1章目）から。
   */
  constructor(initialStoryKey?: string) {
    if (!initialStoryKey) return;
    const ed = editionOfStory(initialStoryKey);
    if (!ed) return;
    this.ei = EDITIONS.indexOf(ed);
    const idx = ed.stories.findIndex((s) => s.key === initialStoryKey);
    if (idx >= 0) this.ci = idx;
  }

  private get stories() {
    return EDITIONS[this.ei].stories;
  }

  enter(ctx: SceneContext): void {
    // タイピング中の章BGMから、タイトルと同じホームBGMへ戻す。
    ctx.audio.playBgm(trackByKey("yodaka"));
  }

  update(dt: number, ctx: SceneContext): void {
    this.t += dt;
    this.bg.update(dt, 0);
    const inp = ctx.input;
    const list = this.stories;

    if (inp.wasPressed("ArrowUp")) {
      if (this.zone === "feature") {
        if (this.fi >= PER_ROW) this.fi -= PER_ROW;
        else {
          this.zone = "chapter";
          this.ci = list.length - 1;
        }
      } else {
        this.ci = Math.max(0, this.ci - 1);
      }
    } else if (inp.wasPressed("ArrowDown")) {
      if (this.zone === "chapter") {
        if (this.ci < list.length - 1) this.ci++;
        else this.zone = "feature";
      } else if (this.fi + PER_ROW < FEATURES.length) {
        this.fi += PER_ROW;
      }
    } else if (inp.wasPressed("ArrowLeft")) {
      if (this.zone === "chapter") {
        this.ei = (this.ei - 1 + EDITIONS.length) % EDITIONS.length;
        this.ci = 0;
        this.scroll = 0;
      } else {
        this.fi = Math.max(0, this.fi - 1);
      }
    } else if (inp.wasPressed("ArrowRight")) {
      if (this.zone === "chapter") {
        this.ei = (this.ei + 1) % EDITIONS.length;
        this.ci = 0;
        this.scroll = 0;
      } else {
        this.fi = Math.min(FEATURES.length - 1, this.fi + 1);
      }
    } else if (inp.wasPressed("Enter") || inp.wasPressed(" ")) {
      this.select(ctx);
    }

    // 選択章が見える位置へスクロール窓を追従させる
    if (this.ci < this.scroll) this.scroll = this.ci;
    if (this.ci >= this.scroll + this.visibleRows) this.scroll = this.ci - this.visibleRows + 1;
  }

  private select(ctx: SceneContext): void {
    if (this.zone === "chapter") {
      ctx.go(new IntroScene(this.stories[this.ci]));
    } else {
      if (this.fi === 0) ctx.go(new RecordsScene());
      else if (this.fi === 1) ctx.go(new SettingsScene());
      else if (this.fi === 2) ctx.go(new HowToScene());
      else if (this.fi === 3) ctx.go(new FeedbackScene());
      else ctx.go(new AdminGateScene());
    }
  }

  draw(ctx: SceneContext): void {
    const g = ctx.renderer.ctx;
    this.bg.draw(g);
    const save = ctx.state.save;

    // 見出し
    drawText(g, "KENJI TYPING", VIRTUAL_W / 2, 8, {
      size: 18,
      color: shade(NIGHT, 3),
      align: "center",
      shadow: shade(NIGHT, 0),
      bold: true,
    });
    drawText(g, `Lv.${levelOf(save.totalKeys)}  KP ${save.kp}`, VIRTUAL_W - 8, 10, {
      size: 11,
      color: shade(NIGHT, 2),
      align: "right",
    });

    // 編タブ
    this.drawTabs(g);
    // 編のサブタイトル
    drawText(g, `── ${EDITIONS[this.ei].subtitle} ──`, VIRTUAL_W / 2, 50, {
      size: 10,
      color: shade(NIGHT, 2),
      align: "center",
      shadow: shade(NIGHT, 0),
    });

    // 章一覧（駅めぐり）— visibleRows ぶんの窓をスクロール表示
    const winStories = this.stories.slice(this.scroll, this.scroll + this.visibleRows);
    winStories.forEach((s, row) => {
      const i = this.scroll + row;
      const y = this.listTop + row * this.rowH;
      const selected = this.zone === "chapter" && this.ci === i;
      const rec = save.perStory[s.key];
      if (selected) {
        g.fillStyle = shade(NIGHT, 1);
        g.fillRect(40, y - 2, VIRTUAL_W - 80, this.rowH - 2);
        drawYodaka(g, 34, y + 6, flapFrame(this.t, 8), NIGHT, 2, 3);
      }
      const main = selected ? this.accent() : shade(NIGHT, rec ? 3 : 2);
      g.fillStyle = rec ? "#9fc7ff" : shade(NIGHT, 2);
      if (rec) {
        g.fillRect(50, y + 6, 3, 1);
        g.fillRect(51, y + 4, 1, 5);
        g.fillRect(49, y + 5, 5, 1);
      } else {
        g.fillRect(50, y + 5, 3, 3);
      }
      drawText(g, `${s.chapter}  ${s.title}`, 62, y, {
        size: 13,
        color: main,
        shadow: shade(NIGHT, 0),
      });
      drawText(g, "★".repeat(s.difficulty), 300, y + 1, {
        size: 10,
        color: shade(NIGHT, 2),
      });
      drawText(g, rec ? rec.rank : "-", 388, y, {
        size: 13,
        color: main,
        align: "right",
      });
      drawText(g, `${rec ? rec.readRate : 0}%`, VIRTUAL_W - 46, y, {
        size: 12,
        color: shade(NIGHT, 2),
        align: "right",
      });
    });

    // スクロール矛先（窓の外にまだ章がある方向を示す）
    if (this.scroll > 0) {
      drawText(g, "▲", VIRTUAL_W / 2, this.listTop - 9, {
        size: 9,
        color: shade(NIGHT, 2),
        align: "center",
      });
    }
    if (this.scroll + this.visibleRows < this.stories.length) {
      drawText(g, "▼", VIRTUAL_W / 2, this.listTop + this.visibleRows * this.rowH - 3, {
        size: 9,
        color: shade(NIGHT, 2),
        align: "center",
      });
    }

    // 区切り（窓の表示行数ぶんで固定＝章が増えても下部レイアウトは不動）
    const sepY = this.listTop + Math.min(this.stories.length, this.visibleRows) * this.rowH + 8;
    g.fillStyle = shade(NIGHT, 1);
    g.fillRect(40, sepY, VIRTUAL_W - 80, 1);

    // 機能ボタン（PER_ROW 個ごとに折り返し）
    const fy = sepY + 12;
    const gap = 130;
    const rowGap = 17;
    FEATURES.forEach((label, i) => {
      const row = Math.floor(i / PER_ROW);
      const col = i % PER_ROW;
      const cols = Math.min(PER_ROW, FEATURES.length - row * PER_ROW);
      const startX = VIRTUAL_W / 2 - ((cols - 1) * gap) / 2;
      const x = startX + col * gap;
      const y = fy + row * rowGap;
      const selected = this.zone === "feature" && this.fi === i;
      const text = selected ? `[ ${label} ]` : label;
      drawText(g, text, x, y, {
        size: 13,
        color: selected ? this.accent() : shade(NIGHT, 2),
        align: "center",
        shadow: shade(NIGHT, 0),
      });
    });
    const rows = Math.ceil(FEATURES.length / PER_ROW);
    drawText(g, COMING, VIRTUAL_W / 2, fy + rows * rowGap + 2, {
      size: 10,
      color: shade(NIGHT, 1),
      align: "center",
    });

    // 操作ヒント
    const hint =
      this.zone === "chapter" ? "◀▶ 編   ▲▼ 章   Enter きめる" : "▲▼◀▶ えらぶ   Enter きめる";
    drawText(g, hint, VIRTUAL_W / 2, VIRTUAL_H - 14, {
      size: 11,
      color: shade(NIGHT, 2),
      align: "center",
      shadow: shade(NIGHT, 0),
    });
  }

  private drawTabs(g: CanvasRenderingContext2D): void {
    const gap = 108;
    const startX = VIRTUAL_W / 2 - ((EDITIONS.length - 1) * gap) / 2;
    EDITIONS.forEach((e, i) => {
      const x = startX + i * gap;
      const cur = i === this.ei;
      const label = cur ? `‹ ${e.label} ›` : e.label;
      drawText(g, label, x, 28, {
        size: 13,
        color: cur ? this.accent() : shade(NIGHT, 2),
        align: "center",
        shadow: shade(NIGHT, 0),
        bold: cur,
      });
      // 現在編の下線
      if (cur) {
        g.fillStyle = "#9fc7ff";
        g.fillRect(x - 22, 44, 44, 1);
      }
    });
  }

  private accent(): string {
    return Math.floor(this.t * 3) % 2 === 0 ? "#9fc7ff" : shade(NIGHT, 3);
  }
}
