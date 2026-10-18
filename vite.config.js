import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),

    // Bug #2: PWA / Service Worker registration via vite-plugin-pwa (Workbox GenerateSW strategy)
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      includeAssets: ['favicon.svg', 'favicon.ico', 'apple-touch-icon.png', 'icon-192.png', 'icon-512.png'],
      manifest: {
        name: 'Radiance Polymers Production Report',
        short_name: 'Radiance Report',
        description: 'Digital Production Reporting System – Radiance Polymers MC03 Live Trial v1.0.0',
        theme_color: '#1e3a8a',
        background_color: '#0f172a',
        display: 'standalone',
        orientation: 'any',
        start_url: '/',
        icons: [
          { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: '/icon-maskable-192.png', sizes: '192x192', type: 'image/png', purpose: 'maskable' },
          { src: '/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
        ]
      },
      workbox: {
        // Cache all static assets and the app shell
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2}'],
        // Increase asset cache limit for Excel library (can be large)
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024 // 5 MB
      }
    })
  ],

  build: {
    // Bug #3: Manual chunk splitting to prevent a 2.3 MB monolithic bundle
    rollupOptions: {
      output: {
        manualChunks(id) {
          // Vendor: React core
          if (id.includes('node_modules/react') || id.includes('node_modules/react-dom')) {
            return 'vendor-react';
          }
          // Vendor: Supabase client
          if (id.includes('node_modules/@supabase') || id.includes('node_modules/realtime-js')) {
            return 'vendor-supabase';
          }
          // Vendor: Excel export libraries (heaviest dep ~900 KB)
          if (id.includes('node_modules/xlsx') || id.includes('node_modules/xlsx-js-style')) {
            return 'vendor-xlsx';
          }
          // Vendor: PDF generation
          if (id.includes('node_modules/jspdf') || id.includes('node_modules/canvg')) {
            return 'vendor-pdf';
          }
          // Vendor: Icon library
          if (id.includes('node_modules/lucide-react')) {
            return 'vendor-icons';
          }
        }
      }
    },
    // Raise the warning threshold now that we have intentional large xlsx chunk
    chunkSizeWarningLimit: 1000
  },

  server: {
    host: true,
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true
      }
    },
    watch: {
      ignored: ['**/scratch/**', '**/android/**', '**/dist/**', '**/backend/**']
    }
  }
});
