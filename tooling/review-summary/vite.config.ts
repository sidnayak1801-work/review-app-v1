import { defineConfig } from "vite";
import tailwindcss from "@tailwindcss/vite";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const extensionAssets = path.resolve(
  __dirname,
  "../../extensions/review-widget/assets",
);

export default defineConfig({
  // Theme App Extension assets only allow js/css/images — never copy Vite's public/favicon.
  publicDir: false,
  plugins: [tailwindcss()],
  build: {
    outDir: extensionAssets,
    emptyOutDir: false,
    lib: {
      entry: path.resolve(__dirname, "src/main.ts"),
      name: "ReviewXSummary",
      formats: ["iife"],
      fileName: () => "review-summary.js",
    },
    rollupOptions: {
      output: {
        assetFileNames: (assetInfo) => {
          if (assetInfo.name?.endsWith(".css")) {
            return "review-summary.css";
          }
          if (assetInfo.name?.endsWith(".ico")) {
            return "ignored/[name][extname]";
          }
          return assetInfo.name ?? "asset-[name][extname]";
        },
      },
    },
    cssCodeSplit: false,
    minify: true,
  },
});
