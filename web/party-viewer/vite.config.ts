import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  root: "web/party-viewer",
  server: {
    port: 5173,
    proxy: {
      "/api": {
        target: "http://localhost:3847",
        changeOrigin: true,
      },
    },
  },
});
