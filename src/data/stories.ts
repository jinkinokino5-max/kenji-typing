import type { Story } from "./story";
import { YODAKA } from "./yodaka";
import { BUDORI } from "./budori";
import { ZASHIKI } from "./zashiki";
import { OTSUBERU } from "./otsuberu";
import { GINGA } from "./ginga";
import { ONO_KAZE, ONO_MIZU, ONO_IKIMONO, ONO_KOKORO } from "./onomatope";
import { AOMORI } from "./aomori";
import { EIKETSU } from "./eiketsu";
import { AMENIMO } from "./amenimo";
import { HARUSHURA } from "./harushura";
import { KOIBYO } from "./koibyo";
import { KUMOSHINGO } from "./kumoshingo";
import { MENITE } from "./menite";
import { HARUGA } from "./haruga";
import { MUSEI } from "./musei";
import { NEMURAU } from "./nemurau";
import { KAZEOMOTE } from "./kazeomote";
import { KOKUBETSU } from "./kokubetsu";
import { SEITO } from "./seito";
import { YORU } from "./yoru";
import { MIZUKUMI } from "./mizukumi";

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
    stories: [YODAKA, BUDORI, ZASHIKI, OTSUBERU, GINGA],
  },
  {
    key: "poem",
    label: "詩歌編",
    subtitle: "賢治の詩をうつ",
    stories: [
      EIKETSU, AMENIMO, HARUSHURA, AOMORI,
      KOIBYO, KUMOSHINGO, MENITE, HARUGA, MUSEI, NEMURAU, KAZEOMOTE,
      KOKUBETSU, SEITO, YORU, MIZUKUMI,
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
