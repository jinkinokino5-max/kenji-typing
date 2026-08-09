import type { Palette } from "../../core/Palette";
import { shade } from "../../core/Palette";

// よだか（夜鷹）のドット絵。素朴な3フレームの羽ばたき。
// 上昇＝『よだかの星』の結末（星になる）を体験に接続する主役スプライト。

/**
 * (cx, cy) を胴中心として羽ばたくよだかを描く。
 * @param frame 0,1,2 の羽ばたきフレーム
 * @param s ドットの拡大率（1=等倍）
 */
export function drawYodaka(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  frame: number,
  p: Palette,
  s = 2,
  colorIndex = 3,
): void {
  const body = shade(p, colorIndex);
  const edge = shade(p, Math.max(0, colorIndex - 2));
  const px = (dx: number, dy: number, c: string) => {
    ctx.fillStyle = c;
    ctx.fillRect(Math.round(cx + dx * s), Math.round(cy + dy * s), s, s);
  };

  // 胴と頭
  px(0, 0, body);
  px(1, 0, body);
  px(-1, 0, body);
  px(2, 0, edge); // くちばし方向
  px(0, 1, edge);

  // 翼（フレームで上下）
  const wy = frame === 0 ? 0 : frame === 1 ? -1 : -2;
  const wy2 = wy - 1;
  // 左翼
  px(-2, wy, body);
  px(-3, wy2, body);
  px(-4, wy2, edge);
  // 右翼
  px(3, wy, body);
  px(4, wy2, body);
  px(5, wy2, edge);
}

/** t(秒) から羽ばたきフレームを得る。 */
export function flapFrame(t: number, speed = 6): number {
  return Math.floor(t * speed) % 3;
}
