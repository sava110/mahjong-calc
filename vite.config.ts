import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react-swc';
import type { UserConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';
import svgr from 'vite-plugin-svgr';
import wasm from 'vite-plugin-wasm';
import commitHash from './plugins/commit-hash';
import siteUrl from './plugins/site-url';
import yaml from './plugins/yaml';

export default {
  plugins: [
    tailwindcss(),
    react(),
    wasm(),
    yaml(),
    svgr({
      svgrOptions: { plugins: ['@svgr/plugin-svgo', '@svgr/plugin-jsx'] }
    }),
    commitHash(),
    siteUrl(),
    VitePWA({
      registerType: 'autoUpdate',
      workbox: {
        skipWaiting: true,
        clientsClaim: true,
        cleanupOutdatedCaches: true
      }
    })
  ],
  server: {
    // Room API (npm run dev:server)
    proxy: { '/api': 'http://localhost:8787' }
  },
  build: {
    // top-level await
    target: ['chrome89', 'edge89', 'firefox89', 'safari15', 'es2022']
  }
} satisfies UserConfig;
