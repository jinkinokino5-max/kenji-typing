import type { Story } from "./story";
import { YODAKA_PARTS } from "./yodaka";
import { BUDORI_PARTS } from "./budori";
import { ZASHIKI_PARTS } from "./zashiki";
import { OTSUBERU_PARTS } from "./otsuberu";
import { GINGA_PARTS } from "./ginga";
import { ONO_KAZE, ONO_MIZU, ONO_IKIMONO, ONO_KOKORO } from "./onomatope";
import { AOMORI_PARTS } from "./aomori";
import { EIKETSU_PARTS } from "./eiketsu";
import { AMENIMO_PARTS } from "./amenimo";
import { HARUSHURA_PARTS } from "./harushura";
import { KOIBYO } from "./koibyo";
import { KUMOSHINGO } from "./kumoshingo";
import { MENITE_PARTS } from "./menite";
import { HARUGA_PARTS } from "./haruga";
import { MUSEI } from "./musei";
import { NEMURAU } from "./nemurau";
import { KAZEOMOTE_PARTS } from "./kazeomote";
import { KOKUBETSU_PARTS } from "./kokubetsu";
import { SEITO_PARTS } from "./seito";
import { YORU } from "./yoru";
import { MIZUKUMI_PARTS } from "./mizukumi";

// 「編（エディション）」で章をまとめる。
// 物語編＝童話、詩歌編＝詩、特別編＝言葉あそび（オノマトペ）。
export interface Edition {
  key: string;
  label: string;
  subtitle: string;
  stories: Story[];
}

export const EDITIONS: Edition[] = [
  {
    key: "story",
    label: "物語編",
    subtitle: "賢治の童話をたどる",
    // 長い章は splitStory() で #1／#2… に分割して並べる（12問以下の短い章はそのまま）。
    stories: [
      ...YODAKA_PARTS, ...BUDORI_PARTS, ...ZASHIKI_PARTS,
      ...OTSUBERU_PARTS, ...GINGA_PARTS,
    ],
  },
  {
    key: "poem",
    label: "詩歌編",
    subtitle: "賢治の詩をうつ",
    stories: [
      ...EIKETSU_PARTS, ...AMENIMO_PARTS, ...HARUSHURA_PARTS, ...AOMORI_PARTS,
      KOIBYO, KUMOSHINGO, ...MENITE_PARTS, ...HARUGA_PARTS, MUSEI, NEMURAU,
      ...KAZEOMOTE_PARTS, ...KOKUBETSU_PARTS, ...SEITO_PARTS, YORU,
      ...MIZUKUMI_PARTS,
    ],
  },
  {
    key: "special",
    label: "特別編",
    subtitle: "賢治のオノマトペ",
    stories: [ONO_KAZE, ONO_MIZU, ONO_IKIMONO, ONO_KOKORO],
  },
];

// 全章のフラット配列（storyByKey／deep-link／編集ページ／記録が参照）。
export const STORIES: Story[] = EDITIONS.flatMap((e) => e.stories);

export function storyByKey(key: string): Story | undefined {
  return STORIES.find((s) => s.key === key);
}

/** 指定章が属する編を返す。 */
export function editionOfStory(key: string): Edition | undefined {
  return EDITIONS.find((e) => e.stories.some((s) => s.key === key));
}

/** 同じ編の中での次章。編の末尾なら null。 */
export function nextStory(key: string): Story | null {
  const ed = editionOfStory(key);
  if (!ed) return null;
  const i = ed.stories.findIndex((s) => s.key === key);
  if (i < 0 || i + 1 >= ed.stories.length) return null;
  return ed.stories[i + 1];
}
