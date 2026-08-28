import * as fs from 'node:fs'
import path from 'node:path'
import { type FamilyFontMetrics, parseFontFile } from './generateFontMetrics.parser.ts'
import { baseIndexToScss, fontFacesToScss, metricsToScss } from './generateFontMetrics.scss.ts'
import { loadConfig } from './loadConfig.ts'

const cfg = await loadConfig()
const fontsDir = path.join(import.meta.dirname, cfg.appFonts.fontPath)
const isNext = cfg.appFonts.nextFont ?? false;

/**
 * A font file competing to represent its family in the final metrics map.
 * `score` is its distance from the ideal (non-italic, weight 400/Regular) —
 * lower wins. See the scoring comment in generateMetrics() for the formula.
 */
type FontCandidate = { data: FamilyFontMetrics; score: number }
/**
 * A single `@font-face` rule to emit into `_fonts.scss` (only used when
 * `appFonts.nextFont` is false — Next.js's `next/font/local` handles
 * `@font-face` generation itself when it's true).
 */
export type FontFace = {
  /** Font family name (`font-family` value) */
  family: string,
  /** `src: url(...)` path, already relative to `_fonts.scss`'s own directory */
  path: string,
  /** File extension, used as the `format(...)` hint (e.g. `woff2`) */
  ext: string
  /** A single weight for static fonts, or a `{min, max}` range for variable fonts (`font-weight: min max;`) */
  weight: number | {min: number, max: number}
  style: 'normal' | 'italic';
}
/** Map of resolved font family name to its extracted metrics */
export type FontMetricsMap = Record<string, FamilyFontMetrics>

/** Strips the selection score off each winning candidate, leaving the plain family-name → metrics map metricsToScss() expects */
const extractMetricsMap = (candidates: Record<string, FontCandidate>): FontMetricsMap => {
  return Object.fromEntries(Object.entries(candidates).map(([name, candidate]) => [name, candidate.data]))
}

const fontsOutputFile = path.join(import.meta.dirname, '../styles/base/_fonts.scss')
const fontsOutputDir = path.dirname(fontsOutputFile)

/**
 * Scans the configured font directory, extracts metrics for every font file,
 * picks the single best-matching file per family (preferring non-italic,
 * then whichever weight is closest to 400/Regular), and writes the
 * resulting metrics map to `_font-metrics.scss`. Also builds one `FontFace`
 * per file (including its variable-font weight range, if any) and — unless
 * `appFonts.nextFont` is true — writes them to `_fonts.scss` as `@font-face`
 * rules; `_index.scss` is regenerated either way to forward (or skip) it.
 */
const generateMetrics = async () => {
  const files = fs.readdirSync(fontsDir)
  const candidates: Record<string, FontCandidate> = {}
  const fontFaces: FontFace[] = []

  for (const file of files) {
    if (!file.match(/\.(ttf|otf|woff|woff2)$/i)) continue

    const filePath = path.join(fontsDir, file)
    const relPath = path.relative(fontsOutputDir, filePath).split(path.sep).join('/')
    const fileExt = filePath.substring(filePath.lastIndexOf('.') + 1);

    try {
      const { name, data, isItalic, weightClass, weightRange } = await parseFontFile(filePath)

      const fontFace: FontFace = {
        family: name,
        path: relPath,
        ext: fileExt,
        weight: weightRange ? {min: weightRange.min, max: weightRange.max} : weightClass,
        style: isItalic ? 'italic' : 'normal',
      }

      fontFaces.push(fontFace);

      // Lower score wins. The 10_000 italic penalty always dominates the
      // weight distance (which maxes out around 600, since usWeightClass
      // runs 1-1000) — so any non-italic file beats any italic one
      // regardless of weight. Among files with the same italic-ness, the
      // one closest to weight 400 wins. A family with only an Italic file
      // still gets metrics from it — italic is only passed over when a
      // non-italic alternative exists for the same family.
      const score = (isItalic ? 10_000 : 0) + Math.abs(weightClass - 400)

      if (!candidates[name] || score < candidates[name].score) {
        candidates[name] = { data, score }
      }
    } catch (err: unknown) {
      console.error(`Failed to parse ${file}:`, err)
    }
  }

  const metrics = extractMetricsMap(candidates)

  const metricsOutputFile = path.join(import.meta.dirname, '../styles/abstracts/variables/_font-metrics.scss')
  fs.writeFileSync(metricsOutputFile, metricsToScss(metrics))
  console.log('- Font-metrics Abstracts is written to file')

  if (!isNext) {
    fs.writeFileSync(fontsOutputFile, fontFacesToScss(fontFaces))
    console.log('- Font Faces is written to file')
  }

  const baseIndexOutputFile = path.join(import.meta.dirname, '../styles/base/_index.scss')
  fs.writeFileSync(baseIndexOutputFile, baseIndexToScss(isNext))

}

generateMetrics()
