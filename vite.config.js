import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import tailwindcss from "@tailwindcss/vite";
import { fileURLToPath, URL } from "node:url";

const resolvePath = (path) => fileURLToPath(new URL(path, import.meta.url));

export default defineConfig({
  base: "./",
  plugins: [vue(), tailwindcss()],
  build: {
    rollupOptions: {
      input: {
        index: resolvePath("./index.html"),
        invitacion: resolvePath("./invitacion-vivian-alexis.html"),
      },
    },
  },
});
