import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import reactScan from "@react-scan/vite-plugin-react-scan";
import path from "path";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), reactScan()],
  server: {
    port: 3000,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
