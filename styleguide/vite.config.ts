import path from 'node:path'
import { defineConfig } from 'vite'

export default defineConfig({
  resolve: {
    alias: {
      '@trimscale': path.resolve(__dirname, '..'),
      '@/': path.resolve(__dirname, '/src'),
    },
  },
  css: {
    preprocessorOptions: {
      scss: {
        loadPaths: [
          'node_modules/trimscale-css/styles',
          './src',
        ],
      },
    },
  },
})
