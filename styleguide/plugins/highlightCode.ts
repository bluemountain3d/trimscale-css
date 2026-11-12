import { createCssVariablesTheme, createHighlighter } from 'shiki'
import type { Plugin } from 'vite'

// Colors come from --shiki-* custom properties, which _code-block.scss maps
// onto the syntax color aliases in trimscale.config.ts
const syntaxTheme = createCssVariablesTheme({
  name: 'trimscale',
  variablePrefix: '--shiki-',
  fontStyle: true,
})

const decodeEntities = (html: string) =>
  html
    .replaceAll('&lt;', '<')
    .replaceAll('&gt;', '>')
    .replaceAll('&quot;', '"')
    .replaceAll('&#39;', "'")
    .replaceAll('&amp;', '&')

// Highlights <pre><code data-lang="..."> blocks in index.html at build time,
// so the page ships colored markup and no highlighting JS
export function highlightCode(): Plugin {
  const highlighter = createHighlighter({
    themes: [syntaxTheme],
    langs: ['ts', 'scss', 'html', 'bash'],
  })

  return {
    name: 'highlight-code',
    async transformIndexHtml(html) {
      const shiki = await highlighter
      return html.replace(
        /<pre><code data-lang="([\w-]+)">([\s\S]*?)<\/code><\/pre>/g,
        (_, lang: string, code: string) =>
          shiki.codeToHtml(decodeEntities(code), { lang, theme: 'trimscale' }),
      )
    },
  }
}
