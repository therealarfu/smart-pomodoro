import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// base: './' uses relative asset paths, so the same build works whether
// it's served from a domain root (Vercel) or a GitHub Pages subpath
// like https://usuario.github.io/repositorio/ — no extra config needed.
export default defineConfig({
  plugins: [react()],
  base: "./",
});
