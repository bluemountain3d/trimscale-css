import { readFileSync } from 'node:fs'
import path from 'node:path'
import { defineConfig } from 'vite'
import { highlightCode } from './plugins/highlightCode.ts'
import { tokenTables } from './plugins/tokenTables.ts'
import trimscaleConfig from './trimscale.config.ts'

// The published version on npm, since the repo's package.json is usually the
// next, unpublished one. Offline, it falls back to that package.json.
const publishedVersion = async (): Promise<string> => {
  try {
    const response = await fetch('https://registry.npmjs.org/-/package/trimscale-css/dist-tags', {
      signal: AbortSignal.timeout(3000),
    })
    const { latest } = await response.json()
    if (typeof latest === 'string') return latest
  } catch {}
  return JSON.parse(readFileSync(path.resolve(__dirname, '../package.json'), 'utf-8')).version
}

const version = await publishedVersion()

export default defineConfig({
  plugins: [
    tokenTables(trimscaleConfig),
    highlightCode(),
    {
      name: 'trimscale-version',
      transformIndexHtml: (html) => html.replaceAll('%TRIMSCALE_VERSION%', version),
    },
  ],
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
