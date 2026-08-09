import type { Palette } from "../../core/Palette";

// 作品ごとに背景・アニメ・メーター・BGMを差し替えるテーマ層。
// 基本UI（バー・かな行・入力行）は共通のまま、世界観だけを丸ごと変える。

export interface ThemeBackdrop {
  /** intensity 0..1 = コンボ強度。背景の盛り上がりに連続作用。 */
  update(dt: number, intensity: number): void;
  draw(g: CanvasRenderingContext2D): void;
  /** ミス時などの一時的な揺らぎ演出。 */
  gust(): void;
  /**
   * 打鍵と同期した情景エフェクト（任意）。オノマトペ章のみ実装。
   * kind = 出題の fx 種別（wind/water/light 等）。
   */
  pulse?(kind?: string): void;
  /**
   * ステージ最終行クリア時の締め演出を起動（任意）。詩歌編で実装。
   * 起動後、背景が一度きりのクライマックスを再生する。
   */
  finale?(): void;
}

export interface SceneTheme {
  key: string;
  /** 4階調パレット（UI文字・かな行にも使用）。 */
  palette: Palette;
  /** 物語固有のアクセント色（星/溶岩/銀河 等）。 */
  accent: string;
  /** BGMトラックのキー（audio/tracks）。 */
  bgmKey: string;
  /** シーンごとに新しい背景インスタンスを生成。 */
  makeBackdrop(): ThemeBackdrop;
  /**
   * 右端の主役メーターを描く。progress 0..1。
   * 対象は作品で異なる（よだかの高度／噴煙／汽車の走行）。
   */
  drawMeter(g: CanvasRenderingContext2D, progress: number, t: number): void;
}
