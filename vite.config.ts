import { defineConfig } from "vite"

// https://vite.dev/config/
export default defineConfig({
  // Relative asset paths work under any prefix, such as a GitHub Pages project path.
  base: "./",
  // GitHub Pages serves the committed build from docs/.
  build: { outDir: "docs", emptyOutDir: true },
})
