import { defineConfig } from "vite";
import { resolve } from "node:path";

// GitHub Pages 等の静的配信でも動くよう相対パス basename を採用。
export default defineConfig({
  base: "./",
  server: {
    open: true,
  },
  build: {
    // 複数ページ構成。入り口の / がゲーム本体で、それ以外は読み物ページ。
    // ここに書いたHTMLだけが dist へ出力されるので、ページを増やしたら必ず追記する。
    rollupOptions: {
      input: {
        // 入り口はゲーム本体（/）。play/ は旧URL救済の転送ページ。
        home: resolve(__dirname, "index.html"),
        play: resolve(__dirname, "play/index.html"),
        works: resolve(__dirname, "works/index.html"),
        howToPlay: resolve(__dirname, "how-to-play/index.html"),
        tips: resolve(__dirname, "tips/index.html"),
        about: resolve(__dirname, "about/index.html"),
        contact: resolve(__dirname, "contact/index.html"),
        privacy: resolve(__dirname, "privacy/index.html"),
      },
    },
  },
});
