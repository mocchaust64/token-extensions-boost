import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { nodePolyfills } from 'vite-plugin-node-polyfills';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    nodePolyfills({
      globals: {
        Buffer: true,
        global: true,
        process: true,
      },
    }),
    react(),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      'token-extensions-boost': path.resolve(__dirname, './local-sdk.js'),
      buffer: 'buffer',
    },
  },
  server: {
    port: 3000,
    open: true,
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
    commonjsOptions: {
      transformMixedEsModules: true,
    },
    rollupOptions: {
      onwarn(warning, warn) {
        console.log('Rollup warning:', warning);
        warn(warning);
      }
    }
  },
  optimizeDeps: {
    include: ['token-extensions-boost', 'buffer'],
    esbuildOptions: {
      target: 'esnext',
    }
  },
  define: {
    'process.env': {},
    global: {},
  }
}); 