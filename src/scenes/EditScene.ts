import type { Scene, SceneContext } from "../core/Scene";
import { VIRTUAL_W, VIRTUAL_H } from "../core/Renderer";
import type { QuestionEdit } from "../core/Storage";
import { STORIES } from "../data/stories";
import { readStoryForEdit, saveStoryEdit, resetStory } from "../data/content";
import { validateKana } from "../typing/kanaRomaji";
import { TypingEngine } from "../typing/TypingEngine";
import { HomeScene } from "./HomeScene";

// 章コンテンツ編集ページ。canvas 上に DOM フォームを重ねて表示する。
// 日本語入力（IME）・カーソル移動・コピペを DOM 側でそのまま扱う。
// 編集は LocalStorage に保存し、data/content.ts が即座に STORIES へ反映する。

interface Row {
  el: HTMLDivElement;
  text: HTMLInputElement;
  kana: HTMLInputElement;
  /** よみを実際に打ったときのローマ字プレビュー。 */
  preview: HTMLDivElement;
  fx?: string;
}

export class EditScene implements Scene {
  private ctx: SceneContext | null = null;
  private overlay: HTMLDivElement | null = null;
  private select!: HTMLSelectElement;
  private titleInput!: HTMLInputElement;
  private introArea!: HTMLTextAreaElement;
  private qList!: HTMLDivElement;
  private warn!: HTMLDivElement;
  private rows: Row[] = [];
  private curKey = STORIES[0].key;

  enter(ctx: SceneContext): void {
    this.ctx = ctx;
    this.build();
    this.populate(this.curKey);
  }

  exit(): void {
    if (this.overlay) {
      this.overlay.remove();
      this.overlay = null;
    }
  }

  update(): void {
    /* DOM 側で処理。ゲームループでは何もしない。 */
  }

  draw(ctx: SceneContext): void {
    // 背景はダークで塗り潰し（オーバーレイの下地）。
    const g = ctx.renderer.ctx;
    g.fillStyle = "#05070d";
    g.fillRect(0, 0, VIRTUAL_W, VIRTUAL_H);
  }

  // ---- DOM 構築 ----
  private build(): void {
    const overlay = document.createElement("div");
    Object.assign(overlay.style, {
      position: "fixed",
      inset: "0",
      zIndex: "9999",
      background: "rgba(5,7,13,0.96)",
      color: "#cdd7f0",
      font: "14px sans-serif",
      display: "flex",
      alignItems: "flex-start",
      justifyContent: "center",
      overflow: "auto",
      padding: "24px 12px",
      boxSizing: "border-box",
    } as CSSStyleDeclaration);
    overlay.addEventListener("keydown", (e) => {
      if (e.key === "Escape") this.close();
    });

    const panel = document.createElement("div");
    Object.assign(panel.style, {
      width: "min(680px, 96vw)",
      background: "#0f1524",
      border: "1px solid #24304e",
      borderRadius: "8px",
      padding: "18px 20px",
      boxSizing: "border-box",
    } as CSSStyleDeclaration);

    // ヘッダー
    const header = document.createElement("div");
    Object.assign(header.style, {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: "14px",
    } as CSSStyleDeclaration);
    const h = document.createElement("div");
    h.textContent = "章コンテンツ編集";
    Object.assign(h.style, { fontSize: "18px", fontWeight: "bold", color: "#dfe6ff" } as CSSStyleDeclaration);
    const xBtn = this.button("閉じる", () => this.close());
    header.append(h, xBtn);

    // 章セレクト
    this.select = document.createElement("select");
    this.styleField(this.select);
    for (const s of STORIES) {
      const opt = document.createElement("option");
      opt.value = s.key;
      opt.textContent = `${s.chapter}　${s.title}`;
      this.select.append(opt);
    }
    this.select.addEventListener("change", () => {
      this.curKey = this.select.value;
      this.populate(this.curKey);
    });

    // タイトル
    this.titleInput = document.createElement("input");
    this.titleInput.type = "text";
    this.styleField(this.titleInput);

    // 解説（intro）
    this.introArea = document.createElement("textarea");
    this.introArea.rows = 4;
    this.styleField(this.introArea);

    // 問題リスト
    this.qList = document.createElement("div");
    const addBtn = this.button("＋ 問題を追加", () => this.addRow("", "", undefined));

    // 警告表示
    this.warn = document.createElement("div");
    Object.assign(this.warn.style, { minHeight: "18px", fontSize: "12px", margin: "6px 0" } as CSSStyleDeclaration);

    // 操作ボタン
    const actions = document.createElement("div");
    Object.assign(actions.style, { display: "flex", gap: "10px", marginTop: "14px", flexWrap: "wrap" } as CSSStyleDeclaration);
    const saveBtn = this.button("保存する", () => this.save(), true);
    const resetBtn = this.button("デフォルトに戻す", () => this.reset());
    const closeBtn = this.button("閉じる", () => this.close());
    actions.append(saveBtn, resetBtn, closeBtn);

    panel.append(
      header,
      this.labeled("章を選ぶ", this.select),
      this.labeled("タイトル", this.titleInput),
      this.labeled("解説（1行＝1文。導入で表示）", this.introArea),
      this.labeled("問題（文章／読み・ひらがな）", this.qList),
      addBtn,
      this.warn,
      actions,
    );
    overlay.append(panel);
    document.body.append(overlay);
    this.overlay = overlay;
  }

  // ラベル付きの区画。
  private labeled(label: string, field: HTMLElement): HTMLDivElement {
    const wrap = document.createElement("div");
    Object.assign(wrap.style, { margin: "10px 0" } as CSSStyleDeclaration);
    const l = document.createElement("div");
    l.textContent = label;
    Object.assign(l.style, { fontSize: "12px", color: "#8b9bc4", marginBottom: "4px" } as CSSStyleDeclaration);
    wrap.append(l, field);
    return wrap;
  }

  private styleField(el: HTMLElement): void {
    Object.assign(el.style, {
      width: "100%",
      boxSizing: "border-box",
      background: "#05070d",
      color: "#dfe6ff",
      border: "1px solid #24304e",
      borderRadius: "4px",
      padding: "6px 8px",
      font: "14px sans-serif",
    } as CSSStyleDeclaration);
  }

  private button(label: string, onClick: () => void, primary = false): HTMLButtonElement {
    const b = document.createElement("button");
    b.textContent = label;
    b.type = "button";
    Object.assign(b.style, {
      background: primary ? "#2f5aa8" : "#1b2440",
      color: "#dfe6ff",
      border: "1px solid #3a4a78",
      borderRadius: "4px",
      padding: "7px 14px",
      cursor: "pointer",
      font: "13px sans-serif",
    } as CSSStyleDeclaration);
    b.addEventListener("click", onClick);
    return b;
  }

  // ---- データ入出力 ----
  private populate(key: string): void {
    const story = readStoryForEdit(key);
    if (!story) return;
    this.titleInput.value = story.title;
    this.introArea.value = story.intro.join("\n");
    this.qList.replaceChildren();
    this.rows = [];
    for (const q of story.questions) this.addRow(q.text, q.kana, q.fx);
    this.warn.textContent = "";
  }

  private addRow(text: string, kana: string, fx?: string): void {
    const el = document.createElement("div");
    Object.assign(el.style, { display: "flex", gap: "6px", alignItems: "center", margin: "4px 0" } as CSSStyleDeclaration);

    const num = document.createElement("div");
    Object.assign(num.style, { width: "22px", fontSize: "11px", color: "#6f7ea8", textAlign: "right" } as CSSStyleDeclaration);

    const tIn = document.createElement("input");
    tIn.type = "text";
    tIn.value = text;
    tIn.placeholder = "表示する文章";
    this.styleField(tIn);
    tIn.style.flex = "3";

    const kIn = document.createElement("input");
    kIn.type = "text";
    kIn.value = kana;
    kIn.placeholder = "よみ（ひらがな）";
    this.styleField(kIn);
    kIn.style.flex = "2";

    const del = this.button("×", () => {
      const i = this.rows.findIndex((r) => r.el === el);
      if (i >= 0) this.rows.splice(i, 1);
      (el.parentElement ?? el).remove(); // 行本体とプレビューをまとめて外す
      this.renumber();
    });
    del.style.padding = "6px 10px";

    // よみを打ったときのローマ字を、その場で確かめられるようにする。
    const preview = document.createElement("div");
    Object.assign(preview.style, {
      fontSize: "11px",
      color: "#6f7ea8",
      margin: "0 0 4px 28px",
      fontFamily: "monospace",
      wordBreak: "break-all",
    } as CSSStyleDeclaration);

    const wrap = document.createElement("div");
    wrap.append(el, preview);
    const row: Row = { el, text: tIn, kana: kIn, preview, fx };
    kIn.addEventListener("input", () => this.updatePreview(row));

    this.qList.append(wrap);
    this.rows.push(row);
    this.updatePreview(row);
    this.renumber();
  }

  /** 1行分のローマ字プレビューを更新する（打てない文字は赤で警告）。 */
  private updatePreview(row: Row): void {
    const kana = row.kana.value.trim();
    if (kana === "") {
      row.preview.textContent = "";
      return;
    }
    const v = validateKana(kana);
    if (!v.ok) {
      row.preview.style.color = "#ff8f8f";
      row.preview.textContent = `⚠ 打てない文字: ${v.badChars.join(" ")}（ひらがな・記号に直してください）`;
      return;
    }
    row.preview.style.color = "#6f7ea8";
    const e = new TypingEngine(kana);
    row.preview.textContent = `→ ${e.guide().text}  (${e.romajiLength}打)`;
  }

  private renumber(): void {
    this.rows.forEach((r, i) => {
      const num = r.el.firstChild as HTMLDivElement;
      num.textContent = String(i + 1);
    });
  }

  private collect(): { title: string; intro: string[]; questions: QuestionEdit[] } {
    const title = this.titleInput.value.trim();
    const intro = this.introArea.value
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l.length > 0);
    const questions: QuestionEdit[] = this.rows
      .map((r, i) => ({
        id: i + 1,
        text: r.text.value.trim(),
        kana: r.kana.value.trim(),
        fx: r.fx,
      }))
      .filter((q) => q.text.length > 0 || q.kana.length > 0);
    return { title, intro, questions };
  }

  private save(): void {
    const data = this.collect();
    // 検証：実際の入力表に照らして「打てない文字」を含む行を警告（保存は続行）。
    const bad: string[] = [];
    data.questions.forEach((q, i) => {
      if (q.kana.length === 0) return;
      const v = validateKana(q.kana);
      if (!v.ok) bad.push(`${i + 1}行目(${v.badChars.join("")})`);
    });
    saveStoryEdit(this.curKey, data);
    if (bad.length > 0) {
      this.warn.style.color = "#e8b04a";
      this.warn.textContent = `保存しました。ただし ${bad.join("、")} は打てない文字を含みます。`;
    } else {
      this.warn.style.color = "#7fd0a0";
      this.warn.textContent = "保存しました。";
    }
  }

  private reset(): void {
    resetStory(this.curKey);
    this.populate(this.curKey);
    this.warn.style.color = "#8b9bc4";
    this.warn.textContent = "デフォルトに戻しました。";
  }

  private close(): void {
    this.ctx?.go(new HomeScene());
  }
}
