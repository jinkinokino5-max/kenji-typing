import type { Scene, SceneContext } from "../core/Scene";
import { VIRTUAL_W, VIRTUAL_H } from "../core/Renderer";
import { NIGHT, shade } from "../core/Palette";
import { drawText } from "../pixel/Text";
import { NightBackdrop } from "../pixel/NightBackdrop";
import { HomeScene } from "./HomeScene";

/**
 * 「このほしについて」— ゲームの中から読み物ページへ出るための案内所。
 *
 * 遊び方やプライバシーポリシーは HTML のページに置いてあるが、
 * サイトの入り口はこのゲームなので、ゲームの中にも扉が要る。
 * 別タブではなく同じタブで開く。ゲームの中の扉を通って別の部屋へ入り、
 * 各ページの「◀ ゲームにもどる」や Esc でここへ帰ってくる、という往復にする。
 */
interface Door {
  label: string;
  /** index.html から見た相対パス。 */
  path: string;
  hint: string;
}

const DOORS: Door[] = [
  { label: "あそびかた", path: "how-to-play/", hint: "操作・スコア・設定のすべて" },
  { label: "うちかたのコツ", path: "tips/", hint: "賢治の旧かなをどう打つか" },
  { label: "しゅうろく作品", path: "works/", hint: "全24章の一覧と難易度" },
  { label: "このゲームについて", path: "about/", hint: "作った理由と使った技術" },
  { label: "おといあわせ", path: "contact/", hint: "誤字の報告・ご感想" },
  { label: "プライバシーポリシー", path: "privacy/", hint: "記録と解析の取り扱い" },
];

const ROW_TOP = 62;
const ROW_H = 20;

export class GateScene implements Scene {
  private bg = new NightBackdrop(false, NIGHT);
  private t = 0;
  private index = 0;
  /** 遷移を要求した直後は入力を止める（二重に開かないため）。 */
  private leaving = false;

  update(dt: number, ctx: SceneContext): void {
    this.t += dt;
    this.bg.update(dt, 0);
    if (this.leaving) return;
    const inp = ctx.input;
    // 直前のキー入力が残っていることがあるので、開いた直後は受け付けない。
    if (this.t < 0.2) return;

    if (inp.wasPressed("ArrowUp")) {
      this.index = (this.index + DOORS.length - 1) % DOORS.length;
    } else if (inp.wasPressed("ArrowDown")) {
      this.index = (this.index + 1) % DOORS.length;
    } else if (inp.wasPressed("Escape")) {
      ctx.go(new HomeScene());
    } else if (inp.wasPressed("Enter") || inp.wasPressed(" ")) {
      this.open(DOORS[this.index].path);
    }
    inp.takeTyped();
  }

  /** 同じタブでページへ移動する。テスト環境には location が無いので握りつぶす。 */
  private open(path: string): void {
    this.leaving = true;
    try {
      location.href = path;
    } catch {
      /* テスト実行時は何もしない */
    }
  }

  draw(ctx: SceneContext): void {
    const g = ctx.renderer.ctx;
    this.bg.draw(g);

    // 読み物ページと同じ「枠付きウィンドウ」で見せる。
    const x = 40;
    const w = VIRTUAL_W - 80;
    const y = 40;
    const h = ROW_TOP - 40 + DOORS.length * ROW_H + 26;
    g.globalAlpha = 0.78;
    g.fillStyle = "#000000";
    g.fillRect(x, y, w, h);
    g.globalAlpha = 1;
    g.fillStyle = shade(NIGHT, 1);
    g.fillRect(x, y, w, 1);
    g.fillRect(x, y + h - 1, w, 1);

    drawText(g, "── このほしについて ──", VIRTUAL_W / 2, y + 8, {
      size: 13,
      color: shade(NIGHT, 3),
      align: "center",
      outline: shade(NIGHT, 0),
    });

    DOORS.forEach((d, i) => {
      const sel = i === this.index;
      drawText(g, `${sel ? "▶ " : "  "}${d.label}`, x + 24, ROW_TOP + i * ROW_H, {
        size: 13,
        color: sel ? "#9fc7ff" : shade(NIGHT, 2),
        outline: shade(NIGHT, 0),
      });
    });

    drawText(g, DOORS[this.index].hint, VIRTUAL_W / 2, y + h - 18, {
      size: 10,
      color: shade(NIGHT, 2),
      align: "center",
      outline: shade(NIGHT, 0),
    });

    drawText(g, "↑↓ えらぶ / Enter ひらく / Esc もどる", VIRTUAL_W / 2, VIRTUAL_H - 16, {
      size: 9,
      color: shade(NIGHT, 2),
      align: "center",
      outline: shade(NIGHT, 0),
    });
  }
}
