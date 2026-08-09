// キーボード入力の正規化。押した瞬間(pressed)と押下状態(held)を提供。

/** 日本語入力(IME)がONのときの keydown を見分けるためのキーコード。 */
const IME_KEYCODE = 229;
/** IME警告を出しておく時間（秒）。 */
const IME_WARN_SEC = 5;

export class Input {
  private held = new Set<string>();
  private pressedThisFrame = new Set<string>();
  private typedQueue: string[] = []; // このフレームで打たれた文字（タイピング用）
  /** 直近でIMEらしき入力を検出した時刻（performance.now / ms）。 */
  private imeAt = -Infinity;

  constructor() {
    window.addEventListener("keydown", (e) => {
      // DOMの入力欄（編集ページ等）にフォーカス中はゲーム入力を一切奪わない。
      const el = document.activeElement;
      if (el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.tagName === "SELECT")) return;

      // 日本語入力がONだと keydown が「変換中」として届き、文字が1つも入らない。
      // 「打っているのに反応しない」の主因なので、検出して画面で知らせる。
      if (e.isComposing || e.keyCode === IME_KEYCODE || e.key === "Process") {
        this.imeAt = performance.now();
        return;
      }

      // ゲーム用キーはブラウザ既定動作を抑止（スクロール等）。
      if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", " "].includes(e.key)) {
        e.preventDefault();
      }
      if (!this.held.has(e.key)) this.pressedThisFrame.add(e.key);
      this.held.add(e.key);

      // 印字可能な単一文字のみタイピング入力として蓄積（修飾キー併用は除外）。
      // キーの押しっぱなし（オートリピート）は打鍵として数えない。
      if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey && !e.repeat) {
        // かな入力モードだと英字ではなく「か」等が直接届く。これもIME扱いで知らせる。
        if (isRomajiKey(e.key)) this.typedQueue.push(e.key.toLowerCase());
        else this.imeAt = performance.now();
      }
    });
    window.addEventListener("keyup", (e) => this.held.delete(e.key));
    window.addEventListener("blur", () => {
      this.held.clear();
      this.typedQueue.length = 0;
    });
    window.addEventListener("compositionstart", () => {
      this.imeAt = performance.now();
    });
  }

  /** このフレームで打たれたタイピング文字を取り出す（取得後クリア）。 */
  takeTyped(): string[] {
    const q = this.typedQueue;
    this.typedQueue = [];
    return q;
  }

  /** 直近に日本語入力(IME)らしき操作があったか。案内表示の出し分けに使う。 */
  get imeSuspected(): boolean {
    return performance.now() - this.imeAt < IME_WARN_SEC * 1000;
  }

  /** 案内を読んで対処したときなど、警告を明示的に消す。 */
  clearImeWarning(): void {
    this.imeAt = -Infinity;
  }

  isHeld(key: string): boolean {
    return this.held.has(key);
  }

  /** そのフレームで新規に押されたか。 */
  wasPressed(key: string): boolean {
    return this.pressedThisFrame.has(key);
  }

  /** 何らかのキーが新規に押されたか（タイトルの Press任意キー 用）。 */
  anyPressed(): boolean {
    return this.pressedThisFrame.size > 0;
  }

  /** フレーム末尾で呼ぶ。pressed と未消費のタイピング入力をリセット。 */
  endFrame(): void {
    this.pressedThisFrame.clear();
    this.typedQueue.length = 0;
  }
}

/** ローマ字入力として扱える文字（ASCII の印字可能文字）か。 */
function isRomajiKey(key: string): boolean {
  const c = key.codePointAt(0) ?? 0;
  return c >= 0x20 && c <= 0x7e;
}
