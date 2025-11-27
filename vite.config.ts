import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { viteApiPlugin } from './scripts/vite-api-plugin';

export default defineConfig({
  plugins: [
    react(),
    viteApiPlugin(),
    {
      name: 'exclude-backend-files',
      enforce: 'pre',
      resolveId(id) {
        // Exclude backend files from Vite processing
        if (id.includes('src/app.ts') || id.endsWith('/app.ts')) {
          return { id: 'virtual:empty', external: true };
        }
        if (id.includes('/infra/') || 
            id.includes('/services/') || 
            id.includes('/domain/') ||
            id.includes('/api/http/') ||
            id.includes('/api/middleware/')) {
          return { id: 'virtual:empty', external: true };
        }
        return null;
      },
      load(id) {
        if (id === 'virtual:empty') {
          return 'export default {};';
        }
        return null;
      },
    },
  ],
  server: {
    port: 8899,
    open: true,
    proxy: {
      // Проксі для Agent Cabinet Service
      '/api/agent': {
        target: 'http://localhost:8898',
        changeOrigin: true,
      },
      // Проксі для NODE1 API
      '/api/node1': {
        target: 'http://144.76.224.179:8899',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/node1/, '/api'),
      },
      // Проксі для Node Registry Service
      '/node-registry': {
        target: 'http://localhost:9205',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/node-registry/, ''),
      },
    },
  },
  optimizeDeps: {
    exclude: ['express'],
  },
});

