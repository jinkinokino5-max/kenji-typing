// Web Audio API を直接叩く 8bit 風サウンド。外部音源ファイルなし。
// 矩形波/三角波+ノイズで SE を合成し、簡易シーケンサで BGM を鳴らす。
import type { BgmTrack } from "./tracks";

export class AudioEngine {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  muted = false;

  private bgmTimer: number | null = null;
  private bgmStep = 0;
  private nextNoteTime = 0;
  private track: BgmTrack | null = null;
  private lastMissAt = -1;
  private intensity = 0; // コンボ強度 0..1（音量/きらめきに反映）

  /** ユーザー操作後に呼ぶ（自動再生ポリシー対策）。 */
  init(): void {
    if (this.ctx) {
      void this.ctx.resume();
      return;
    }
    const Ctor: typeof AudioContext =
      window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    this.ctx = new Ctor();
    this.master = this.ctx.createGain();
    this.master.gain.value = this.muted ? 0 : 0.5; // 保存済みミュートを尊重
    this.master.connect(this.ctx.destination);
  }

  setMuted(m: boolean): void {
    this.muted = m;
    if (this.master) this.master.gain.value = m ? 0 : 0.5;
  }

  toggleMute(): boolean {
    this.setMuted(!this.muted);
    return this.muted;
  }

  private tone(
    freq: number,
    dur: number,
    type: OscillatorType,
    when = 0,
    vol = 0.25,
    slideTo?: number,
  ): void {
    if (!this.ctx || !this.master || this.muted) return;
    const t0 = this.ctx.currentTime + when;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
    g.gain.setValueAtTime(vol, t0);
    g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
    osc.connect(g);
    g.connect(this.master);
    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
  }

  // ---- SE ----
  key(): void {
    this.tone(660, 0.04, "square", 0, 0.12);
  }
  correct(): void {
    this.tone(880, 0.08, "square", 0, 0.2);
    this.tone(1320, 0.1, "square", 0.06, 0.18);
  }
  /** ミス音：不快にならないよう、柔らかい低めのサイン波を短く 1 音（連打しても重ならないよう間引く）。 */
  miss(): void {
    if (!this.ctx || !this.master || this.muted) return;
    const t0 = this.ctx.currentTime;
    if (t0 - this.lastMissAt < 0.12) return;
    this.lastMissAt = t0;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(330, t0);
    osc.frequency.exponentialRampToValueAtTime(247, t0 + 0.14);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.linearRampToValueAtTime(0.09, t0 + 0.015); // クリックノイズを避ける立ち上がり
    g.gain.exponentialRampToValueAtTime(0.001, t0 + 0.16);
    osc.connect(g);
    g.connect(this.master);
    osc.start(t0);
    osc.stop(t0 + 0.18);
  }
  clear(): void {
    const seq = [523, 659, 784, 1047];
    seq.forEach((f, i) => this.tone(f, 0.16, "triangle", i * 0.11, 0.22));
    this.tone(1568, 0.4, "triangle", seq.length * 0.11, 0.2);
  }

  // ---- BGM（作品別トラック式チップチューン）----

  /** コンボ強度を反映（0..1）。音量ときらめきに連続作用。 */
  setBgmIntensity(v: number): void {
    this.intensity = Math.max(0, Math.min(1, v));
  }

  /**
   * トラックを再生。再生中に呼ぶと曲を差し替える（シームレス）。
   * ステップはトラック側の bpm から算出（8分音符相当）。
   */
  playBgm(track: BgmTrack): void {
    this.track = track;
    if (!this.ctx || this.bgmTimer !== null) return;
    this.bgmStep = 0;
    this.nextNoteTime = this.ctx.currentTime + 0.1;
    const schedule = () => {
      if (!this.ctx || !this.track) return;
      const t = this.track;
      const stepDur = 60 / t.bpm / 2;
      while (this.nextNoteTime < this.ctx.currentTime + 0.2) {
        const i = this.bgmStep % t.melody.length;
        const note = t.melody[i];
        const bass = t.bass[this.bgmStep % t.bass.length];
        const when = this.nextNoteTime - this.ctx.currentTime;
        if (!this.muted) {
          // コンボ強度が上がるほど音量だけが増す（音高は変えない＝ピッチが上がっていく演出は不採用）。
          const boost = 1 + this.intensity * 0.5;
          if (note > 0) {
            this.tone(note, stepDur * 0.9, t.lead, when, t.leadVol * boost);
          }
          if (bass > 0) this.tone(bass, stepDur, t.bassType, when, t.bassVol * boost);
          // ハーモニー声（常時。コンボ強度に応じて滑らかに音量が増す＝BGM作曲方針§8）
          if (t.harmony) {
            const h = t.harmony[this.bgmStep % t.harmony.length];
            if (h > 0) {
              this.tone(h, stepDur * 0.85, t.lead, when, (t.harmonyVol ?? t.leadVol * 0.6) * (0.15 + this.intensity * 0.85));
            }
          }
        }
        this.nextNoteTime += stepDur;
        this.bgmStep++;
      }
    };
    this.bgmTimer = window.setInterval(schedule, 60);
  }

  stopBgm(): void {
    if (this.bgmTimer !== null) {
      clearInterval(this.bgmTimer);
      this.bgmTimer = null;
    }
    this.track = null;
  }
}
