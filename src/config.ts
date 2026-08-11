// 公開版の設定値。ここだけ書き換えれば差し替えられるようにまとめてある。

/**
 * 感想フォーム（Googleフォーム）の URL。
 * 空文字のあいだは「ごいけん」画面が「準備中」と表示し、フォームは開かない。
 * 発行した Googleフォームの「送信」→ リンク の URL をそのまま貼る。
 */
export const FEEDBACK_FORM_URL =
  "https://docs.google.com/forms/d/e/1FAIpQLScnoMeU8Y906ecsE6FAHBw9y5On7GGHvsc2OFK_154vFCAvqw/viewform";

/**
 * 編集ページ（管理者用）をホーム画面に出すかどうか。
 * 一般の公開ページには出さず、URL に ?edit=1 を付けたときだけ項目が現れる。
 */
export function editModeEnabled(): boolean {
  try {
    return new URLSearchParams(location.search).get("edit") === "1";
  } catch {
    return false;
  }
}
