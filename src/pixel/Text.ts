// 低解像度キャンバスへ日本語テキストを描く。
// 160x144 の native 解像度で描画 → 整数倍拡大時にドット状にゴツくなり、
// 漢字を含む題字でも擬似ビットマップ風のGB質感になる。

export type Align = "left" | "center" | "right";

export interface TextStyle {
  size: number; // px（仮想解像度基準）
  color: string;
  align?: Align;
  /** 1pxずらしの影色（GBの縁取り風）。省略で影なし。 */
  shadow?: string;
  /** 等幅寄りの素朴なフォント。 */
  bold?: boolean;
}

const FONT_STACK =
  '"MS Gothic", "Hiragino Kaku Gothic ProN", "Yu Gothic", "Noto Sans JP", monospace';

export function drawText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  style: TextStyle,
): void {
  ctx.save();
  ctx.textBaseline = "top";
  ctx.textAlign = style.align ?? "left";
  ctx.font = `${style.bold ? "bold " : ""}${style.size}px ${FONT_STACK}`;
  if (style.shadow) {
    ctx.fillStyle = style.shadow;
    ctx.fillText(text, x + 1, y + 1);
  }
  ctx.fillStyle = style.color;
  ctx.fillText(text, x, y);
  ctx.restore();
}

/** フォント設定を適用してテキスト幅(px)を測る。 */
export function measureText(
  ctx: CanvasRenderingContext2D,
  text: string,
  size: number,
  bold = false,
): number {
  ctx.save();
  ctx.font = `${bold ? "bold " : ""}${size}px ${FONT_STACK}`;
  const w = ctx.measureText(text).width;
  ctx.restore();
  return w;
}

/** maxWidth に収まるよう末尾を切り詰める（切ったときは … を付ける）。 */
export function fitText(
  ctx: CanvasRenderingContext2D,
  text: string,
  size: number,
  maxWidth: number,
  bold = false,
): string {
  if (measureText(ctx, text, size, bold) <= maxWidth) return text;
  const chars = [...text];
  let out = "";
  for (let i = 0; i < chars.length; i++) {
    const test = out + chars[i] + "…";
    if (measureText(ctx, test, size, bold) > maxWidth) break;
    out += chars[i];
  }
  return out === "" ? "" : out + "…";
}

/** maxWidth で折り返して各行を返す（日本語は文字単位で折る）。 */
export function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  size: number,
  maxWidth: number,
  bold = false,
): string[] {
  const lines: string[] = [];
  let line = "";
  for (const ch of text) {
    if (ch === "\n") {
      lines.push(line);
      line = "";
      continue;
    }
    const test = line + ch;
    if (measureText(ctx, test, size, bold) > maxWidth && line !== "") {
      lines.push(line);
      line = ch;
    } else {
      line = test;
    }
  }
  if (line !== "") lines.push(line);
  return lines;
}
