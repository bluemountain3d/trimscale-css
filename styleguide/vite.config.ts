import path from 'node:path'
import { defineConfig } from 'vite'
import { highlightCode } from './plugins/highlightCode.ts'

export default defineConfig({
  plugins: [highlightCode()],
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
