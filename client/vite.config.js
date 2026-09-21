import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

/*
  GitHub Pages serves a project site from /<repo-name>/, so every asset URL
  needs that prefix. Set VITE_BASE in the deploy workflow to match the repo
  name. Local dev keeps "/" so nothing breaks.
*/

export default defineConfig({
  plugins: [react()],

  base: process.env.VITE_BASE || "/",

  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },

  build: {
    outDir: "dist",
    sourcemap: false,
  },
});
