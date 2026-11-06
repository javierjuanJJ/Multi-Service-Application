import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  build: {
    // Dockerfile.web copies /app/build into the Nginx image
    outDir: "build",
    emptyOutDir: true,
  },
  server: {
    port: 5173,
    proxy: {
      // Mirrors the /api/ route handled by Nginx in production
      "/api": {
        target: "http://localhost:4000",
        changeOrigin: true,
      },
    },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.{ts,tsx}"],
  },
});
