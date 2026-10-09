import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  base: "/concord-landing-concept/",
  build: { target: "es2022", chunkSizeWarningLimit: 700 },
});
