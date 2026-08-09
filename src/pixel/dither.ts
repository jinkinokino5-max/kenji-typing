// 4x4 ベイヤーディザ。2色の中間調をGBらしい網点で表現する。

const BAYER4 = [
  [0, 8, 2, 10],
  [12, 4, 14, 6],
  [3, 11, 1, 9],
  [15, 7, 13, 5],
];

/** (x,y) で threshold(0..1) 未満なら true（濃い側を打つ）。 */
export function ditherOn(x: number, y: number, threshold: number): boolean {
  const t = (BAYER4[y & 3][x & 3] + 0.5) / 16;
  return threshold > t;
}

/**
 * 矩形を2色でディザ塗り。level 0..1 で dark→light の混合比。
 */
export function fillDither(
  ctx: CanvasRenderingContext2D,
  rx: number,
  ry: number,
  rw: number,
  rh: number,
  dark: string,
  light: string,
  level: number,
): void {
  for (let y = 0; y < rh; y++) {
    for (let x = 0; x < rw; x++) {
      ctx.fillStyle = ditherOn(rx + x, ry + y, level) ? light : dark;
      ctx.fillRect(rx + x, ry + y, 1, 1);
    }
  }
}
