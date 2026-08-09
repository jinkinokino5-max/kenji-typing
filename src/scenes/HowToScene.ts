import type { Scene, SceneContext } from "../core/Scene";
import { VIRTUAL_W, VIRTUAL_H } from "../core/Renderer";
import { NIGHT, shade } from "../core/Palette";
import { NightBackdrop } from "../pixel/NightBackdrop";
import { drawText } from "../pixel/Text";
import { HomeScene } from "./HomeScene";

// あそびかた画面：2ページ構成。←→ でページ送り、Esc/Enter でもどる。
type Page = { title: string; lines: Array<[string, string]> };

const PAGES: Page[] = [
  {
    title: "あそびかた",
    lines: [
      ["ローマ字で うつ", "ひらがなを ローマ字で入力。りんご → ringo"],
      ["打ち方は 自由", "し=shi/si/ci、ちょ=cho/tyo/cyo、つ=tsu/tu"],
      ["ん・っ", "ん=nn/n（母音・な行・語末の前は nn）、っ=次の子音を重ねる"],
      ["こまったら", "画面下のローマ字ガイドを見ながら打つ（せっていで消せる）"],
      ["ポーズ", "Esc で ひとやすみ。つづける / 最初から / もどる"],
    ],
  },
  {
    title: "もっと知る",
    lines: [
      ["昔のかなづかい", "ゐる=wiru でも iru でもOK。さう=sau でも sou でもOK"],
      ["ハ行の読み替え", "おまへ=omahe / omae、こひ=kohi / koi のどちらも通る"],
      ["拗音は 分けても可", "きょう=kyou でも ki+lyo+u（kilyou）でも通る"],
      ["コンボ", "ミスせず打つほど 背景と音楽が 盛り上がる"],
      ["苦手キー", "ミスしたキーを記録。きろく画面で確認できる"],
    ],
  },
  {
    title: "この作品について",
    lines: [
      ["本文", "宮沢賢治（1896-1933）の作品。著作権は満了しています"],
      ["底本", "青空文庫（aozora.gr.jp）の公開テキスト"],
      ["表記", "本文は原典どおり。旧かなづかいもそのまま残しています"],
      ["物語編", "原文から、印象的な一節を抜き出しています"],
      ["詩歌編", "原則は全文。長い詩のみ中盤を省略しています"],
    ],
  },
];

export class HowToScene implements Scene {
  private bg = new NightBackdrop(true, NIGHT);
  private t = 0;
  private page = 0;

  update(dt: number, ctx: SceneContext): void {
    this.t += dt;
    this.bg.update(dt, 0);
    if (this.t < 0.3) return;
    const inp = ctx.input;
    if (inp.wasPressed("ArrowRight") || inp.wasPressed("ArrowDown")) {
      this.page = Math.min(PAGES.length - 1, this.page + 1);
    } else if (inp.wasPressed("ArrowLeft") || inp.wasPressed("ArrowUp")) {
      this.page = Math.max(0, this.page - 1);
    } else if (inp.wasPressed("Escape") || inp.wasPressed("Enter") || inp.wasPressed(" ")) {
      ctx.go(new HomeScene());
    }
  }

  draw(ctx: SceneContext): void {
    const g = ctx.renderer.ctx;
    this.bg.draw(g);
    const page = PAGES[this.page];

    drawText(g, page.title, VIRTUAL_W / 2, 12, {
      size: 19,
      color: shade(NIGHT, 3),
      align: "center",
      shadow: shade(NIGHT, 0),
      bold: true,
    });
    drawText(g, `${this.page + 1} / ${PAGES.length}`, VIRTUAL_W - 12, 14, {
      size: 11,
      color: shade(NIGHT, 2),
      align: "right",
    });

    page.lines.forEach(([head, body], i) => {
      const y = 46 + i * 34;
      drawText(g, `◆ ${head}`, 34, y, {
        size: 13,
        color: "#9fc7ff",
        shadow: shade(NIGHT, 0),
      });
      drawText(g, body, 50, y + 15, {
        size: 11,
        color: shade(NIGHT, 3),
        shadow: shade(NIGHT, 0),
      });
    });

    if (Math.floor(this.t * 1.6) % 2 === 0) {
      drawText(g, "←→ ページ / Enter・Esc でもどる", VIRTUAL_W / 2, VIRTUAL_H - 16, {
        size: 11,
        color: shade(NIGHT, 3),
        align: "center",
        shadow: shade(NIGHT, 0),
      });
    }
  }
}
