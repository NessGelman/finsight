import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/finsight/',
  server: {
    headers: {
      'Content-Security-Policy': [
        "default-src 'self';",
        "script-src 'self' 'wasm-unsafe-eval' https://esm.sh https://*.esm.sh https://unpkg.com;",
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;",
        "font-src https://fonts.gstatic.com https://fonts.googleapis.com data:;",
        "img-src 'self' data: https://vitejs.dev;",
"connect-src 'self' https://api.stlouisfed.org https://fred.stlouisfed.org https://fonts.googleapis.com;", 
        "worker-src 'self' blob:;",
        "frame-ancestors 'none';",
        "object-src 'none';",
        "base-uri 'self';"
      ].join(' ')
    }
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return;
          if (id.includes('recharts') || id.includes('d3-')) {
            return 'vendor-charts';
          }
          return 'vendor';
        },
      },
    },
  },
})
