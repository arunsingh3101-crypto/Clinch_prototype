import { defineConfig } from 'vite';

// Relative base so the build works from any sub-path (GitHub Pages, raw previews).
export default defineConfig({
  base: './',
  build: {
    outDir: 'play',
    emptyOutDir: true,
    assetsInlineLimit: 0,
    chunkSizeWarningLimit: 2000,
  },
  server: { host: true },
});
