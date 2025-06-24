import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { splitVendorChunkPlugin } from 'vite';
import { compression } from 'vite-plugin-compression2';
import { VitePWA } from 'vite-plugin-pwa';
import imagemin from 'vite-plugin-imagemin';

// Define vendor packages
const vendorPackages = {
  react: ['react', 'react-dom', 'react-router-dom'],
  ui: ['framer-motion', 'lucide-react', 'recharts'],
};

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    splitVendorChunkPlugin(),
    compression({
      algorithms: ['gzip'],
      exclude: [/\.(br)$/, /\.(gz)$/],
    }),
    compression({
      algorithms: ['brotliCompress'],
      exclude: [/\.(br)$/, /\.(gz)$/],
    }),
    imagemin({
      gifsicle: { optimizationLevel: 7 },
      mozjpeg: { quality: 80 },
      pngquant: { quality: [0.7, 0.8] },
      svgo: {
        plugins: [
          { name: 'removeViewBox', active: false },
          { name: 'removeEmptyAttrs', active: false }
        ]
      }
    }),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'Logo.svg', 'robots.txt'],
      injectRegister: 'auto',
      devOptions: {
        enabled: true,
        type: 'module',
      },
      manifestFilename: 'manifest.json',
      manifest: {
        name: "VA Rating Assistant",
        short_name: "VA Rating",
        description: "VA Disability Rating Assistant for U.S. veterans",
        theme_color: "#0a2a66",
        background_color: "#ffffff",
        display: "standalone",
        start_url: "/",
        scope: "/",
        orientation: "portrait",
        lang: "en",
        categories: ["utilities", "productivity"],
        icons: [
          {
            src: "/Logo.png",
            sizes: "192x192",
            type: "image/png",
            purpose: "any"
          },
          {
            src: "/Logo.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any"
          }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        maximumFileSizeToCacheInBytes: 3 * 1024 * 1024, // 3MB
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/algojcmqstokyghijcyc\.supabase\.co/,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-cache',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60 * 24 // 24 hours
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          }
        ]
      }
    })
  ],
  build: {
    cssCodeSplit: true,
    reportCompressedSize: false, // Speed up build
    rollupOptions: {
      output: {
        manualChunks(id) {
          // Check if the module is from node_modules
          if (id.includes('node_modules')) {
            // Check if it's a React-related package
            if (vendorPackages.react.some(pkg => id.includes(`/${pkg}/`))) {
              return 'react-vendor';
            }
            // Check if it's a UI-related package
            if (vendorPackages.ui.some(pkg => id.includes(`/${pkg}/`))) {
              return 'ui-vendor';
            }
            // Other node_modules can go into a separate vendor chunk
            return 'vendor';
          }
        }
      },
    },
    chunkSizeWarningLimit: 1000,
  },
  optimizeDeps: {
    exclude: ["lucide-react"],
    include: [
      'react',
      'react-dom',
      'react-router-dom',
      'framer-motion',
      'recharts',
    ],
  },
});
