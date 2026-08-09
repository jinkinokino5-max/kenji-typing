import type { Scene, SceneContext, StageOutcome } from "../core/Scene";
import { VIRTUAL_W, VIRTUAL_H } from "../core/Renderer";
import { shade } from "../core/Palette";
import { drawText, measureText, wrapText } from "../pixel/Text";
import type { UnitView } from "../typing/TypingEngine";
import { StarBurst } from "../pixel/anim/StarBurst";
import type { SceneTheme, ThemeBackdrop } from "../pixel/theme/SceneTheme";
import { themeForStory } from "../pixel/theme/themes";
import { trackByKey } from "../audio/tracks";
import { TypingEngine } from "../typing/TypingEngine";
import { scoreQuestion, stageResult } from "../typing/Scoring";
import { recordStage } from "../core/Storage";
import type { Story, Question } from "../data/story";
import { ResultScene } from "./ResultScene";
import { HomeScene } from "./HomeScene";

// レイアウト定数（480x270 基準）
const CONTENT_W = VIRTUAL_W - 52;
const TOP_BAR_H = 22;
const BOTTOM_BAR_H = 20;
const STORY_SIZE = 15;
const STORY_LINE_H = 18;
const KANA_SIZE = 19;
const KANA_LINE_H = 24;
const GUIDE_SIZE = 11;
const GUIDE_LINE_H = 13;

const IME_BANNER_H = 26;
/** 開始直後だけ操作案内を出す秒数。 */
const HINT_SEC = 6;

const PAUSE_ITEMS = ["つづける", "この章を最初から", "章えらびへもどる"] as const;

interface KanaLine {
  units: UnitView[];
  width: number;
}

/** ローマ字ガイド1行分（打鍵済みの文字数つき）。 */
interface GuideLine {
  text: string;
  typed: number;
}

export class GameScene implements Scene {
  private readonly story: Story;
  private readonly theme: SceneTheme;
  private bg: ThemeBackdrop;
  private qIndex = 0;
  private engine: TypingEngine;
  private q: Question;
  private qStart = 0;
  private t = 0;

  private sumScore = 0;
  private totalMistakes = 0;
  private perfectQuestions = 0;
  private correctQuestions = 0;
  private speedMults: number[] = [];
  private totalKeys = 0;
  /** ポーズを除いた実プレイ時間（速度・正確率の分母）。 */
  private playSec = 0;
  /** 期待キー別のミス累計（苦手キー分析）。 */
  private missByKey: Record<string, number> = {};

  private combo = 0;
  private maxCombo = 0;
  private intensity = 0; // コンボ由来の盛り上がり 0..1
  private burst = new StarBurst();
  private missFlash = 0;
  private advanceTimer = 0;
  private finished = false;
  private finaleActive = false; // 締め演出の再生中
  private finaleTimer = 0;
  private buffer: string[] = [];

  // 打鍵フィードバック
  private missKey = "";
  private missExpected = "";
  private missTimer = 0;

  // ポーズ
  private paused = false;
  private pauseIndex = 0;

  constructor(story: Story) {
    this.story = story;
    this.theme = themeForStory(story.key);
    this.bg = this.theme.makeBackdrop();
    this.q = story.questions[0];
    this.engine = new TypingEngine(this.q.kana);
  }

  enter(ctx: SceneContext): void {
    // 章専用BGMへ差し替え（シームレス）。
    ctx.audio.playBgm(trackByKey(this.theme.bgmKey));
  }

  update(dt: number, ctx: SceneContext): void {
    this.t += dt;

    if (this.paused) {
      this.updatePause(ctx);
      // 背景だけは静かに動かし、ゲーム時間は止める。
      this.bg.update(dt, 0);
      return;
    }

    // 中断はいきなり抜けず、まずポーズメニューを開く（誤操作での消失を防ぐ）。
    if (ctx.input.wasPressed("Escape")) {
      this.paused = true;
      this.pauseIndex = 0;
      return;
    }

    // コンボから盛り上がり強度（BGM・背景に連続作用）。締め中は最大固定。
    this.intensity = this.finaleActive ? 1 : Math.min(1, this.combo / 12);
    this.bg.update(dt, this.intensity);
    ctx.audio.setBgmIntensity(this.intensity);
    this.burst.update(dt);
    if (this.missFlash > 0) this.missFlash = Math.max(0, this.missFlash - dt * 2.5);
    if (this.missTimer > 0) this.missTimer -= dt;

    // 締め演出の待機（詩歌編）。終わったらリザルトへ。
    if (this.finaleActive) {
      this.finaleTimer -= dt;
      if (this.finaleTimer <= 0) ctx.go(new ResultScene());
      return;
    }

    if (this.advanceTimer > 0) {
      for (const c of ctx.input.takeTyped()) this.buffer.push(c);
      this.advanceTimer -= dt;
      if (this.advanceTimer <= 0) this.nextQuestion(ctx);
      return;
    }
    if (this.finished) return;

    this.qStart += dt;
    this.playSec += dt;
    const chars = this.buffer.length
      ? [...this.buffer.splice(0), ...ctx.input.takeTyped()]
      : ctx.input.takeTyped();
    for (let i = 0; i < chars.length; i++) {
      const r = this.engine.input(chars[i]);
      if (r === "miss") {
        this.combo = 0;
        this.missFlash = 1;
        this.missKey = this.engine.lastMissKey;
        this.missExpected = this.engine.lastMissExpected;
        this.missTimer = 1.2;
        this.bg.gust();
        ctx.audio.miss();
      } else {
        this.totalKeys++;
        this.missTimer = 0;
        ctx.audio.key();
        // 打鍵に同期した情景エフェクト（オノマトペ章のみ反応）。
        this.bg.pulse?.(this.q.fx);
        if (r === "unit-done" || r === "all-done") {
          this.combo++;
          this.maxCombo = Math.max(this.maxCombo, this.combo);
          this.burst.burst(VIRTUAL_W / 2, this.kanaCenterY(), 6);
        }
        if (r === "all-done") {
          this.completeQuestion(ctx);
          if (i + 1 < chars.length) this.buffer.push(...chars.slice(i + 1));
          break;
        }
      }
    }
  }

  private updatePause(ctx: SceneContext): void {
    const inp = ctx.input;
    if (inp.wasPressed("ArrowUp")) {
      this.pauseIndex = (this.pauseIndex + PAUSE_ITEMS.length - 1) % PAUSE_ITEMS.length;
    } else if (inp.wasPressed("ArrowDown")) {
      this.pauseIndex = (this.pauseIndex + 1) % PAUSE_ITEMS.length;
    } else if (inp.wasPressed("Escape")) {
      this.paused = false;
    } else if (inp.wasPressed("Enter") || inp.wasPressed(" ")) {
      if (this.pauseIndex === 0) this.paused = false;
      else if (this.pauseIndex === 1) ctx.go(new GameScene(this.story));
      else ctx.go(new HomeScene(this.story.key));
    }
    inp.takeTyped(); // ポーズ中の打鍵は捨てる
  }

  private completeQuestion(ctx: SceneContext): void {
    const s = scoreQuestion({
      kanaLength: this.engine.kanaLength,
      romajiLength: this.engine.romajiLength,
      mistakes: this.engine.mistakes,
      elapsedSec: this.qStart,
    });
    this.sumScore += s.score;
    this.speedMults.push(s.speedMult);
    this.totalMistakes += this.engine.mistakes;
    for (const [k, v] of this.engine.missByKey) {
      this.missByKey[k] = (this.missByKey[k] ?? 0) + v;
    }
    if (this.engine.mistakes === 0) this.perfectQuestions++;
    this.correctQuestions++;
    ctx.audio.correct();
    this.burst.burst(VIRTUAL_W / 2, this.kanaCenterY(), 12);
    this.advanceTimer = 0.5;
  }

  private nextQuestion(ctx: SceneContext): void {
    this.qIndex++;
    if (this.qIndex >= this.story.questions.length) {
      this.finishStage(ctx);
      return;
    }
    this.q = this.story.questions[this.qIndex];
    this.engine = new TypingEngine(this.q.kana);
    this.qStart = 0;
    this.missTimer = 0;
  }

  private finishStage(ctx: SceneContext): void {
    this.finished = true;
    const avgSpeed =
      this.speedMults.reduce((n, v) => n + v, 0) / Math.max(1, this.speedMults.length);
    const res = stageResult({
      sumScore: this.sumScore,
      totalQuestions: this.story.questions.length,
      perfectQuestions: this.perfectQuestions,
      totalMistakes: this.totalMistakes,
      avgSpeedMult: avgSpeed,
    });
    const accuracy = Math.round((this.correctQuestions / this.story.questions.length) * 100);

    const badges: string[] = [];
    if (this.totalMistakes === 0) badges.push(this.story.noMissBadge);
    if (res.rank === "S") badges.push(`${this.story.title} 達人`);

    const outcome: StageOutcome = {
      storyKey: this.story.key,
      storyTitle: this.story.title,
      total: res.total,
      rank: res.rank,
      correctQuestions: this.correctQuestions,
      totalQuestions: this.story.questions.length,
      accuracyPct: accuracy,
      avgSpeed,
      bonuses: res.bonuses,
      badges,
      readRate: accuracy,
      keysPerSec: this.keysPerSec(),
      keyAccuracyPct: this.keyAccuracyPct(),
      maxCombo: this.maxCombo,
      totalKeys: this.totalKeys,
      missByKey: { ...this.missByKey },
    };
    ctx.state.lastOutcome = outcome;
    ctx.state.save = recordStage(ctx.state.save, {
      storyKey: this.story.key,
      score: res.total,
      rank: res.rank,
      readRate: accuracy,
      keys: this.totalKeys,
      kp: this.correctQuestions,
      badges,
      missByKey: this.missByKey,
    });
    ctx.audio.clear();
    // 締め演出を持つテーマ（詩歌編）なら、少し見せてからリザルトへ。
    if (this.bg.finale) {
      this.bg.finale();
      this.finaleActive = true;
      this.finaleTimer = 2.8;
    } else {
      ctx.go(new ResultScene());
    }
  }

  // ---- 指標 ----

  private keysPerSec(): number {
    return this.playSec > 0.5 ? this.totalKeys / this.playSec : 0;
  }

  /** 打鍵の正確率（％）。ミスも分母に入れる。 */
  private keyAccuracyPct(): number {
    const miss = this.totalMistakes + this.engine.mistakes;
    const all = this.totalKeys + miss;
    return all === 0 ? 100 : Math.round((this.totalKeys / all) * 100);
  }

  // ---- 描画 ----
  draw(ctx: SceneContext): void {
    const g = ctx.renderer.ctx;
    const p = this.theme.palette;
    const opt = ctx.state.save.options;
    this.bg.draw(g);

    // ハイコントラスト：背景を落として文字を浮かせる。
    if (opt.highContrast) {
      g.globalAlpha = 0.55;
      g.fillStyle = "#000000";
      g.fillRect(0, TOP_BAR_H, VIRTUAL_W, VIRTUAL_H - TOP_BAR_H - BOTTOM_BAR_H);
      g.globalAlpha = 1;
    }

    if (this.missFlash > 0) {
      g.globalAlpha = this.missFlash * 0.5;
      g.fillStyle = shade(p, 0);
      g.fillRect(0, 0, VIRTUAL_W, VIRTUAL_H);
      g.globalAlpha = 1;
    }

    this.drawTopBar(g);
    this.theme.drawMeter(g, this.correctQuestions / this.story.questions.length, this.t);
    // IME警告を出すときは、その帯のぶんだけ本文を下げて重ならないようにする。
    const imeOn = ctx.input.imeSuspected;
    this.drawPlayfield(g, ctx, imeOn ? IME_BANNER_H + 4 : 0);
    this.burst.draw(g, p);
    this.drawBottomBar(g, ctx);
    if (imeOn) this.drawImeWarning(g);

    if (this.paused) this.drawPauseOverlay(g);
  }

  /** かな行の中心 y（演出の発生位置に使う）。 */
  private kanaCenterY(): number {
    return 100;
  }

  /**
   * 本文・かな行・ローマ字ガイドを、上下のバーの間に積む。
   * 行数は問題文によって変わるため、毎フレーム測ってから中央寄せする。
   */
  private drawPlayfield(g: CanvasRenderingContext2D, ctx: SceneContext, topOffset = 0): void {
    const p = this.theme.palette;
    const opt = ctx.state.save.options;
    const accent = this.theme.accent;
    const dim = shade(p, opt.highContrast ? 2 : 1);
    const mid = shade(p, opt.highContrast ? 3 : 2);
    const bright = shade(p, 3);

    const storyLines = wrapText(g, this.q.text, STORY_SIZE, CONTENT_W);
    const kanaLines = this.layoutKana(g);
    const guideLines = opt.showGuide ? this.layoutGuide(g) : [];

    // 最下段のフィードバック行のぶんだけ高さを確保する。
    const bottomReserve = 16;
    const areaTop = TOP_BAR_H + 4 + topOffset;
    const areaBottom = VIRTUAL_H - BOTTOM_BAR_H - bottomReserve;

    // 本文は上端に固定する（問題ごとに行数が変わっても位置が跳ねない）。
    let y = areaTop;
    for (const line of storyLines) {
      drawText(g, line, VIRTUAL_W / 2, y, {
        size: STORY_SIZE,
        color: bright,
        align: "center",
        shadow: shade(p, 0),
      });
      y += STORY_LINE_H;
    }

    // かな行＋ローマ字ガイドは、本文と最下段の間に中央寄せする。
    const blockH =
      kanaLines.length * KANA_LINE_H +
      (guideLines.length > 0 ? 4 + guideLines.length * GUIDE_LINE_H : 0);
    y = Math.max(y + 6, y + 6 + (areaBottom - (y + 6) - blockH) * 0.6);

    const blink = Math.floor(this.t * 4) % 2 === 0;
    for (const line of kanaLines) {
      let x = VIRTUAL_W / 2 - line.width / 2;
      for (const u of line.units) {
        const w = measureText(g, u.kana, KANA_SIZE, true);
        const color =
          u.status === "done" ? bright : u.status === "current" ? (blink ? accent : mid) : dim;
        drawText(g, u.kana, x, y, { size: KANA_SIZE, color, shadow: shade(p, 0), bold: true });
        if (u.status === "current") {
          g.fillStyle = accent;
          g.fillRect(Math.round(x + w / 2 - 1), y + KANA_SIZE + 1, 3, 2);
        }
        x += w;
      }
      y += KANA_LINE_H;
    }

    if (guideLines.length > 0) {
      y += 4;
      for (const line of guideLines) {
        this.drawGuideLine(g, line, y, { done: mid, todo: bright, cursor: accent });
        y += GUIDE_LINE_H;
      }
    }

    // フィードバック行：ミス時は「打ったキー → 正解」を出す。
    const fbY = areaBottom + 2;
    if (this.missTimer > 0 && this.missKey) {
      const label = this.missExpected
        ? `✕ ${this.missKey.toUpperCase()} … つぎは ${this.missExpected.toUpperCase()}`
        : `✕ ${this.missKey.toUpperCase()}`;
      drawText(g, label, VIRTUAL_W / 2, fbY, {
        size: 12,
        color: bright,
        align: "center",
        shadow: shade(p, 0),
        bold: true,
      });
    } else if (!opt.showGuide) {
      const buf = this.engine.pendingRomaji;
      drawText(g, `> ${buf}${buf ? "" : "_"}`, VIRTUAL_W / 2, fbY, {
        size: 12,
        color: mid,
        align: "center",
      });
    } else if (this.t < HINT_SEC) {
      // 操作案内は開始直後だけ出し、あとは画面をすっきりさせる。
      drawText(g, "Esc … ひとやすみ", VIRTUAL_W / 2, fbY, {
        size: 9,
        color: dim,
        align: "center",
      });
    }
  }

  /** ローマ字ガイドを幅で折り返す。 */
  private layoutGuide(g: CanvasRenderingContext2D): GuideLine[] {
    const { text, typedLen } = this.engine.guide();
    if (!text) return [];
    const lines: GuideLine[] = [];
    let start = 0;
    while (start < text.length) {
      let end = start;
      let w = 0;
      while (end < text.length) {
        const cw = measureText(g, text[end], GUIDE_SIZE, true);
        if (w + cw > CONTENT_W && end > start) break;
        w += cw;
        end++;
      }
      lines.push({
        text: text.slice(start, end),
        typed: Math.max(0, Math.min(end, typedLen) - start),
      });
      start = end;
    }
    return lines;
  }

  /** ガイド1行を、既打／未打で色分けして中央に描く。 */
  private drawGuideLine(
    g: CanvasRenderingContext2D,
    line: GuideLine,
    y: number,
    col: { done: string; todo: string; cursor: string },
  ): void {
    const total = measureText(g, line.text, GUIDE_SIZE, true);
    let x = Math.round(VIRTUAL_W / 2 - total / 2);
    for (let i = 0; i < line.text.length; i++) {
      const isDone = i < line.typed;
      const isCursor = i === line.typed;
      const ch = line.text[i];
      if (isCursor) {
        g.fillStyle = col.cursor;
        g.fillRect(x - 1, y - 1, measureText(g, ch, GUIDE_SIZE, true) + 1, GUIDE_SIZE + 3);
      }
      drawText(g, ch, x, y, {
        size: GUIDE_SIZE,
        color: isCursor ? "#000000" : isDone ? col.done : col.todo,
        bold: true,
      });
      x += measureText(g, ch, GUIDE_SIZE, true);
    }
  }

  private drawTopBar(g: CanvasRenderingContext2D): void {
    const p = this.theme.palette;
    g.fillStyle = shade(p, 0);
    g.fillRect(0, 0, VIRTUAL_W, TOP_BAR_H);
    g.fillStyle = shade(p, 1);
    g.fillRect(0, TOP_BAR_H, VIRTUAL_W, 1);
    drawText(g, `${this.story.chapter} 『${this.story.title}』`, 8, 6, {
      size: 13,
      color: shade(p, 3),
    });
    // 最終問題を解き終えた直後は qIndex が総数に達する（締め演出の間も描画される）。
    // そのまま出すと「問 14/13」のように総数を超えるため、表示上は総数で止める。
    const total = this.story.questions.length;
    const shown = Math.min(this.qIndex + 1, total);
    drawText(g, `問 ${shown}/${total}`, VIRTUAL_W - 8, 6, {
      size: 13,
      color: shade(p, 2),
      align: "right",
    });
  }

  private layoutKana(g: CanvasRenderingContext2D): KanaLine[] {
    const view = this.engine.view();
    const lines: KanaLine[] = [];
    let cur: UnitView[] = [];
    let curW = 0;
    for (const u of view) {
      const w = measureText(g, u.kana, KANA_SIZE, true);
      if (curW + w > CONTENT_W && cur.length > 0) {
        lines.push({ units: cur, width: curW });
        cur = [];
        curW = 0;
      }
      cur.push(u);
      curW += w;
    }
    if (cur.length > 0) lines.push({ units: cur, width: curW });
    return lines;
  }

  private drawBottomBar(g: CanvasRenderingContext2D, ctx: SceneContext): void {
    const p = this.theme.palette;
    const showStats = ctx.state.save.options.showStats;
    g.fillStyle = shade(p, 0);
    g.fillRect(0, VIRTUAL_H - BOTTOM_BAR_H, VIRTUAL_W, BOTTOM_BAR_H);
    g.fillStyle = shade(p, 1);
    g.fillRect(0, VIRTUAL_H - BOTTOM_BAR_H - 1, VIRTUAL_W, 1);
    const y = VIRTUAL_H - 16;
    const secs = Math.floor(this.t);
    const mm = String(Math.floor(secs / 60)).padStart(2, "0");
    const ss = String(secs % 60).padStart(2, "0");
    drawText(g, `TIME ${mm}:${ss}`, 8, y, { size: 11, color: shade(p, 2) });

    if (showStats) {
      drawText(g, `${this.keysPerSec().toFixed(1)}打/秒`, 92, y, {
        size: 11,
        color: shade(p, 2),
      });
      const acc = this.keyAccuracyPct();
      drawText(g, `正確 ${acc}%`, 152, y, {
        size: 11,
        color: acc >= 95 ? this.theme.accent : shade(p, 2),
      });
    }

    drawText(g, `COMBO ${this.combo}`, VIRTUAL_W / 2 + 30, y, {
      size: 11,
      color: this.combo >= 5 ? this.theme.accent : shade(p, 2),
      align: "center",
    });
    drawText(g, `SCORE ${this.sumScore}`, VIRTUAL_W - 8, y, {
      size: 11,
      color: shade(p, 2),
      align: "right",
    });
  }

  /**
   * 日本語入力(IME)がONだと keydown が変換に食われ、何を打っても無反応になる。
   * 「打てないのに理由がわからない」状態を避けるため、原因と直し方を明示する。
   */
  private drawImeWarning(g: CanvasRenderingContext2D): void {
    const p = this.theme.palette;
    const y = TOP_BAR_H + 3;
    const h = IME_BANNER_H;
    g.fillStyle = shade(p, 3);
    g.fillRect(20, y, VIRTUAL_W - 40, h);
    g.fillStyle = shade(p, 0);
    g.fillRect(21, y + 1, VIRTUAL_W - 42, h - 2);
    drawText(g, "！ 日本語入力（かな漢字変換）がONになっています", VIRTUAL_W / 2, y + 4, {
      size: 11,
      color: shade(p, 3),
      align: "center",
      bold: true,
    });
    drawText(g, "半角/全角キー などで「半角英数」に切り替えてください", VIRTUAL_W / 2, y + 15, {
      size: 9,
      color: shade(p, 2),
      align: "center",
    });
  }

  private drawPauseOverlay(g: CanvasRenderingContext2D): void {
    const p = this.theme.palette;
    g.globalAlpha = 0.78;
    g.fillStyle = shade(p, 0);
    g.fillRect(0, 0, VIRTUAL_W, VIRTUAL_H);
    g.globalAlpha = 1;

    const boxW = 220;
    const boxH = 118;
    const bx = Math.round((VIRTUAL_W - boxW) / 2);
    const by = Math.round((VIRTUAL_H - boxH) / 2);
    g.fillStyle = shade(p, 1);
    g.fillRect(bx, by, boxW, boxH);
    g.fillStyle = shade(p, 0);
    g.fillRect(bx + 1, by + 1, boxW - 2, boxH - 2);

    drawText(g, "ひとやすみ", VIRTUAL_W / 2, by + 12, {
      size: 16,
      color: shade(p, 3),
      align: "center",
      bold: true,
    });

    PAUSE_ITEMS.forEach((label, i) => {
      const sel = i === this.pauseIndex;
      drawText(g, `${sel ? "▶ " : "  "}${label}`, VIRTUAL_W / 2, by + 40 + i * 20, {
        size: 13,
        color: sel ? this.theme.accent : shade(p, 2),
        align: "center",
        bold: sel,
      });
    });

    drawText(g, "↑↓ えらぶ / Enter けってい / Esc もどる", VIRTUAL_W / 2, by + boxH - 16, {
      size: 9,
      color: shade(p, 2),
      align: "center",
    });
  }
}
