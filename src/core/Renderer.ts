// 160x144 の仮想画面を確立し、整数倍で拡大表示する。
// すべての描画はこの仮想解像度で行い、ピクセルをぼかさない。

// PC利用に最適な 16:9 のドット絵解像度。
// ピクセルの粒立ちは保ちつつ、日本語の出題文が横1行に収まる広さを確保。
export const VIRTUAL_W = 480;
export const VIRTUAL_H = 270;

export class Renderer {
  readonly ctx: CanvasRenderingContext2D;
  private canvas: HTMLCanvasElement;
  scale = 1;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    canvas.width = VIRTUAL_W;
    canvas.height = VIRTUAL_H;
    const ctx = canvas.getContext("2d", { alpha: false });
    if (!ctx) throw new Error("2D context を取得できませんでした");
    this.ctx = ctx;
    this.ctx.imageSmoothingEnabled = false;
    this.fit();
    window.addEventListener("resize", () => this.fit());
  }

  /** ウィンドウに収まる最大の整数倍を計算し、CSSサイズへ反映。 */
  fit(): void {
    const margin = 32;
    const maxW = window.innerWidth - margin;
    const maxH = window.innerHeight - margin;
    const s = Math.max(1, Math.floor(Math.min(maxW / VIRTUAL_W, maxH / VIRTUAL_H)));
    this.scale = s;
    this.canvas.style.width = `${VIRTUAL_W * s}px`;
    this.canvas.style.height = `${VIRTUAL_H * s}px`;
  }

  clear(color: string): void {
    this.ctx.fillStyle = color;
    this.ctx.fillRect(0, 0, VIRTUAL_W, VIRTUAL_H);
  }
}
