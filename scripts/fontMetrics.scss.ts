import type { FallbackFontFace, FontFace, FontMetricsMap } from './fontData.ts'
import { kebabKeys, raw, type ScssTree } from './helpers.ts'

/**
 * Builds the `$font-metrics` map, for use as a `@use 'trimscale-css' with
 * ($font-metrics: ...)` argument in the generated bridge file. Family names
 * are the config's own keys, so they are NOT kebab-cased; the metric fields
 * inside each family are. Every field of `FamilyFontMetrics` is carried over
 * generically, so a metric added there reaches the SCSS without an edit here.
 */
export const metricsTree = (metrics: FontMetricsMap): ScssTree =>
  Object.fromEntries(
    Object.entries(metrics).map(([familyName, familyMetrics]) => [
      familyName,
      // `family` is a ready-made `font-family` value (`'"Roboto", sans-serif'`),
      // already carrying its own quoting, so it goes out unquoted.
      kebabKeys(familyMetrics, (value, key) => (key === 'family' ? raw(value as string) : value)),
    ]),
  )

/** Formats one `FontFace`'s `weight` field as the SCSS-ready string `base/_fonts.scss` interpolates directly (`"700"` or `"100 900"` for variable fonts). */
const formatWeight = (weight: FontFace['weight']): string =>
  typeof weight === 'number' ? `${weight}` : `${weight.min} ${weight.max}`

/**
 * Builds the `$font-faces` list (see `abstracts/variables/_font-metrics.scss`),
 * one map per `FontFace`, for use as a `@use 'trimscale-css' with
 * ($font-faces: ...)` argument in the generated bridge file.
 */
export const fontFacesTree = (fontFaces: FontFace[]): ScssTree =>
  fontFaces.map((face) => ({
    family: face.family,
    src: face.src,
    ext: face.ext,
    weight: formatWeight(face.weight),
    style: face.style,
    'ascent-override': face.ascentOverride,
    'descent-override': face.descentOverride,
  }))

/**
 * Builds the `$fallback-font-faces` list, one map per `FallbackFontFace`, for
 * use as a `@use 'trimscale-css' with ($fallback-font-faces: ...)` argument
 * in the generated bridge file.
 */
export const fallbackFontFacesTree = (fallbackFontFaces: FallbackFontFace[]): ScssTree =>
  fallbackFontFaces.map((face) => ({
    family: face.family,
    'fallback-family': face.fallbackFamily,
    'size-adjust': face.sizeAdjust,
    'ascent-override': face.ascentOverride,
    'descent-override': face.descentOverride,
    'line-gap-override': face.lineGapOverride,
  }))
