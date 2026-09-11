import * as fs from 'node:fs'
import path from 'node:path'
import zlib from 'node:zlib'
import type { FontFace } from './fontData.ts'

/** The subset of Dart Sass's compiler API (shared between `sass` and `sass-embedded`) `writeCssOutput` needs. */
type SassCompiler = {
  compileString: (source: string, options: { loadPaths: string[]; style: 'expanded' | 'compressed' }) => {
    css: string
  }
}

// A non-literal specifier keeps TS from trying to resolve real type
// declarations for either package, neither is a dependency of this one.
const importOptional = (specifier: string): Promise<unknown> => import(specifier)

/**
 * `output.css` needs Dart Sass at generate time, distinct from the SCSS
 * build's requirement that the *consumer's own bundler* has one configured.
 * Neither `sass` nor `sass-embedded` is a dependency of this package, so
 * this resolves whichever one the consumer already has installed (the same
 * one their bundler uses), matching how `styles/` itself already assumes a
 * consumer-provided Sass compiler. `sass-embedded` is tried first since
 * it's the faster, actively-recommended option; both expose the same
 * `compileString` shape.
 */
const loadSassCompiler = async (): Promise<SassCompiler> => {
  try {
    return (await importOptional('sass-embedded')) as SassCompiler
  } catch {
    try {
      return (await importOptional('sass')) as SassCompiler
    } catch (err) {
      throw new Error(
        '`output.css` requires a Sass compiler (`sass-embedded` or `sass`) installed in this project, the same one your bundler already needs for the SCSS build. Install one and re-run `generate`.',
        { cause: err },
      )
    }
  }
}

/**
 * Rewrites a `local` font's root-relative `@font-face` `src` (e.g.
 * `/fonts/Roboto-Regular.woff2`, relative to `process.cwd()`, meant for a
 * bundler serving the whole project root) to `${fontUrlBase}/${basename}`
 * instead, the form a standalone CSS file needs since nothing rebases the
 * URL for it. Distinct from `AppFonts.publicDir`, which governs where the
 * SCSS build's `src` is rebased *from* — this is only about what URL the
 * browser ends up requesting. `cdn` sources (absolute URLs) pass through
 * unchanged, they're never local files to begin with.
 */
export const rewriteFontFacesForCss = (fontFaces: FontFace[], fontUrlBase: string): FontFace[] =>
  fontFaces.map((face) => (face.src.startsWith('/') ? { ...face, src: `${fontUrlBase}/${path.basename(face.src)}` } : face))

const STYLES_LOAD_PATH = path.join(import.meta.dirname, '..', 'styles')

/**
 * Compiles `bridgeSource` (the same `@use "trimscale" with (...)` shape as
 * the SCSS bridge file, just with CSS-appropriate font-face `src` values)
 * against the package's own `styles/`. Compiling the real static SCSS is
 * the only CSS-generation path, there's no separate hand-written emitter to
 * keep in sync with it.
 *
 * The dynamic import behind `loadSassCompiler` is module-cached, so calling
 * this repeatedly costs one resolution, not one per call.
 */
export const compileCss = async (bridgeSource: string, style: 'expanded' | 'compressed'): Promise<string> => {
  const compiler = await loadSassCompiler()
  return compiler.compileString(bridgeSource, { loadPaths: [STYLES_LOAD_PATH], style }).css
}

/** Formats a byte count as kB (1000 bytes, the unit browsers and CDNs report). */
export const formatBytes = (bytes: number): string => `${(bytes / 1000).toFixed(1)} kB`

/**
 * Transfer size of `css` under gzip. Node's default level, not `-9`: it's
 * faster and, on output this repetitive, actually compresses *better* (a
 * full config measures 10160 B at the default against 10356 B at level 9).
 * Brotli would be a truer number for most hosts but is slow at maximum
 * quality, and gzip is close enough for an at-a-glance indicator.
 */
const gzippedSize = (css: string): number => zlib.gzipSync(Buffer.from(css, 'utf8')).byteLength

/**
 * Writes `trimscale.bundle.css`, plus `trimscale.bundle.min.css` when
 * `minify`, and logs each file's size. Returns the basenames it wrote, which
 * `generateBridge.ts` needs to know which of the known output files this run
 * did *not* produce. The gzipped figure goes on whichever
 * file is the one to ship, so it follows the minified file when there is one
 * and falls back to the expanded file when there isn't. In the log rather
 * than the docs because this is the consumer's own config, unlike any number
 * a doc page can quote, and this is the moment they'd want to see what a flag
 * cost.
 *
 * The `.bundle` in both names is load-bearing, not decoration. Sass resolves
 * a bare `@use "trimscale"` against the importing file's own directory before
 * `loadPaths`, and it resolves plain `.css` files too, so a file named
 * `trimscale.css` sitting next to the bridge file in `output.dir` shadows the
 * package's `styles/trimscale.scss` for the bridge's own `@use "trimscale"`.
 * The CSS file has no variables to configure, so every `with()` argument
 * fails, reported against the first one (`$breakpoints`). Any name Sass won't
 * resolve for the module `trimscale` avoids this; don't rename these back to
 * `trimscale.css` without changing what the bridge file imports.
 */
export const writeCssOutput = async (outDir: string, bridgeSource: string, minify: boolean): Promise<string[]> => {
  const css = await compileCss(bridgeSource, 'expanded')
  const cssPath = path.join(outDir, 'trimscale.bundle.css')
  fs.writeFileSync(cssPath, css)

  const rawSize = formatBytes(Buffer.byteLength(css))
  const expandedSizes = minify ? rawSize : `${rawSize}, ${formatBytes(gzippedSize(css))} gzipped`
  console.log(`- CSS is written to ${path.relative(process.cwd(), cssPath)} (${expandedSizes})`)

  if (!minify) return [path.basename(cssPath)]

  const minCss = await compileCss(bridgeSource, 'compressed')
  const minPath = path.join(outDir, 'trimscale.bundle.min.css')
  fs.writeFileSync(minPath, minCss)
  const minSizes = `${formatBytes(Buffer.byteLength(minCss))}, ${formatBytes(gzippedSize(minCss))} gzipped`
  console.log(`- Minified CSS is written to ${path.relative(process.cwd(), minPath)} (${minSizes})`)

  return [path.basename(cssPath), path.basename(minPath)]
}
