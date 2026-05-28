import { defineConfig } from 'vite'
import path from 'path'

export default defineConfig({
  resolve: {
    alias: {
      '@trimscale': path.resolve(__dirname, '../src'),
      '@/': path.resolve(__dirname, '/src')
    }
  },
  css: {
    preprocessorOptions: {
      scss: {
        loadPaths: [path.resolve(__dirname, '../src')]
      }
    }
  }
})