import * as fs from 'node:fs'
import path from 'node:path'
import type { RawFontMetrics } from '../models/Config.ts'
import { fetchRemoteFont, getFontExtension, readLocalFont } from './generateFontMetrics.io.ts'
import { parseFontBuffer } from './generateFontMetrics.parser.ts'
import { baseIndexToScss, fontFacesToScss, metricsToScss } from './generateFontMetrics.scss.ts'
import { toKebabCase } from './helpers.ts'
import { loadConfig } from './loadConfig.ts'

const cfg = await loadConfig()
const nextFontDefault = cfg.appFonts.nextFontDefault ?? false
const nextPrefix = cfg.appFonts.nextFontPrefix ?? 'next-font'

/**
 * A single `@font-face` rule to emit into `_fonts.scss`. Written for `local`
 * sources (unless that family resolves to `nextFont: true`) and for `cdn`
 * sources with `generateFontFace: true`; never for `manual`.
 */
export type FontFace = {
  /** Font family name (`font-family` value) — always the family's config key, never a name read from the file */
  family: string
  /** `src: url(...)` value: a relative path for `local`, the CDN URL as-is for `cdn` */
  src: string
  /** File extension, used as the `format(...)` hint (e.g. `woff2`) */
  ext: string
  /** A single weight for static fonts, or a `{min, max}` range for variable fonts (`font-weight: min max;`) */
  weight: number | { min: number; max: number }
  style: 'normal' | 'italic'
}

/** One `path`/`url` entry's extracted metrics plus what's needed to build its `@font-face`, kept until the family's best-metrics candidate is picked. */
type ParsedEntry = {
  src: string
  ext: string
  isItalic: boolean
  weightClass: number
  weightRange: { min: number; max: number } | null
  raw: RawFontMetrics
}

/** One family's full metrics entry: the raw extracted/manual metrics plus its resolved SCSS-ready `family` string. */
export type FamilyFontMetrics = RawFontMetrics & { family: string }

/** Map of resolved font family name to its extracted metrics */
export type FontMetricsMap = Record<string, FamilyFontMetrics>

const fontsOutputFile = path.join(import.meta.dirname, '../styles/base/_fonts.scss')
const fontsOutputDir = path.dirname(fontsOutputFile)
const metricsOutputFile = path.join(import.meta.dirname, '../styles/abstracts/variables/_font-metrics.scss')
const baseIndexOutputFile = path.join(import.meta.dirname, '../styles/base/_index.scss')

/** Builds the SCSS-ready `font-family` value: `next/font`'s CSS variable, or a quoted family name, both with the resolved fallback appended. */
const buildFamilyString = (familyName: string, fallback: string | undefined, usesNextFont: boolean): string => {
  const resolvedFallback = fallback ?? cfg.appFonts.fallbackDefault

  return usesNextFont
    ? `var(--${nextPrefix}-${toKebabCase(familyName)}), ${resolvedFallback}`
    : `'"${familyName}", ${resolvedFallback}'`
}

/**
 * Scans every family in `appFonts.fonts`, extracts metrics from its
 * `local`/`cdn` file(s) (or takes `manual` metrics as-is), picks the
 * single best-matching file per family for metrics (preferring non-italic,
 * then whichever weight is closest to 400/Regular), and writes the
 * resulting metrics map to `_font-metrics.scss`. Also builds one `FontFace`
 * per file that should get a `@font-face` rule and writes them to
 * `_fonts.scss`; `_index.scss` is regenerated either way to forward (or
 * skip) it.
 */
const generateMetrics = async () => {
  const metrics: FontMetricsMap = {}
  const fontFaces: FontFace[] = []

  for (const [familyName, fontSource] of Object.entries(cfg.appFonts.fonts)) {
    const usesNextFont = fontSource.nextFont ?? nextFontDefault
    const family = buildFamilyString(familyName, fontSource.fallback, usesNextFont)

    if (fontSource.source === 'manual') {
      metrics[familyName] = { ...fontSource.metrics, family }
      continue
    }

    const entries = fontSource.source === 'local' ? fontSource.path : fontSource.url
    const parsedEntries: ParsedEntry[] = []

    for (const entry of entries) {
      try {
        const buffer =
          fontSource.source === 'local'
            ? await readLocalFont(path.join(import.meta.dirname, entry))
            : await fetchRemoteFont(entry)

        const src =
          fontSource.source === 'local'
            ? path.relative(fontsOutputDir, path.join(import.meta.dirname, entry)).split(path.sep).join('/')
            : entry

        const { metrics: raw, isItalic, weightClass, weightRange } = await parseFontBuffer(
          buffer,
          `${familyName} (${entry})`,
        )

        parsedEntries.push({ src, ext: getFontExtension(entry), isItalic, weightClass, weightRange, raw })
      } catch (err: unknown) {
        console.error(`Failed to parse ${familyName} (${entry}):`, err)
      }
    }

    if (parsedEntries.length === 0) continue

    // Lower score wins. The 10_000 italic penalty always dominates the
    // weight distance (which maxes out around 600, since usWeightClass
    // runs 1-1000) — so any non-italic file beats any italic one
    // regardless of weight. Among files with the same italic-ness, the
    // one closest to weight 400 wins. A family with only an Italic file
    // still gets metrics from it — italic is only passed over when a
    // non-italic alternative exists.
    const best = parsedEntries.reduce((best, entry) => {
      const score = (entry.isItalic ? 10_000 : 0) + Math.abs(entry.weightClass - 400)
      const bestScore = (best.isItalic ? 10_000 : 0) + Math.abs(best.weightClass - 400)
      return score < bestScore ? entry : best
    })

    metrics[familyName] = { ...best.raw, family }

    const shouldGenerateFontFace =
      fontSource.source === 'local' ? !usesNextFont : (fontSource.generateFontFace ?? false)

    if (shouldGenerateFontFace) {
      for (const entry of parsedEntries) {
        fontFaces.push({
          family: familyName,
          src: entry.src,
          ext: entry.ext,
          weight: entry.weightRange ?? entry.weightClass,
          style: entry.isItalic ? 'italic' : 'normal',
        })
      }
    }
  }

  fs.writeFileSync(metricsOutputFile, metricsToScss(metrics))
  console.log('- Font-metrics Abstracts is written to file')

  if (fontFaces.length > 0) {
    fs.writeFileSync(fontsOutputFile, fontFacesToScss(fontFaces))
    console.log('- Font Faces is written to file')
  }

  fs.writeFileSync(baseIndexOutputFile, baseIndexToScss(fontFaces.length > 0))
}

generateMetrics()
