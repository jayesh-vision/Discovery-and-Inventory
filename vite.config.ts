import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const localLeaflet = path.resolve(__dirname, 'node-view-source/node_modules/leaflet');
const leafletPath = fs.existsSync(localLeaflet)
  ? localLeaflet
  : path.resolve(__dirname, 'node_modules/leaflet');

export default defineConfig({
  cacheDir: path.resolve(__dirname, '.vite-cache-user'),
  plugins: [react()],
  resolve: {
    alias: {
      leaflet: leafletPath,
      react: path.resolve(__dirname, 'node_modules/react'),
      'react-dom': path.resolve(__dirname, 'node_modules/react-dom'),
      'react-router-dom': path.resolve(__dirname, 'node_modules/react-router-dom')
    },
    dedupe: ['react', 'react-dom', 'react-router-dom']
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('react') || id.includes('react-dom') || id.includes('react-router-dom')) {
              return 'vendor-react';
            }
            if (id.includes('leaflet')) {
              return 'vendor-leaflet';
            }
            return undefined;
          }
          if (id.includes('node-view-source')) {
            return 'digital-twin';
          }
          if (id.includes('src/data/reports')) {
            return 'reports-data';
          }
        }
      }
    }
  },
  server: { port: 5173 }
});
