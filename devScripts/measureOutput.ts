import path from 'node:path'
import zlib from 'node:zlib'
import type { TrimscaleConfig } from '../models/Config.ts'
import { buildBridgeSource } from '../scripts/buildBridgeSource.ts'
import { compileCss, formatBytes, rewriteFontFacesForCss } from '../scripts/generateCss.ts'
import { computeFontData } from '../scripts/generateFonts.ts'
import { resolveUtilityFlags } from '../scripts/generateUtilities.ts'
import { type Axis, axes, type Variant, variants } from './measure/configs.ts'

/**
 * Measures what `output.css` produces for several configs, and prints the
 * markdown tables that back the size figures in README.md and
 * docs/getting-started.md. Not shipped: `devScripts/` is outside
 * package.json's `files` and outside tsconfig.build.json, so nothing here
 * reaches the tarball.
 *
 * Run it whenever a change could move those numbers (a new utility group, a
 * change to the token or reset layers) and paste the tables back into the
 * docs, rather than editing the figures by hand.
 *
 * Usage: `pnpm measure`
 */

// Font paths in both anchor configs are relative to the repo root, and
// `computeFontData` resolves them against process.cwd(). Pinning cwd here
// means the script works from any directory instead of failing on a
// confusing "no font files found".
const repoRoot = path.join(import.meta.dirname, '..')
process.chdir(repoRoot)

/** `output.css`'s default `fontUrlBase`, so measured `src` values match what a real CSS build writes. */
const FONT_URL_BASE = '/fonts'

type Measurement = {
  raw: number
  min: number
  gzip: number
  brotli: number
}

const gzip = (css: string): number => zlib.gzipSync(Buffer.from(css, 'utf8')).byteLength

/** Maximum quality, the number a host serving brotli would actually reach. Slow, which is why `generate` itself only reports gzip. */
const brotli = (css: string): number =>
  zlib.brotliCompressSync(Buffer.from(css, 'utf8'), {
    params: { [zlib.constants.BROTLI_PARAM_QUALITY]: 11 },
  }).byteLength

/** Compiles one config through the same path `generate` uses, and measures the result four ways. */
const measure = async (config: TrimscaleConfig): Promise<Measurement> => {
  const flags = resolveUtilityFlags(config.output?.utilities)
  const fontData = await computeFontData(config)
  const source = buildBridgeSource(config, flags, {
    ...fontData,
    fontFaces: rewriteFontFacesForCss(fontData.fontFaces, FONT_URL_BASE),
  })

  const [expanded, minified] = await Promise.all([compileCss(source, 'expanded'), compileCss(source, 'compressed')])

  return {
    raw: Buffer.byteLength(expanded),
    min: Buffer.byteLength(minified),
    gzip: gzip(minified),
    brotli: brotli(minified),
  }
}

const measureVariant = async (variant: Variant): Promise<Measurement & { variant: Variant }> => ({
  variant,
  ...(await measure(variant.config)),
})

const results = []
for (const variant of variants) {
  results.push(await measureVariant(variant))
}

console.log('\n### Output size by config\n')
console.log('| config | | raw | minified | min + gzip | min + brotli |')
console.log('| --- | --- | --- | --- | --- | --- |')
for (const { variant, raw, min, gzip: gz, brotli: br } of results) {
  console.log(
    `| ${variant.name} | ${variant.note} | ${formatBytes(raw)} | ${formatBytes(min)} | ${formatBytes(gz)} | ${formatBytes(br)} |`,
  )
}

// Each axis config is the full config minus `units` of one thing, so the
// difference divided by `units` is what one of that thing costs. The full
// config is the second variant; measuring it once and reusing it keeps the
// two tables consistent with each other.
const full = results[1]
if (!full) throw new Error('Expected a full-config variant to measure axes against.')

const perUnit = (total: number, part: number, units: number): string => `${Math.round((total - part) / units)} B`

const axisRow = async (axis: Axis): Promise<string> => {
  const m = await measure(axis.config)
  return `| ${axis.name} | ${perUnit(full.raw, m.raw, axis.units)} | ${perUnit(full.min, m.min, axis.units)} | ${perUnit(full.gzip, m.gzip, axis.units)} |`
}

console.log('\n### Cost per unit, measured against the full config\n')
console.log('| one more… | raw | minified | min + gzip |')
console.log('| --- | --- | --- | --- |')
for (const axis of axes) {
  console.log(await axisRow(axis))
}
console.log()
