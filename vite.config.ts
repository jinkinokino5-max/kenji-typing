import { defineConfig } from "vite";

// GitHub Pages 等の静的配信でも動くよう相対パス basename を採用。
export default defineConfig({
  base: "./",
  server: {
    open: true,
  },
});
