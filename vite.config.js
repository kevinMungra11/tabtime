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
        
        // Move popup.html to root of dist
        if (existsSync('dist/src/popup/popup.html')) {
          renameSync('dist/src/popup/popup.html', 'dist/popup.html');
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
      },
      output: {
        entryFileNames: 'popup.js',
        chunkFileNames: '[name].js',
        assetFileNames: (assetInfo) => {
          if (assetInfo.name && assetInfo.name.includes('popup.html')) {
            return 'popup.html';
          }
          return '[name].[ext]';
        }
      }
    }
  }
});

