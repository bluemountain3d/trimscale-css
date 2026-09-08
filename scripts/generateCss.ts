import * as fs from 'node:fs'
import path from 'node:path'
import type { FontFace } from './generateFonts.ts'

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
 * with Dart Sass and writes `trimscale.css`, plus `trimscale.min.css` when
 * `minify`. Compiling the real static SCSS is the only CSS-generation path,
 * there's no separate hand-written emitter to keep in sync with it.
 */
export const writeCssOutput = async (outDir: string, bridgeSource: string, minify: boolean): Promise<void> => {
  const compiler = await loadSassCompiler()

  const { css } = compiler.compileString(bridgeSource, { loadPaths: [STYLES_LOAD_PATH], style: 'expanded' })
  const cssPath = path.join(outDir, 'trimscale.css')
  fs.writeFileSync(cssPath, css)
  console.log(`- CSS is written to ${path.relative(process.cwd(), cssPath)}`)

  if (minify) {
    const { css: minCss } = compiler.compileString(bridgeSource, {
      loadPaths: [STYLES_LOAD_PATH],
      style: 'compressed',
    })
    const minPath = path.join(outDir, 'trimscale.min.css')
    fs.writeFileSync(minPath, minCss)
    console.log(`- Minified CSS is written to ${path.relative(process.cwd(), minPath)}`)
  }
}
