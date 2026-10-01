import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  cacheDir: path.resolve(__dirname, '.vite-cache-user'),
  plugins: [react()],
  resolve: {
    alias: {
      leaflet: path.resolve(__dirname, 'node-view-source/node_modules/leaflet'),
      react: path.resolve(__dirname, 'node_modules/react'),
      'react-dom': path.resolve(__dirname, 'node_modules/react-dom'),
      'react-router-dom': path.resolve(__dirname, 'node_modules/react-router-dom')
    },
    dedupe: ['react', 'react-dom', 'react-router-dom']
  },
  build: { outDir: 'dist', sourcemap: true },
  server: { port: 5173 }
});
