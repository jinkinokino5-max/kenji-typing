// 限定パレット定義。シーンごとに切り替えて宮沢賢治×GBの空気を作る。
// 4階調を基本とし、将来テーマ追加をここに集約する。

export interface Palette {
  readonly name: string;
  /** 暗→明の順。GBの4階調に相当。 */
  readonly shades: readonly [string, string, string, string];
}

// DMG（初代ゲームボーイ）風グリーン。
export const GB_GREEN: Palette = {
  name: "gb-green",
  shades: ["#0f380f", "#306230", "#8bac0f", "#9bbc0f"],
};

// 『よだかの星』夜空パレット。藍から銀へ。
export const NIGHT: Palette = {
  name: "night",
  shades: ["#0b1026", "#24304e", "#6f7ea8", "#cdd7f0"],
};

// 『銀河鐵道の夜』濃紺から乳白へ。
export const GALAXY: Palette = {
  name: "galaxy",
  shades: ["#05061a", "#1b2a55", "#6a7fc0", "#dfe6ff"],
};

// 『グスコーブドリの伝記』火山の暗赤から炎の黄へ。
export const VOLCANO: Palette = {
  name: "volcano",
  shades: ["#2a0f0f", "#6e2a17", "#c9662b", "#f2c14e"],
};

// 『オツベルと象』月夜の牧草地。深緑から淡い草色へ。
export const PASTURE: Palette = {
  name: "pasture",
  shades: ["#10261a", "#24402b", "#6f9463", "#cfe0a8"],
};

// 『ざしき童子のはなし』座敷の墨から生成りへ。和の静けさ。
export const ZASHIKI_P: Palette = {
  name: "zashiki",
  shades: ["#1a1712", "#3b332a", "#8a7d63", "#d8c9a8"],
};

// 特別章『オノマトペの野原』真昼の草原。青緑の空から生成りの光へ。
export const ONO_P: Palette = {
  name: "onomatope",
  shades: ["#123a4a", "#2f7a6a", "#6fc0a0", "#f0f6d8"],
};

// 詩歌編『永訣の朝』夜明け前のみぞれ。寒色から白へ。
export const SLEET: Palette = {
  name: "sleet",
  shades: ["#141a24", "#33404f", "#8fa6b8", "#eef2f5"],
};

// 詩歌編『雨ニモマケズ』野の雨。しっとりした緑から生成りへ。
export const RAIN: Palette = {
  name: "rain",
  shades: ["#10221f", "#264b3f", "#5f8f74", "#dfeadb"],
};

// 詩歌編『春と修羅（序）』有機交流電燈。濃紺から電青へ。
export const LAMP: Palette = {
  name: "lamp",
  shades: ["#070a1a", "#182a4a", "#4f7fb0", "#cfe4ff"],
};

// 詩歌編『青森挽歌』銀河の夜汽車＝水族館。水底の藍から乳白へ。
export const AQUA: Palette = {
  name: "aqua",
  shades: ["#04101c", "#123a44", "#4f9aa0", "#dff2ee"],
};

// 詩歌編『恋と病熱』青銅の病室。くすんだ銅緑から生成りへ。
export const KOIBYO_P: Palette = {
  name: "koibyo",
  shades: ["#141a12", "#33402a", "#7d8a5a", "#e8e0c0"],
};

// 詩歌編『雲の信号』青白い春の空。禁欲の淡青から白へ。
export const SHINGO_P: Palette = {
  name: "kumoshingo",
  shades: ["#1a2a40", "#3f6488", "#8fb4d0", "#f4f9fc"],
};

// 詩歌編『眼にて云ふ』きれいな青ぞら。深い藍から透明な白へ。
export const MENITE_P: Palette = {
  name: "menite",
  shades: ["#0e2038", "#28568a", "#68a4d4", "#eef8ff"],
};

// 詩歌編『春の蛾』アムバア（琥珀）の光。井戸の闇から琥珀色へ。
export const HARUGA_P: Palette = {
  name: "haruga",
  shades: ["#1a1206", "#4a3312", "#a8802e", "#f8e8b4"],
};

// 詩歌編『無声慟哭』青ぐらい修羅の野原。夜の底から白い花へ。
export const MUSEI_P: Palette = {
  name: "musei",
  shades: ["#0a1018", "#1c2e38", "#48706e", "#dcece4"],
};

// 詩歌編『眠らう眠らう』熱の夜とセピヤの記憶。焦げ茶から生成りへ。
export const NEMURAU_P: Palette = {
  name: "nemurau",
  shades: ["#160f08", "#3c2c1a", "#8a6c46", "#ecd8b4"],
};

// 詩歌編『風がおもてで呼んでゐる』みぞれの荒天。鉛色から風の白へ。
export const KAZE_P: Palette = {
  name: "kazeomote",
  shades: ["#0e1216", "#2a3a46", "#748ea0", "#e8f2f6"],
};

// 詩歌編『告別』夜空へ放たれる音符。深い藍から星明かりへ。
export const KOKUBETSU_P: Palette = {
  name: "kokubetsu",
  shades: ["#0b0f2a", "#232f5c", "#6a7ab0", "#dce4ff"],
};

// 詩歌編『生徒諸君に寄せる』宇宙の夜明け。濃紺から夜明けの金へ。
export const SEITO_P: Palette = {
  name: "seito",
  shades: ["#0a1030", "#1e2f66", "#5a6fae", "#ffe9a8"],
};

// 詩歌編『夜』灯火ひとつの病室。ほぼ黒から燭台の琥珀へ。
// shade 2 は文字色に使うため、もとの #6b3a2c（暗い赤茶）では暗い背景に埋もれた。
// 実測で唯一、暗幕を濃くしても直らない章だったので、灯りに寄せて明度を上げてある。
export const YORU_P: Palette = {
  name: "yoru",
  shades: ["#120a0c", "#301818", "#b07a52", "#e8b26a"],
};

// 詩歌編『水汲み』川面の水。深い水底の青緑から水しぶきの白へ。
export const MIZUKUMI_P: Palette = {
  name: "mizukumi",
  shades: ["#08222a", "#1c4a52", "#4f96a0", "#e8fbf4"],
};

/**
 * 2色の中間色。t=0 で a、t=1 で b。
 *
 * 4階調だけだと「明るすぎず、背景に溶けもしない」中間の文字色が作れない。
 * 打ち終えた文字のように “存在は見えるが目立たない” 色をここで作る。
 */
export function mix(a: string, b: string, t: number): string {
  const hex = (c: string) => {
    const h = c.replace("#", "");
    return [
      parseInt(h.slice(0, 2), 16),
      parseInt(h.slice(2, 4), 16),
      parseInt(h.slice(4, 6), 16),
    ];
  };
  const [r1, g1, b1] = hex(a);
  const [r2, g2, b2] = hex(b);
  const k = Math.max(0, Math.min(1, t));
  const to2 = (v: number) => Math.round(v).toString(16).padStart(2, "0");
  return `#${to2(r1 + (r2 - r1) * k)}${to2(g1 + (g2 - g1) * k)}${to2(b1 + (b2 - b1) * k)}`;
}

/** shade index(0-3) を色文字列へ。範囲外はクランプ。 */
export function shade(p: Palette, i: number): string {
  const idx = Math.max(0, Math.min(3, Math.round(i)));
  return p.shades[idx];
}
