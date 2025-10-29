import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';
import { copyFileSync, renameSync, existsSync, rmSync } from 'fs';

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'setup-extension',
      closeBundle() {
        // Copy manifest
        copyFileSync('public/manifest.json', 'dist/manifest.json');
        
        // Copy background script directly (no bundling needed)
        copyFileSync('src/background/background.js', 'dist/background.js');
        
        // Move HTML files to root of dist
        if (existsSync('dist/src/popup/popup.html')) {
          renameSync('dist/src/popup/popup.html', 'dist/popup.html');
        }
        if (existsSync('dist/src/history/history.html')) {
          renameSync('dist/src/history/history.html', 'dist/history.html');
        }
        
        // Clean up src folder
        if (existsSync('dist/src')) {
          rmSync('dist/src', { recursive: true, force: true });
        }
      }
    }
  ],
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        popup: resolve(__dirname, 'src/popup/popup.html'),
        history: resolve(__dirname, 'src/history/history.html'),
      },
      output: {
        entryFileNames: (chunkInfo) => {
          // Name the entry files based on their source
          if (chunkInfo.name === 'popup') {
            return 'popup.js';
          }
          if (chunkInfo.name === 'history') {
            return 'history.js';
          }
          return '[name].js';
        },
        chunkFileNames: 'client.js',
        assetFileNames: (assetInfo) => {
          if (assetInfo.name && assetInfo.name.includes('.html')) {
            return '[name][extname]';
          }
          return '[name][extname]';
        }
      }
    }
  }
});

