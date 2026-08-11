// 画素を実際に持つ、ごく小さなキャンバス実装。
//
// 背景（src/pixel/anim/*）は 1つを除いてすべて fillRect だけで描かれているので、
// fillRect のアルファ合成さえ正しく実装すれば、ブラウザを起動しなくても
// 「実際に何色が塗られたか」を Node 上で再現できる。
// コントラスト検査（tests/contrast.test.ts）が使う。
//
// 対応していない命令（線・円・画像・文字）は、背景の描画には出てこないため
// 何もしない。translate だけは GingaBackdrop が使うので平行移動を持つ。

export interface PixelCanvas {
  ctx: CanvasRenderingContext2D;
  /** (x, y) の RGB を返す。 */
  get(x: number, y: number): [number, number, number];
  width: number;
  height: number;
}

function parseColor(c: string): [number, number, number] {
  const h = c.trim();
  if (h.startsWith("#")) {
    const s = h.slice(1);
    if (s.length === 3) {
      return [
        parseInt(s[0] + s[0], 16),
        parseInt(s[1] + s[1], 16),
        parseInt(s[2] + s[2], 16),
      ];
    }
    return [
      parseInt(s.slice(0, 2), 16),
      parseInt(s.slice(2, 4), 16),
      parseInt(s.slice(4, 6), 16),
    ];
  }
  const m = h.match(/rgba?\(([^)]+)\)/);
  if (m) {
    const parts = m[1].split(",").map((v) => parseFloat(v));
    return [parts[0] | 0, parts[1] | 0, parts[2] | 0];
  }
  return [0, 0, 0];
}

export function makePixelCanvas(width: number, height: number): PixelCanvas {
  const buf = new Uint8ClampedArray(width * height * 3);
  let fillStyle = "#000000";
  let globalAlpha = 1;
  let tx = 0;
  let ty = 0;
  const stack: Array<[number, number]> = [];

  const ctx = {
    get fillStyle() {
      return fillStyle;
    },
    set fillStyle(v: string) {
      fillStyle = v;
    },
    get globalAlpha() {
      return globalAlpha;
    },
    set globalAlpha(v: number) {
      globalAlpha = v;
    },
    strokeStyle: "#000",
    lineWidth: 1,
    lineJoin: "round",
    miterLimit: 10,
    font: "10px sans-serif",
    textAlign: "left",
    textBaseline: "top",
    imageSmoothingEnabled: false,
    filter: "none",
    save() {
      stack.push([tx, ty]);
    },
    restore() {
      const s = stack.pop();
      if (s) [tx, ty] = s;
    },
    translate(x: number, y: number) {
      tx += x;
      ty += y;
    },
    fillRect(x: number, y: number, w: number, h: number) {
      const [r, g, b] = parseColor(fillStyle);
      const a = Math.max(0, Math.min(1, globalAlpha));
      if (a === 0) return;
      const x0 = Math.max(0, Math.round(x + tx));
      const y0 = Math.max(0, Math.round(y + ty));
      const x1 = Math.min(width, Math.round(x + tx + w));
      const y1 = Math.min(height, Math.round(y + ty + h));
      for (let yy = y0; yy < y1; yy++) {
        for (let xx = x0; xx < x1; xx++) {
          const i = (yy * width + xx) * 3;
          buf[i] = buf[i] * (1 - a) + r * a;
          buf[i + 1] = buf[i + 1] * (1 - a) + g * a;
          buf[i + 2] = buf[i + 2] * (1 - a) + b * a;
        }
      }
    },
    // 背景の描画には出てこない命令。呼ばれても落ちないように受け流す。
    beginPath() {}, closePath() {}, moveTo() {}, lineTo() {}, arc() {}, rect() {},
    fill() {}, stroke() {}, clip() {}, rotate() {}, scale() {}, setTransform() {},
    strokeRect() {}, clearRect() {}, drawImage() {}, putImageData() {},
    fillText() {}, strokeText() {},
    measureText: (t: string) => ({ width: t.length * 8 }),
    createLinearGradient: () => ({ addColorStop() {} }),
    createRadialGradient: () => ({ addColorStop() {} }),
  };

  return {
    ctx: ctx as unknown as CanvasRenderingContext2D,
    width,
    height,
    get(x, y) {
      const i = (y * width + x) * 3;
      return [buf[i], buf[i + 1], buf[i + 2]];
    },
  };
}
