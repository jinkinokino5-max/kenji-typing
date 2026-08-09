// 指定章の推奨ローマ字をJSONで出す（ブラウザ通しテストの入力生成用）。
import { TypingEngine } from "../src/typing/TypingEngine";
import { storyByKey } from "../src/data/stories";
const key = process.argv[2] ?? "yodaka";
const story = storyByKey(key)!;
console.log(JSON.stringify(story.questions.map((q) => new TypingEngine(q.kana).guide().text)));
