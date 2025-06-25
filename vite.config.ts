import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { splitVendorChunkPlugin } from 'vite';
import { compression, defineAlgorithm } from 'vite-plugin-compression2';
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
    // Configure both Brotli and Gzip compression
    compression({
      algorithms: [
        defineAlgorithm('brotliCompress', {
          params: {
            // BROTLI_PARAM_QUALITY = 2, value 11 = maximum compression
            2: 11
          }
        }),
        defineAlgorithm('gzip', { level: 9 })
      ],
      include: /\.(js|mjs|json|css|html|svg|xml|toml|yml|yaml)$/i,
      threshold: 1024, // Only compress files larger than 1KB
      skipIfLargerOrEqual: true, // Skip if compressed file is larger than original
    }),
    imagemin({
      gifsicle: { optimizationLevel: 7 },
      mozjpeg: { quality: 85 },
      pngquant: { 
        quality: [0.8, 0.9],
        speed: 4
      },
      svgo: {
        plugins: [
          { name: 'removeViewBox', active: false },
          { name: 'removeEmptyAttrs', active: false },
          { name: 'removeDimensions', active: true },
          { name: 'removeUnknownsAndDefaults', active: true },
          { name: 'removeUselessStrokeAndFill', active: true },
          { name: 'cleanupIDs', active: true }
        ]
      },
      webp: {
        quality: 85,
        method: 6
      }
    }),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'Logo.svg', 'Logo.png', 'robots.txt'],
      injectRegister: 'auto',
      devOptions: {
        enabled: true,
        type: 'module',
        navigateFallback: 'index.html',
      },
      manifest: {
        id: '/',
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
        dir: "ltr",
        categories: ["utilities", "productivity"],
        prefer_related_applications: false,
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
          },
          {
            src: "/Logo.png",
            sizes: "192x192",
            type: "image/png",
            purpose: "maskable"
          },
          {
            src: "/Logo.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable"
          }
        ]
      },
      workbox: {
        globDirectory: 'dist',
        globPatterns: [
          '**/*.{js,css,html}',
          '**/*.{ico,png,svg,webp}',
          '**/*.{woff,woff2,ttf,otf}',
          '**/manifest.webmanifest'
        ],
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
            // Other node_modules can go into a separate chunk
            return 'vendor';
          }
        }
      },
    },
    chunkSizeWarningLimit: 1000,
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
        pure_funcs: ['console.log', 'console.info', 'console.debug', 'console.trace'],
      },
    },
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
