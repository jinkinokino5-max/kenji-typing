import type { Renderer } from "./Renderer";
import type { Input } from "./Input";
import type { AudioEngine } from "../audio/AudioEngine";
import type { SaveData } from "./Storage";

// Game→Result へ受け渡す1ステージの成績。
export interface StageOutcome {
  storyKey: string;
  storyTitle: string;
  total: number;
  rank: string;
  correctQuestions: number;
  totalQuestions: number;
  accuracyPct: number;
  avgSpeed: number;
  bonuses: { label: string; value: number }[];
  badges: string[];
  readRate: number;
  /** 実プレイ時間あたりの打鍵数。 */
  keysPerSec: number;
  /** 打鍵単位の正確率（％）。ミス打鍵も分母に含む。 */
  keyAccuracyPct: number;
  maxCombo: number;
  totalKeys: number;
  /** この回の期待キー別ミス数。 */
  missByKey: Record<string, number>;
}

// シーン間で共有する状態。
export interface GameState {
  save: SaveData;
  lastOutcome: StageOutcome | null;
}

export interface SceneContext {
  renderer: Renderer;
  input: Input;
  audio: AudioEngine;
  state: GameState;
  /** シーン遷移を要求する（ディザ遷移付き）。 */
  go: (next: Scene) => void;
}

export interface Scene {
  enter?(ctx: SceneContext): void;
  /** dt は秒。 */
  update(dt: number, ctx: SceneContext): void;
  draw(ctx: SceneContext): void;
  exit?(): void;
}
