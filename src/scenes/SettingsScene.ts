import type { Scene, SceneContext } from "../core/Scene";
import { VIRTUAL_W, VIRTUAL_H } from "../core/Renderer";
import { NIGHT, shade } from "../core/Palette";
import { NightBackdrop } from "../pixel/NightBackdrop";
import { drawText } from "../pixel/Text";
import { setMuted, setOption, clearWeakKeys, type Options, type SaveData } from "../core/Storage";
import { HomeScene } from "./HomeScene";

// せってい画面：プレイ中の補助表示と音のON/OFF。
// ↑↓で項目を選び、←→/Enter で切り替える。

interface Item {
  label: string;
  hint: string;
  /** 現在の状態を文字列で返す。 */
  value(s: SaveData): string;
  /** 切り替えた新しいセーブを返す。 */
  toggle(s: SaveData, ctx: SceneContext): SaveData;
}

function boolItem(
  key: keyof Options,
  label: string,
  hint: string,
  labels: [string, string] = ["OFF", "ON"],
): Item {
  return {
    label,
    hint,
    value: (s) => (s.options[key] ? labels[1] : labels[0]),
    toggle: (s) => setOption(s, key, !s.options[key]),
  };
}

const ITEMS: Item[] = [
  boolItem("showGuide", "ローマ字ガイド", "次に打つローマ字を、問題文の下に全部出す"),
  boolItem("showStats", "速度・正確率", "プレイ中に 打/秒 と 正確率 を出す"),
  boolItem("highContrast", "見やすさ優先", "背景を暗くして、文字をはっきりさせる"),
  {
    label: "おと（BGM・SE）",
    hint: "音楽と効果音を鳴らすかどうか",
    value: (s) => (s.muted ? "OFF" : "ON"),
    toggle: (s, ctx) => {
      ctx.audio.init();
      return setMuted(s, ctx.audio.toggleMute());
    },
  },
  {
    label: "苦手キーの記録",
    hint: "Enter で これまでのミス記録を消す",
    value: (s) => `${Object.keys(s.weakKeys).length} 種`,
    toggle: (s) => clearWeakKeys(s),
  },
];

const ROW_TOP = 40;
const ROW_H = 18;

export class SettingsScene implements Scene {
  private bg = new NightBackdrop(false, NIGHT);
  private t = 0;
  private index = 0;
  private flash = 0;

  update(dt: number, ctx: SceneContext): void {
    this.t += dt;
    this.bg.update(dt, 0);
    if (this.flash > 0) this.flash -= dt;
    const inp = ctx.input;
    if (this.t < 0.2) return;

    if (inp.wasPressed("ArrowUp")) {
      this.index = (this.index + ITEMS.length - 1) % ITEMS.length;
    } else if (inp.wasPressed("ArrowDown")) {
      this.index = (this.index + 1) % ITEMS.length;
    } else if (
      inp.wasPressed("Enter") ||
      inp.wasPressed(" ") ||
      inp.wasPressed("ArrowLeft") ||
      inp.wasPressed("ArrowRight")
    ) {
      ctx.state.save = ITEMS[this.index].toggle(ctx.state.save, ctx);
      this.flash = 0.3;
    } else if (inp.wasPressed("Escape") || inp.wasPressed("Backspace")) {
      ctx.go(new HomeScene());
    }
  }

  draw(ctx: SceneContext): void {
    const g = ctx.renderer.ctx;
    this.bg.draw(g);
    const s = ctx.state.save;

    drawText(g, "せってい", VIRTUAL_W / 2, 12, {
      size: 18,
      color: shade(NIGHT, 3),
      align: "center",
      shadow: shade(NIGHT, 0),
      bold: true,
    });

    ITEMS.forEach((item, i) => {
      const y = ROW_TOP + i * ROW_H;
      const sel = i === this.index;
      const color = sel ? "#9fc7ff" : shade(NIGHT, 3);
      drawText(g, `${sel ? "▶" : " "} ${item.label}`, 40, y, {
        size: 13,
        color,
        shadow: shade(NIGHT, 0),
        bold: sel,
      });
      const val = item.value(s);
      drawText(g, `[ ${val} ]`, 300, y, {
        size: 13,
        color: sel && this.flash > 0 ? "#ffffff" : color,
        bold: true,
        shadow: shade(NIGHT, 0),
      });
    });

    // 選択中の項目の説明
    drawText(g, ITEMS[this.index].hint, VIRTUAL_W / 2, ROW_TOP + ITEMS.length * ROW_H + 4, {
      size: 11,
      color: shade(NIGHT, 2),
      align: "center",
    });

    drawText(g, "↑↓ えらぶ / Enter・←→ きりかえ / Esc もどる", VIRTUAL_W / 2, VIRTUAL_H - 16, {
      size: 11,
      color: shade(NIGHT, 3),
      align: "center",
      shadow: shade(NIGHT, 0),
    });
  }
}
