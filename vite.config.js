import { defineConfig } from "vite";

export default defineConfig({
  build: {
    chunkSizeWarningLimit: 1300
  },
  server: {
    watch: {
      usePolling: true,
      interval: 250
    }
  }
});
