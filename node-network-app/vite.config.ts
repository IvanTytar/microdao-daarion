import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    open: true,
    proxy: {
      '/api/node-metrics': {
        target: 'http://localhost:9205',
        changeOrigin: true,
      },
      '/api/v1/nodes': {
        target: 'http://localhost:9205',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/v1/, '/api/v1'),
      },
      '/api/metrics': {
        target: 'http://localhost:9205',
        changeOrigin: true,
      },
      '/api': {
        target: 'http://localhost:9205',
        changeOrigin: true,
      },
    },
  },
});
