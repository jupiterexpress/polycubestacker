import { defineConfig } from 'vite';

// Relative asset paths so the built game runs from the iOS app bundle (Capacitor) and offline.
export default defineConfig({
  base: './',
  build: { outDir: 'dist', target: 'es2019', assetsInlineLimit: 0, chunkSizeWarningLimit: 900 },
  server: { host: true },
});
