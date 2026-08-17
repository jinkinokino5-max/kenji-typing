import { VIRTUAL_H, VIRTUAL_W } from "../../core/Renderer";
import {
  NIGHT, GALAXY, VOLCANO, PASTURE, ZASHIKI_P, ONO_P, SLEET, RAIN, LAMP, AQUA,
  KOIBYO_P, SHINGO_P, MENITE_P, HARUGA_P, MUSEI_P, NEMURAU_P, KAZE_P,
  KOKUBETSU_P, SEITO_P, YORU_P, MIZUKUMI_P,
  ONO_KAZE_P, ONO_MIZU_P, ONO_IKIMONO_P, ONO_KOKORO_P, shade,
} from "../../core/Palette";
import type { SceneTheme } from "./SceneTheme";
import { baseStoryKey } from "../../data/split";
import { YodakaBackdrop } from "../anim/YodakaBackdrop";
import { GingaBackdrop } from "../anim/GingaBackdrop";
import { BudoriBackdrop } from "../anim/BudoriBackdrop";
import { OtsuberuBackdrop } from "../anim/OtsuberuBackdrop";
import { ZashikiBackdrop } from "../anim/ZashikiBackdrop";
import { OnomatopoeiaBackdrop } from "../anim/OnomatopoeiaBackdrop";
import { OnoKazeBackdrop } from "../anim/OnoKazeBackdrop";
import { OnoMizuBackdrop } from "../anim/OnoMizuBackdrop";
import { OnoIkimonoBackdrop } from "../anim/OnoIkimonoBackdrop";
import { OnoKokoroBackdrop } from "../anim/OnoKokoroBackdrop";
import { EiketsuBackdrop } from "../anim/EiketsuBackdrop";
import { AmenimoBackdrop } from "../anim/AmenimoBackdrop";
import { HarushuraBackdrop } from "../anim/HarushuraBackdrop";
import { AomoriBackdrop } from "../anim/AomoriBackdrop";
import { KoibyoBackdrop } from "../anim/KoibyoBackdrop";
import { KumoShingoBackdrop } from "../anim/KumoShingoBackdrop";
import { MeniteBackdrop } from "../anim/MeniteBackdrop";
import { HarugaBackdrop } from "../anim/HarugaBackdrop";
import { MuseiBackdrop } from "../anim/MuseiBackdrop";
import { NemurauBackdrop } from "../anim/NemurauBackdrop";
import { KazeomoteBackdrop } from "../anim/KazeomoteBackdrop";
import { KokubetsuBackdrop } from "../anim/KokubetsuBackdrop";
import { SeitoBackdrop } from "../anim/SeitoBackdrop";
import { YoruBackdrop } from "../anim/YoruBackdrop";
import { MizukumiBackdrop } from "../anim/MizukumiBackdrop";
import { drawYodaka, flapFrame } from "../anim/Yodaka";

// メーターの共通ジオメトリ
const MX = VIRTUAL_W - 14;
const MTOP = 32;
const MBOTTOM = VIRTUAL_H - 40;

function meterY(progress: number): number {
  return Math.round(MBOTTOM - progress * (MBOTTOM - MTOP));
}

// 『よだかの星』— 高度を昇るよだか（プレイ画面は専用背景・専用BGMで刷新）
export const YODAKA_THEME: SceneTheme = {
  key: "yodaka",
  palette: NIGHT,
  accent: "#9fc7ff",
  bgmKey: "yodaka_flight",
  makeBackdrop: () => new YodakaBackdrop(),
  drawMeter(g, progress, t) {
    const y = meterY(progress);
    g.fillStyle = shade(NIGHT, 1);
    g.fillRect(MX, MTOP, 1, MBOTTOM - MTOP);
    g.fillStyle = shade(NIGHT, 2);
    for (let yy = y; yy < MBOTTOM; yy += 3) g.fillRect(MX, yy, 1, 1);
    // 目指す先＝月（ゴール）を頂上にひとつ
    const moonTw = (Math.sin(t * 2) + 1) / 2 > 0.5;
    g.fillStyle = moonTw ? "#cdd7f0" : shade(NIGHT, 3);
    g.fillRect(MX - 1, MTOP - 4, 3, 3);
    drawYodaka(g, MX, y, flapFrame(t, 8), NIGHT, 2, 3);
  },
};

// 『銀河鐵道の夜』— 銀河を進む夜汽車
export const GINGA_THEME: SceneTheme = {
  key: "ginga",
  palette: GALAXY,
  accent: "#9fe0d0",
  bgmKey: "ginga",
  makeBackdrop: () => new GingaBackdrop(),
  drawMeter(g, progress, t) {
    const y = meterY(progress);
    // 線路
    g.fillStyle = shade(GALAXY, 1);
    g.fillRect(MX, MTOP, 1, MBOTTOM - MTOP);
    // 通過済みの光跡
    g.fillStyle = shade(GALAXY, 2);
    for (let yy = y; yy < MBOTTOM; yy += 2) g.fillRect(MX, yy, 1, 1);
    // 小さな汽車
    const wob = Math.round(Math.sin(t * 8) * 1);
    g.fillStyle = shade(GALAXY, 3);
    g.fillRect(MX - 2, y + wob, 5, 3);
    g.fillStyle = shade(GALAXY, 2);
    g.fillRect(MX - 2, y - 1 + wob, 2, 1); // 煙突
    g.fillStyle = "#9fe0d0";
    g.fillRect(MX + 1, y + wob, 1, 1); // 前照灯
  },
};

// 『グスコーブドリの伝記』— 昇る噴煙
export const BUDORI_THEME: SceneTheme = {
  key: "budori",
  palette: VOLCANO,
  accent: "#ffa055",
  bgmKey: "budori",
  makeBackdrop: () => new BudoriBackdrop(),
  drawMeter(g, progress, t) {
    const y = meterY(progress);
    g.fillStyle = shade(VOLCANO, 1);
    g.fillRect(MX, MTOP, 1, MBOTTOM - MTOP);
    // 立ちのぼる噴煙柱（進捗ぶん）
    g.fillStyle = shade(VOLCANO, 2);
    g.fillRect(MX, y, 1, MBOTTOM - y);
    // 先端のパフ
    const puff = 1 + Math.round((Math.sin(t * 5) + 1) * 1.2);
    g.fillStyle = shade(VOLCANO, 3);
    g.fillRect(MX - puff, y - puff, puff * 2, puff * 2);
    g.fillStyle = "#ff7a2a";
    g.fillRect(MX, MBOTTOM - 2, 1, 2); // 火口の火
  },
};

// 『オツベルと象』— 元気を取り戻す白象
export const OTSUBERU_THEME: SceneTheme = {
  key: "otsuberu",
  palette: PASTURE,
  accent: "#f4e08a",
  bgmKey: "otsuberu",
  makeBackdrop: () => new OtsuberuBackdrop(),
  drawMeter(g, progress, t) {
    const y = meterY(progress);
    g.fillStyle = shade(PASTURE, 1);
    g.fillRect(MX, MTOP, 1, MBOTTOM - MTOP);
    g.fillStyle = shade(PASTURE, 2);
    for (let yy = y; yy < MBOTTOM; yy += 3) g.fillRect(MX, yy, 1, 1);
    // 小さな白象（進むほど背筋が伸びる＝上へ）
    const nod = Math.round(Math.sin(t * 3) * 1);
    g.fillStyle = "#eef2ee";
    g.fillRect(MX - 2, y + nod, 5, 4); // 胴
    g.fillRect(MX + 2, y - 1 + nod, 3, 3); // 頭
    g.fillRect(MX + 4, y + 1 + nod, 1, 2); // 鼻
  },
};

// 『ざしき童子のはなし』— 濃くなる気配
export const ZASHIKI_THEME: SceneTheme = {
  key: "zashiki",
  palette: ZASHIKI_P,
  accent: "#e8a24a",
  bgmKey: "zashiki",
  makeBackdrop: () => new ZashikiBackdrop(),
  drawMeter(g, progress, t) {
    const y = meterY(progress);
    g.fillStyle = shade(ZASHIKI_P, 1);
    g.fillRect(MX, MTOP, 1, MBOTTOM - MTOP);
    // 気配の影が下から立ちのぼる
    g.fillStyle = shade(ZASHIKI_P, 2);
    for (let yy = y; yy < MBOTTOM; yy += 2) g.fillRect(MX, yy, 1, 1);
    // 小さな子どもの影（またたく）
    const flick = (Math.sin(t * 3) + 1) / 2 > 0.4;
    g.fillStyle = flick ? "#e8a24a" : shade(ZASHIKI_P, 2);
    g.fillRect(MX - 1, y, 3, 3); // 頭
    g.fillRect(MX - 1, y + 3, 3, 4); // 胴
  },
};

// 特別章『オノマトペの野原』— 風に舞い上がる木の葉
// 4章を1テーマで共有していた頃の定義。章別テーマへ移行した現在は未使用だが、残してある。
export const ONO_THEME: SceneTheme = {
  key: "onomatope",
  palette: ONO_P,
  accent: "#ffe27a",
  bgmKey: "onomatope",
  makeBackdrop: () => new OnomatopoeiaBackdrop(),
  drawMeter(g, progress, t) {
    const y = meterY(progress);
    g.fillStyle = shade(ONO_P, 1);
    g.fillRect(MX, MTOP, 1, MBOTTOM - MTOP);
    // 通過した風の道
    g.fillStyle = shade(ONO_P, 2);
    for (let yy = y; yy < MBOTTOM; yy += 3) g.fillRect(MX, yy, 1, 1);
    // 舞い上がる木の葉（くるくる回る）
    const spin = Math.sin(t * 6);
    const wob = Math.round(Math.sin(t * 3) * 2);
    g.fillStyle = "#ffe27a";
    if (spin > 0) {
      g.fillRect(MX - 1 + wob, y, 3, 1); // 横向き
    } else {
      g.fillRect(MX + wob, y - 1, 1, 3); // 縦向き
    }
    g.fillStyle = shade(ONO_P, 3);
    g.fillRect(MX + wob, y, 1, 1);
  },
};

// ── 特別編『オノマトペ』（章別テーマ）──
// メーターも章ごとに主役を変える。何が進んでいるのかが一目でわかるようにする。

// 音の一『風とそらの声』— 吹き上がる木の実
export const ONO_KAZE_THEME: SceneTheme = {
  key: "ono_kaze",
  palette: ONO_KAZE_P,
  accent: "#ffe27a",
  bgmKey: "ono_kaze",
  makeBackdrop: () => new OnoKazeBackdrop(),
  drawMeter(g, progress, t) {
    const y = meterY(progress);
    g.fillStyle = shade(ONO_KAZE_P, 1);
    g.fillRect(MX, MTOP, 1, MBOTTOM - MTOP);
    // 通り過ぎた風の道
    g.fillStyle = shade(ONO_KAZE_P, 2);
    for (let yy = y; yy < MBOTTOM; yy += 3) g.fillRect(MX, yy, 1, 1);
    // 吹き上がる木の実（回るので縦横が入れ替わる）
    const wob = Math.round(Math.sin(t * 4) * 2);
    g.fillStyle = "#ffe27a";
    if (Math.sin(t * 7) > 0) g.fillRect(MX - 1 + wob, y, 3, 1);
    else g.fillRect(MX + wob, y - 1, 1, 3);
  },
};

// 音の二『水とひかりの声』— 水面へのぼる泡
export const ONO_MIZU_THEME: SceneTheme = {
  key: "ono_mizu",
  palette: ONO_MIZU_P,
  accent: "#ffe9a0",
  bgmKey: "ono_mizu",
  makeBackdrop: () => new OnoMizuBackdrop(),
  drawMeter(g, progress, t) {
    const y = meterY(progress);
    g.fillStyle = shade(ONO_MIZU_P, 1);
    g.fillRect(MX, MTOP, 1, MBOTTOM - MTOP);
    // すでにのぼった泡の跡
    g.fillStyle = shade(ONO_MIZU_P, 2);
    for (let yy = y; yy < MBOTTOM; yy += 4) g.fillRect(MX, yy, 1, 1);
    // 先頭の泡（ゆらぎながらのぼる）
    const wob = Math.round(Math.sin(t * 3) * 1);
    g.fillStyle = shade(ONO_MIZU_P, 3);
    g.fillRect(MX + wob, y - 1, 2, 2);
    // 目指す先＝水面
    g.fillStyle = "#ffe9a0";
    g.fillRect(MX - 1, MTOP - 3, 3, 1);
  },
};

// 音の三『けものたちの声』— 雪に増えていく足あと
export const ONO_IKIMONO_THEME: SceneTheme = {
  key: "ono_ikimono",
  palette: ONO_IKIMONO_P,
  accent: "#ffd2a0",
  bgmKey: "ono_ikimono",
  makeBackdrop: () => new OnoIkimonoBackdrop(),
  drawMeter(g, progress, t) {
    const y = meterY(progress);
    g.fillStyle = shade(ONO_IKIMONO_P, 1);
    g.fillRect(MX, MTOP, 1, MBOTTOM - MTOP);
    // 歩いてきた足あと（左右に振れる）
    g.fillStyle = shade(ONO_IKIMONO_P, 2);
    for (let yy = y; yy < MBOTTOM; yy += 5) {
      g.fillRect(MX + ((yy % 10 === 0) ? -1 : 1), yy, 1, 1);
    }
    // 先頭のけもの（足を交互に出す）
    const step = Math.sin(t * 8) > 0 ? 1 : -1;
    g.fillStyle = "#ffd2a0";
    g.fillRect(MX - 1, y, 3, 2);
    g.fillRect(MX - 1 + (step > 0 ? 0 : 2), y + 2, 1, 1);
  },
};

// 音の四『こころの声』— 脈打つ灯り
export const ONO_KOKORO_THEME: SceneTheme = {
  key: "ono_kokoro",
  palette: ONO_KOKORO_P,
  accent: "#ffb3b3",
  bgmKey: "ono_kokoro",
  makeBackdrop: () => new OnoKokoroBackdrop(),
  drawMeter(g, progress, t) {
    const y = meterY(progress);
    g.fillStyle = shade(ONO_KOKORO_P, 1);
    g.fillRect(MX, MTOP, 1, MBOTTOM - MTOP);
    // 灯りが通ったあとの残り火
    g.fillStyle = shade(ONO_KOKORO_P, 2);
    for (let yy = y; yy < MBOTTOM; yy += 3) g.fillRect(MX, yy, 1, 1);
    // 鼓動する灯り。ドッ・ドッの二連打で大きさが変わる。
    const phase = (t * 1.1) % 1;
    const beat = phase < 0.12 ? 1 : phase < 0.26 ? 0 : phase < 0.36 ? 0.6 : 0;
    g.fillStyle = "#ffb3b3";
    g.fillRect(MX - 1, y - 1, 3, 3);
    if (beat > 0.5) {
      g.fillStyle = shade(ONO_KOKORO_P, 3);
      g.fillRect(MX - 2, y, 5, 1);
      g.fillRect(MX, y - 2, 1, 5);
    }
  },
};

// ── 詩歌編（専用テーマ）──

// 『永訣の朝』欠けた陶椀に雪が積もる
export const EIKETSU_THEME: SceneTheme = {
  key: "eiketsu",
  palette: SLEET,
  accent: "#f6c8c8",
  bgmKey: "eiketsu",
  makeBackdrop: () => new EiketsuBackdrop(),
  drawMeter(g, progress, t) {
    const y = meterY(progress);
    g.fillStyle = shade(SLEET, 1);
    g.fillRect(MX, MTOP, 1, MBOTTOM - MTOP);
    g.fillStyle = shade(SLEET, 2);
    for (let yy = y; yy < MBOTTOM; yy += 3) g.fillRect(MX, yy, 1, 1);
    // 陶椀（欠け）＋積もる雪
    g.fillStyle = shade(SLEET, 2);
    g.fillRect(MX - 3, y + 2, 7, 1);
    g.fillRect(MX - 2, y + 3, 1, 1);
    g.fillRect(MX + 2, y + 3, 1, 1);
    g.fillRect(MX - 3, y + 1, 2, 1); // 欠け
    const snow = Math.round(progress * 3);
    g.fillStyle = "#eef2f5";
    if (snow > 0) g.fillRect(MX - 2 + Math.round(Math.sin(t * 3)), y + 2 - snow, 4, snow);
  },
};

// 『雨ニモマケズ』実る稲穂
export const AMENIMO_THEME: SceneTheme = {
  key: "amenimo",
  palette: RAIN,
  accent: "#e8d48a",
  bgmKey: "amenimo",
  makeBackdrop: () => new AmenimoBackdrop(),
  drawMeter(g, progress, t) {
    const y = meterY(progress);
    g.fillStyle = shade(RAIN, 1);
    g.fillRect(MX, MTOP, 1, MBOTTOM - MTOP);
    // 茎
    g.fillStyle = shade(RAIN, 2);
    g.fillRect(MX, y, 1, MBOTTOM - y);
    // 穂（進捗で黄金に、頭を垂れる）
    const gold = progress > 0.5;
    g.fillStyle = gold ? "#e8d48a" : shade(RAIN, 2);
    const droop = Math.round(progress * 2 + Math.sin(t * 2));
    for (let i = 0; i < 5; i++) g.fillRect(MX - 1 + droop, y - 5 + i, 2, 1);
  },
};

// 『春と修羅（序）』満ちる青いフィラメント
export const HARUSHURA_THEME: SceneTheme = {
  key: "harushura",
  palette: LAMP,
  accent: "#8fe0ff",
  bgmKey: "harushura",
  makeBackdrop: () => new HarushuraBackdrop(),
  drawMeter(g, progress, t) {
    const y = meterY(progress);
    g.fillStyle = shade(LAMP, 1);
    g.fillRect(MX, MTOP, 1, MBOTTOM - MTOP);
    // 満ちた青い光
    g.fillStyle = shade(LAMP, 2);
    g.fillRect(MX, y, 1, MBOTTOM - y);
    // 照明（脈打つ光輪）
    const pulse = (Math.sin(t * 4) + 1) / 2;
    g.fillStyle = pulse > 0.4 ? "#8fe0ff" : shade(LAMP, 3);
    g.fillRect(MX, y, 1, 2);
    if (pulse > 0.5) {
      g.globalAlpha = 0.5;
      g.fillRect(MX - 1, y, 1, 1);
      g.fillRect(MX + 1, y, 1, 1);
      g.globalAlpha = 1;
    }
  },
};

// 『青森挽歌』赤く満ちる水素のりんご
export const AOMORI_THEME: SceneTheme = {
  key: "aomori",
  palette: AQUA,
  accent: "#ffb5a6",
  bgmKey: "aomori",
  makeBackdrop: () => new AomoriBackdrop(),
  drawMeter(g, progress, t) {
    const y = meterY(progress);
    g.fillStyle = shade(AQUA, 1);
    g.fillRect(MX, MTOP, 1, MBOTTOM - MTOP);
    g.fillStyle = shade(AQUA, 2);
    for (let yy = y; yy < MBOTTOM; yy += 2) g.fillRect(MX, yy, 1, 1);
    // りんご（下から赤く満ちる）
    const wob = Math.round(Math.sin(t * 3));
    g.fillStyle = shade(AQUA, 2);
    for (let dy = -2; dy <= 2; dy++) {
      const w = Math.floor(Math.sqrt(Math.max(0, 4 - dy * dy)));
      g.fillRect(MX - w + wob, y + dy, w * 2, 1);
    }
    const fill = Math.round(progress * 4);
    g.fillStyle = "#ff6a5a";
    for (let dy = 2; dy > 2 - fill; dy--) {
      const w = Math.floor(Math.sqrt(Math.max(0, 4 - dy * dy)));
      g.fillRect(MX - w + wob, y + dy, w * 2, 1);
    }
    g.fillStyle = shade(AQUA, 3);
    g.fillRect(MX + wob, y - 3, 1, 1); // 軸
  },
};

// 『恋と病熱』燭台の茎を昇る薔薇の火
export const KOIBYO_THEME: SceneTheme = {
  key: "koibyo",
  palette: KOIBYO_P,
  accent: "#ff9a8a",
  bgmKey: "koibyo",
  makeBackdrop: () => new KoibyoBackdrop(),
  drawMeter(g, progress, t) {
    const y = meterY(progress);
    g.fillStyle = shade(KOIBYO_P, 1);
    g.fillRect(MX, MTOP, 1, MBOTTOM - MTOP);
    // 茎（通過ぶん）
    g.fillStyle = shade(KOIBYO_P, 2);
    g.fillRect(MX, y, 1, MBOTTOM - y);
    // 薔薇の火（揺らめく花）
    const flick = (Math.sin(t * 7) + 1) / 2;
    g.fillStyle = flick > 0.4 ? "#ff9a8a" : shade(KOIBYO_P, 3);
    g.fillRect(MX - 1, y - 2, 3, 3);
    g.fillRect(MX, y - 3, 1, 1);
    if (flick > 0.6) {
      g.globalAlpha = 0.5;
      g.fillRect(MX - 2, y - 1, 1, 1);
      g.fillRect(MX + 2, y - 1, 1, 1);
      g.globalAlpha = 1;
    }
  },
};

// 『雲の信号』ポールを昇る信号旗
export const KUMOSHINGO_THEME: SceneTheme = {
  key: "kumoshingo",
  palette: SHINGO_P,
  accent: "#ffd870",
  bgmKey: "kumoshingo",
  makeBackdrop: () => new KumoShingoBackdrop(),
  drawMeter(g, progress, t) {
    const y = meterY(progress);
    // ポール
    g.fillStyle = shade(SHINGO_P, 1);
    g.fillRect(MX, MTOP, 1, MBOTTOM - MTOP);
    g.fillStyle = shade(SHINGO_P, 0);
    g.fillRect(MX - 2, MTOP - 1, 5, 1); // 横木
    // 旗（雲・はためく）
    const wave = Math.round(Math.sin(t * 5) * 1);
    g.fillStyle = shade(SHINGO_P, 3);
    g.fillRect(MX + 1, y - 2, 5, 3);
    g.fillRect(MX + 6, y - 1 + wave, 2, 1);
    g.fillStyle = progress > 0.8 ? "#ffd870" : shade(SHINGO_P, 2);
    g.fillRect(MX + 1, y + 1, 4, 1);
  },
};

// 『眼にて云ふ』昇る風の粒と嫩芽
export const MENITE_THEME: SceneTheme = {
  key: "menite",
  palette: MENITE_P,
  accent: "#bfe8ff",
  bgmKey: "menite",
  makeBackdrop: () => new MeniteBackdrop(),
  drawMeter(g, progress, t) {
    const y = meterY(progress);
    g.fillStyle = shade(MENITE_P, 1);
    g.fillRect(MX, MTOP, 1, MBOTTOM - MTOP);
    // 通過した風の道
    g.fillStyle = shade(MENITE_P, 2);
    for (let yy = y; yy < MBOTTOM; yy += 3) g.fillRect(MX, yy, 1, 1);
    // 風の粒（螺旋を描いて昇る）
    for (let i = 0; i < 3; i++) {
      const py = y + i * 4;
      const px = MX + Math.round(Math.sin(t * 4 + i * 2) * 2);
      g.fillStyle = i === 0 ? "#bfe8ff" : shade(MENITE_P, 3);
      g.fillRect(px, py, 1, 1);
    }
    // 嫩芽（根元）
    g.fillStyle = shade(MENITE_P, 2);
    g.fillRect(MX - 1, MBOTTOM - 2, 1, 2);
    g.fillRect(MX + 1, MBOTTOM - 3, 1, 3);
  },
};

// 『春の蛾』綱を昇る小さなバケツ
export const HARUGA_THEME: SceneTheme = {
  key: "haruga",
  palette: HARUGA_P,
  accent: "#ffd45e",
  bgmKey: "haruga",
  makeBackdrop: () => new HarugaBackdrop(),
  drawMeter(g, progress, t) {
    const y = meterY(progress);
    // 井戸の綱
    g.fillStyle = shade(HARUGA_P, 1);
    g.fillRect(MX, MTOP, 1, MBOTTOM - MTOP);
    g.fillStyle = shade(HARUGA_P, 2);
    g.fillRect(MX, MTOP, 1, y - MTOP); // 巻き上げた綱
    // バケツ（揺れる）
    const sway = Math.round(Math.sin(t * 3) * 1);
    g.fillStyle = shade(HARUGA_P, 3);
    g.fillRect(MX - 2 + sway, y, 5, 1); // 縁
    g.fillStyle = shade(HARUGA_P, 2);
    g.fillRect(MX - 2 + sway, y + 1, 5, 3);
    // 水面のきらめき
    if ((Math.sin(t * 6) + 1) / 2 > 0.6) {
      g.fillStyle = "#ffd45e";
      g.fillRect(MX + sway, y, 1, 1);
    }
  },
};

// 『無声慟哭』茎を昇り咲く白い花
export const MUSEI_THEME: SceneTheme = {
  key: "musei",
  palette: MUSEI_P,
  accent: "#f4fff4",
  bgmKey: "musei",
  makeBackdrop: () => new MuseiBackdrop(),
  drawMeter(g, progress, t) {
    const y = meterY(progress);
    g.fillStyle = shade(MUSEI_P, 1);
    g.fillRect(MX, MTOP, 1, MBOTTOM - MTOP);
    // 茎
    g.fillStyle = shade(MUSEI_P, 2);
    g.fillRect(MX, y, 1, MBOTTOM - y);
    // 通過点に小さな花
    for (let yy = y + 6; yy < MBOTTOM; yy += 9) {
      g.fillStyle = shade(MUSEI_P, 3);
      g.fillRect(MX - 1, yy, 1, 1);
    }
    // 先端の白い花（またたく）
    const tw = (Math.sin(t * 4) + 1) / 2;
    g.fillStyle = tw > 0.4 ? "#f4fff4" : shade(MUSEI_P, 3);
    g.fillRect(MX, y - 1, 1, 1);
    g.fillRect(MX - 1, y, 1, 1);
    g.fillRect(MX + 1, y, 1, 1);
    g.fillRect(MX, y + 1, 1, 1);
  },
};

// 『眠らう眠らう』振り子と昇る錘
export const NEMURAU_THEME: SceneTheme = {
  key: "nemurau",
  palette: NEMURAU_P,
  accent: "#ffb060",
  bgmKey: "nemurau",
  makeBackdrop: () => new NemurauBackdrop(),
  drawMeter(g, progress, t) {
    const y = meterY(progress);
    g.fillStyle = shade(NEMURAU_P, 1);
    g.fillRect(MX, MTOP, 1, MBOTTOM - MTOP);
    g.fillStyle = shade(NEMURAU_P, 2);
    for (let yy = y; yy < MBOTTOM; yy += 3) g.fillRect(MX, yy, 1, 1);
    // 振り子の錘（時を刻んで揺れながら昇る）
    const swing = Math.round(Math.sin(t * 2.4) * 2);
    g.fillStyle = shade(NEMURAU_P, 3);
    g.fillRect(MX + swing - 1, y, 3, 3);
    g.fillStyle = "#ffb060";
    g.fillRect(MX + swing, y + 1, 1, 1);
    // 吊り糸
    g.fillStyle = shade(NEMURAU_P, 2);
    g.fillRect(MX + Math.round(swing / 2), y - 3, 1, 3);
  },
};

// 『風がおもてで呼んでゐる』吹き上がるみぞれの粒
export const KAZEOMOTE_THEME: SceneTheme = {
  key: "kazeomote",
  palette: KAZE_P,
  accent: "#9fdcff",
  bgmKey: "kazeomote",
  makeBackdrop: () => new KazeomoteBackdrop(),
  drawMeter(g, progress, t) {
    const y = meterY(progress);
    g.fillStyle = shade(KAZE_P, 1);
    g.fillRect(MX, MTOP, 1, MBOTTOM - MTOP);
    // 吹き上がったみぞれの道
    g.fillStyle = shade(KAZE_P, 2);
    for (let yy = y; yy < MBOTTOM; yy += 2) {
      g.fillRect(MX + ((yy % 4) - 2 >= 0 ? 1 : -1), yy, 1, 1);
    }
    // 先頭の粒（風に暴れる）
    const jx = Math.round(Math.sin(t * 9) * 2);
    g.fillStyle = "#9fdcff";
    g.fillRect(MX + jx, y, 2, 1);
    g.fillStyle = shade(KAZE_P, 3);
    g.fillRect(MX + jx - 2, y + 1, 2, 1);
  },
};

// 『告別』夜空へ放たれる音符
export const KOKUBETSU_THEME: SceneTheme = {
  key: "kokubetsu",
  palette: KOKUBETSU_P,
  accent: "#f0e6b8",
  bgmKey: "kokubetsu",
  makeBackdrop: () => new KokubetsuBackdrop(),
  drawMeter(g, progress, t) {
    const y = meterY(progress);
    g.fillStyle = shade(KOKUBETSU_P, 1);
    g.fillRect(MX, MTOP, 1, MBOTTOM - MTOP);
    g.fillStyle = shade(KOKUBETSU_P, 2);
    for (let yy = y; yy < MBOTTOM; yy += 3) g.fillRect(MX, yy, 1, 1);
    // のぼる音符
    const bob = Math.round(Math.sin(t * 4) * 1);
    g.fillStyle = "#f0e6b8";
    g.fillRect(MX, y + bob, 1, 1);
    g.fillRect(MX + 1, y - 1 + bob, 1, 1);
    g.fillStyle = shade(KOKUBETSU_P, 3);
    g.fillRect(MX + 1, y + bob, 1, 1);
  },
};

// 『生徒諸君に寄せる』光になって昇る生徒
export const SEITO_THEME: SceneTheme = {
  key: "seito",
  palette: SEITO_P,
  accent: "#ffe9a8",
  bgmKey: "seito",
  makeBackdrop: () => new SeitoBackdrop(),
  drawMeter(g, progress, t) {
    const y = meterY(progress);
    g.fillStyle = shade(SEITO_P, 1);
    g.fillRect(MX, MTOP, 1, MBOTTOM - MTOP);
    g.fillStyle = shade(SEITO_P, 2);
    for (let yy = y; yy < MBOTTOM; yy += 3) g.fillRect(MX, yy, 1, 1);
    // 光の粒（明滅しながら昇る）
    const tw = (Math.sin(t * 5) + 1) / 2;
    g.fillStyle = tw > 0.4 ? "#ffe9a8" : shade(SEITO_P, 3);
    g.fillRect(MX, y, 1, 2);
    if (tw > 0.6) {
      g.globalAlpha = 0.5;
      g.fillRect(MX - 1, y, 1, 1);
      g.fillRect(MX + 1, y, 1, 1);
      g.globalAlpha = 1;
    }
  },
};

// 『夜』ひとつの灯火
export const YORU_THEME: SceneTheme = {
  key: "yoru",
  palette: YORU_P,
  accent: "#e8b26a",
  bgmKey: "yoru",
  makeBackdrop: () => new YoruBackdrop(),
  drawMeter(g, progress, t) {
    const y = meterY(progress);
    g.fillStyle = shade(YORU_P, 1);
    g.fillRect(MX, MTOP, 1, MBOTTOM - MTOP);
    // 灯（控えめに揺れる小さな炎ひとつ）
    const flick = (Math.sin(t * 9) + 1) / 2;
    g.fillStyle = flick > 0.5 ? "#e8b26a" : shade(YORU_P, 2);
    g.fillRect(MX, y, 1, 2);
    g.fillStyle = shade(YORU_P, 1);
    g.fillRect(MX, y + 2, 1, 2);
  },
};

// 『水汲み』きらめく水しぶき
export const MIZUKUMI_THEME: SceneTheme = {
  key: "mizukumi",
  palette: MIZUKUMI_P,
  accent: "#e8fbf4",
  bgmKey: "mizukumi",
  makeBackdrop: () => new MizukumiBackdrop(),
  drawMeter(g, progress, t) {
    const y = meterY(progress);
    g.fillStyle = shade(MIZUKUMI_P, 1);
    g.fillRect(MX, MTOP, 1, MBOTTOM - MTOP);
    g.fillStyle = shade(MIZUKUMI_P, 2);
    for (let yy = y; yy < MBOTTOM; yy += 2) g.fillRect(MX, yy, 1, 1);
    // 水しぶきの粒（きらめき）
    const tw = (Math.sin(t * 7) + 1) / 2;
    g.fillStyle = tw > 0.5 ? "#e8fbf4" : shade(MIZUKUMI_P, 3);
    g.fillRect(MX, y, 1, 1);
    const wob = Math.round(Math.sin(t * 3) * 1);
    g.fillRect(MX + wob, y - 2, 1, 1);
  },
};

const REGISTRY: Record<string, SceneTheme> = {
  yodaka: YODAKA_THEME,
  ginga: GINGA_THEME,
  budori: BUDORI_THEME,
  zashiki: ZASHIKI_THEME,
  otsuberu: OTSUBERU_THEME,
  // 特別編（オノマトペ）— ジャンル別の4章に、それぞれ専用の背景・パレット・BGM。
  ono_kaze: ONO_KAZE_THEME,
  ono_mizu: ONO_MIZU_THEME,
  ono_ikimono: ONO_IKIMONO_THEME,
  ono_kokoro: ONO_KOKORO_THEME,
  // 旧・共通テーマ（章別化する前の姿）。参照は外したが残してある。
  onomatope: ONO_THEME,
  // 詩歌編（専用テーマ）
  eiketsu: EIKETSU_THEME,
  amenimo: AMENIMO_THEME,
  harushura: HARUSHURA_THEME,
  aomori: AOMORI_THEME,
  koibyo: KOIBYO_THEME,
  kumoshingo: KUMOSHINGO_THEME,
  menite: MENITE_THEME,
  haruga: HARUGA_THEME,
  musei: MUSEI_THEME,
  nemurau: NEMURAU_THEME,
  kazeomote: KAZEOMOTE_THEME,
  kokubetsu: KOKUBETSU_THEME,
  seito: SEITO_THEME,
  yoru: YORU_THEME,
  mizukumi: MIZUKUMI_THEME,
};

export function themeForStory(key: string): SceneTheme {
  // 分割章（yodaka-2 など）は原本キーのテーマを共有する。
  return REGISTRY[key] ?? REGISTRY[baseStoryKey(key)] ?? YODAKA_THEME;
}
