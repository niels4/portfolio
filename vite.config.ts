import { defineConfig } from "vite"

// https://vite.dev/config/
export default defineConfig({
  // The source lives in source/. The build writes index.html to the repo root and every file it loads to public/.
  root: "source",
  // Relative asset paths work under any prefix, such as a GitHub Pages project path.
  base: "./",
  // source/public holds files kept under their own names (the manifest's icons, favicon.ico); the build script
  // copies them into public/, since Vite would copy them to the repo root.
  publicDir: false,
  // Emptying the repo root would delete the source; the build script clears the old output instead.
  build: { outDir: "..", assetsDir: "public", emptyOutDir: false },
})
