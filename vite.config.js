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
        
        // Copy icons
        copyFileSync('public/icon-16.png', 'dist/icon-16.png');
        copyFileSync('public/icon-48.png', 'dist/icon-48.png');
        copyFileSync('public/icon-128.png', 'dist/icon-128.png');
        
        // Copy background script directly (no bundling needed)
        copyFileSync('src/background/background.js', 'dist/background.js');
        
        // Move HTML files to root of dist
        if (existsSync('dist/src/popup/popup.html')) {
          renameSync('dist/src/popup/popup.html', 'dist/popup.html');
        }
        if (existsSync('dist/src/history/history.html')) {
          renameSync('dist/src/history/history.html', 'dist/history.html');
        }
        if (existsSync('dist/src/limits/limits.html')) {
          renameSync('dist/src/limits/limits.html', 'dist/limits.html');
        }
        if (existsSync('dist/src/blocked/blocked.html')) {
          renameSync('dist/src/blocked/blocked.html', 'dist/blocked.html');
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
        limits: resolve(__dirname, 'src/limits/limits.html'),
        blocked: resolve(__dirname, 'src/blocked/blocked.html'),
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
          if (chunkInfo.name === 'limits') {
            return 'limits.js';
          }
          if (chunkInfo.name === 'blocked') {
            return 'blocked.js';
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

