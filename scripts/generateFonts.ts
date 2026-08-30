import path from 'node:path'
import type { RawFontMetrics, TrimscaleConfig } from '../models/Config.ts'
import { fetchRemoteFont, getFontExtension, readLocalFont } from './generateFontMetrics.io.ts'
import { parseFontBuffer } from './generateFontMetrics.parser.ts'
import { toKebabCase } from './helpers.ts'
import { resolveOutDir } from './loadConfig.ts'

/**
 * A single `@font-face` rule to emit (as one `$font-faces` list entry via
 * `fontFacesToScssListValue`). Written for `local` sources (unless that
 * family resolves to `nextFont: true`) and for `cdn` sources with
 * `generateFontFace: true`; never for `manual`.
 */
export type FontFace = {
  /** Font family name (`font-family` value) — always the family's config key, never a name read from the file */
  family: string
  /** `src: url(...)` value: a relative path for `local` (relative to `outDir`), the CDN URL as-is for `cdn` */
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

/** Builds the SCSS-ready `font-family` value: `next/font`'s CSS variable, or a quoted family name, both with the resolved fallback appended. */
const buildFamilyString = (
  cfg: TrimscaleConfig,
  familyName: string,
  fallback: string | undefined,
  usesNextFont: boolean,
): string => {
  const resolvedFallback = fallback ?? cfg.appFonts.fallbackDefault
  const nextPrefix = cfg.appFonts.nextFontPrefix ?? 'next-font'

  return usesNextFont
    ? `var(--${nextPrefix}-${toKebabCase(familyName)}), ${resolvedFallback}`
    : `'"${familyName}", ${resolvedFallback}'`
}

/**
 * Scans every family in `appFonts.fonts`, extracts metrics from its
 * `local`/`cdn` file(s) (or takes `manual` metrics as-is), and picks the
 * single best-matching file per family for metrics (preferring non-italic,
 * then whichever weight is closest to 400/Regular). Also builds one
 * `FontFace` per file that should get a `@font-face` rule. Local font paths
 * are resolved relative to `process.cwd()` (the directory containing
 * `trimscale.config.ts`); each `FontFace.src` is resolved relative to
 * `outDir`, where the generated bridge file (and the `@font-face` rules
 * built from these `FontFace`s) live.
 */
export const computeFontData = async (
  cfg: TrimscaleConfig,
): Promise<{ metrics: FontMetricsMap; fontFaces: FontFace[] }> => {
  const nextFontDefault = cfg.appFonts.nextFontDefault ?? false
  const outDir = resolveOutDir(cfg)

  const metrics: FontMetricsMap = {}
  const fontFaces: FontFace[] = []

  for (const [familyName, fontSource] of Object.entries(cfg.appFonts.fonts)) {
    const usesNextFont = fontSource.nextFont ?? nextFontDefault
    const family = buildFamilyString(cfg, familyName, fontSource.fallback, usesNextFont)

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
            ? await readLocalFont(path.join(process.cwd(), entry))
            : await fetchRemoteFont(entry)

        const src =
          fontSource.source === 'local'
            ? path.relative(outDir, path.join(process.cwd(), entry)).split(path.sep).join('/')
            : entry

        const {
          metrics: raw,
          isItalic,
          weightClass,
          weightRange,
        } = await parseFontBuffer(buffer, `${familyName} (${entry})`)

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

  return { metrics, fontFaces }
}
