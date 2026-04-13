import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  base: '/Tracker-App/',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icons/*.png'],
      manifest: {
        name: 'Tracker',
        short_name: 'Tracker',
        description: 'Count up streaks and count down to events — your data, your device.',
        theme_color: '#111114',
        background_color: '#111114',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/Tracker-App/',
        scope: '/Tracker-App/',
        icons: [
         { src: '/Tracker-App/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
         { src: '/Tracker-App/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
         { src: '/Tracker-App/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,png,svg,woff2}'],
      },
    }),
  ],
});
