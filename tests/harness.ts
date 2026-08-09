// テスト共通の土台。
// ブラウザ API の最小モックと、描画呼び出しを記録する 2D コンテキストを提供する。
// 各シーンは canvas へ描くだけなので、これだけで実ブラウザ無しに検証できる。
// ※ src/ を import する前にこのモジュールを読み込むこと（グローバルを先に用意する）。

export interface TextDraw {
  text: string;
  left: number;
  right: number;
  top: number;
  bottom: number;
  /** 描画順（オーバーレイより後かの判定に使う）。 */
  seq: number;
}

export interface RectDraw {
  x: number;
  y: number;
  w: number;
  h: number;
  seq: number;
}

export interface Recorder {
  texts: TextDraw[];
  rects: RectDraw[];
  seq: number;
}

export let rec: Recorder = { texts: [], rects: [], seq: 0 };

export function resetRecorder(): void {
  rec = { texts: [], rects: [], seq: 0 };
}

/** 幅の近似：全角＝size、半角＝size*0.56。実フォントに近い比率。 */
export function widthOf(text: string, size: number): number {
  let w = 0;
  for (const ch of text) {
    const code = ch.codePointAt(0) ?? 0;
    w += code > 0x2000 ? size : size * 0.56;
  }
  return w;
}

export function makeCtx(): CanvasRenderingContext2D {
  let font = "10px sans-serif";
  let textAlign: CanvasTextAlign = "left";
  const size = () => parseFloat(font.replace(/^bold\s+/, "")) || 10;
  const ctx = {
    get font() {
      return font;
    },
    set font(v: string) {
      font = v;
    },
    get textAlign() {
      return textAlign;
    },
    set textAlign(v: CanvasTextAlign) {
      textAlign = v;
    },
    textBaseline: "top",
    fillStyle: "#000",
    strokeStyle: "#000",
    globalAlpha: 1,
    lineWidth: 1,
    save() {}, restore() {}, beginPath() {}, closePath() {},
    moveTo() {}, lineTo() {}, arc() {}, rect() {}, fill() {}, stroke() {}, clip() {},
    translate() {}, rotate() {}, scale() {}, setTransform() {},
    createLinearGradient: () => ({ addColorStop() {} }),
    createRadialGradient: () => ({ addColorStop() {} }),
    drawImage() {}, putImageData() {},
    getImageData: () => ({ data: new Uint8ClampedArray(4) }),
    createImageData: () => ({ data: new Uint8ClampedArray(4) }),
    measureText: (t: string) => ({ width: widthOf(t, size()) }),
    fillRect(x: number, y: number, w: number, h: number) {
      rec.rects.push({ x, y, w, h, seq: rec.seq++ });
    },
    strokeRect() {}, clearRect() {},
    fillText(t: string, x: number, y: number) {
      const s = size();
      const w = widthOf(t, s);
      const left = textAlign === "center" ? x - w / 2 : textAlign === "right" ? x - w : x;
      rec.texts.push({ text: t, left, right: left + w, top: y, bottom: y + s, seq: rec.seq++ });
    },
  };
  return ctx as unknown as CanvasRenderingContext2D;
}

// ---- グローバルの用意（import 時点で実行する）----
const store = new Map<string, string>();
const gl = globalThis as unknown as Record<string, unknown>;
gl.localStorage = {
  getItem: (k: string) => store.get(k) ?? null,
  setItem: (k: string, v: string) => void store.set(k, v),
  removeItem: (k: string) => void store.delete(k),
};
gl.window = { addEventListener() {}, innerWidth: 1280, innerHeight: 720 };
gl.document = {
  createElement: () => ({ getContext: () => makeCtx(), width: 0, height: 0, style: {} }),
  addEventListener() {},
};

// ---- 差し替え可能な入力・音・状態 ----

/** テストから打鍵・キー押下を流し込める入力モック。 */
export class FakeInput {
  private typed: string[] = [];
  private pressed = new Set<string>();
  /** IME警告の表示テスト用。 */
  imeSuspected = false;

  clearImeWarning(): void {
    this.imeSuspected = false;
  }

  /** 次の1フレームで打たれる文字を積む。 */
  type(s: string): void {
    this.typed.push(...s);
  }
  press(key: string): void {
    this.pressed.add(key);
  }
  takeTyped(): string[] {
    const q = this.typed;
    this.typed = [];
    return q;
  }
  wasPressed(k: string): boolean {
    return this.pressed.has(k);
  }
  isHeld(): boolean {
    return false;
  }
  anyPressed(): boolean {
    return this.pressed.size > 0;
  }
  endFrame(): void {
    this.pressed.clear();
    this.typed.length = 0;
  }
}

export interface Harness {
  ctx: Record<string, unknown>;
  input: FakeInput;
  /** ctx.go で渡された最新のシーン。 */
  lastScene(): unknown;
  goCount(): number;
}

/** シーンへ渡す SceneContext 相当を組み立てる。 */
export function makeHarness(options: Record<string, unknown>): Harness {
  const input = new FakeInput();
  let scene: unknown = null;
  let count = 0;
  const ctx: Record<string, unknown> = {
    renderer: { ctx: makeCtx(), scale: 1, fit() {}, clear() {} },
    input,
    audio: {
      init() {}, playBgm() {}, setBgmIntensity() {}, key() {}, miss() {},
      correct() {}, clear() {}, toggleMute: () => false,
    },
    state: {
      save: {
        bestScore: 0, bestRank: "-", readRate: 0, totalKeys: 0, kp: 0,
        badges: [], perStory: {}, muted: false,
        options, weakKeys: {},
      },
      lastOutcome: null,
    },
    go(next: unknown) {
      scene = next;
      count++;
    },
  };
  return { ctx, input, lastScene: () => scene, goCount: () => count };
}

// ---- 簡易アサーション ----
let passed = 0;
const failures: string[] = [];

export function check(name: string, cond: boolean, detail = ""): void {
  if (cond) passed++;
  else failures.push(`${name}${detail ? ` — ${detail}` : ""}`);
}

export function report(header: string): void {
  console.log(`${header} / アサーション ${passed + failures.length} 件`);
  if (failures.length === 0) {
    console.log(`✅ すべて通過（${passed}）`);
  } else {
    console.log(`❌ 失敗 ${failures.length} 件（通過 ${passed}）`);
    failures.slice(0, 40).forEach((f) => console.log("  - " + f));
    process.exitCode = 1;
  }
}
