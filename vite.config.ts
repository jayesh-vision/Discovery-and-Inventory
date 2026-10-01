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
