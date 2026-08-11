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

  /**
   * ウィンドウを埋めきる倍率を計算し、CSSサイズへ反映。
   *
   * 以前は整数倍へ切り捨てていたが、たとえば 1920x1080 のモニタでもブラウザのUI分だけ
   * 高さが足りず 3 倍止まりになり、画面の1/4以上が余白になっていた。
   * そこで基本は等倍未満の端数も許し、整数倍にごく近いときだけ整数へ寄せて
   * ドットの粒の大きさを揃える（16:9 の比は保つので上下または左右に帯は残る）。
   */
  fit(): void {
    // 画面下にリンクの帯を置いたので、ウィンドウ全体ではなく置き場の大きさに合わせる。
    const box = this.canvas.parentElement;
    const availW = box?.clientWidth || window.innerWidth;
    const availH = box?.clientHeight || window.innerHeight;
    const exact = Math.min(availW / VIRTUAL_W, availH / VIRTUAL_H);
    const near = Math.round(exact);
    const snap = near >= 1 && Math.abs(exact - near) <= near * 0.02;
    const s = snap ? near : Math.max(1, exact);
    this.scale = s;
    // 小数倍のときは端をぼかさないよう、最終的なCSSピクセルは整数に丸める。
    this.canvas.style.width = `${Math.round(VIRTUAL_W * s)}px`;
    this.canvas.style.height = `${Math.round(VIRTUAL_H * s)}px`;
  }

  clear(color: string): void {
    this.ctx.fillStyle = color;
    this.ctx.fillRect(0, 0, VIRTUAL_W, VIRTUAL_H);
  }
}
