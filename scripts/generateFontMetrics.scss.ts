import type { FallbackFontFace, FamilyFontMetrics, FontFace, FontMetricsMap } from './generateFonts.ts'
import { raw, setNestedScssMap, setScssMapEntry, setScssMapValue, toKebabCase } from './helpers.ts'

/**
 * Builds the `$font-metrics` map VALUE (no `$name:`/`!default`, see
 * {@link setScssMapValue}), for use as a `@use 'trimscale-css' with
 * ($font-metrics: ...)` argument in the generated bridge file.
 */
export const metricsToScssMapValue = (metrics: FontMetricsMap): string => {
  const entries = Object.entries(metrics).map(([key, value]) => {
    const innerEntries = Object.entries(value as FamilyFontMetrics).map(([k, v]) =>
      setScssMapEntry(toKebabCase(k), k === 'family' ? raw(v as string) : v, 3),
    )
    return setNestedScssMap(key, innerEntries, 2)
  })
  return setScssMapValue(entries)
}

/** Formats one `FontFace`'s `weight` field as the SCSS-ready string `base/_fonts.scss` interpolates directly (`"700"` or `"100 900"` for variable fonts). */
const formatWeight = (weight: FontFace['weight']): string =>
  typeof weight === 'number' ? `${weight}` : `${weight.min} ${weight.max}`

/**
 * Builds the `$font-faces` list VALUE (see `abstracts/variables/_font-metrics.scss`),
 * one map per `FontFace`, for use as a `@use 'trimscale-css' with
 * ($font-faces: ...)` argument in the generated bridge file.
 */
export const fontFacesToScssListValue = (fontFaces: FontFace[]): string => {
  const entries = fontFaces.map((face) => {
    const innerEntries = [
      setScssMapEntry('family', face.family, 3),
      setScssMapEntry('src', face.src, 3),
      setScssMapEntry('ext', face.ext, 3),
      setScssMapEntry('weight', formatWeight(face.weight), 3),
      setScssMapEntry('style', face.style, 3),
    ]
    return `    (\n${innerEntries.join('')}    ),\n`
  })
  return `(\n${entries.join('')}  )`
}

/**
 * Builds the `$fallback-font-faces` list VALUE, one map per `FallbackFontFace`,
 * for use as a `@use 'trimscale-css' with ($fallback-font-faces: ...)`
 * argument in the generated bridge file.
 */
export const fallbackFontFacesToScssListValue = (fallbackFontFaces: FallbackFontFace[]): string => {
  const entries = fallbackFontFaces.map((face) => {
    const innerEntries = [
      setScssMapEntry('family', face.family, 3),
      setScssMapEntry('fallback-family', face.fallbackFamily, 3),
      setScssMapEntry('size-adjust', face.sizeAdjust, 3),
      setScssMapEntry('ascent-override', face.ascentOverride, 3),
      setScssMapEntry('descent-override', face.descentOverride, 3),
      setScssMapEntry('line-gap-override', face.lineGapOverride, 3),
    ]
    return `    (\n${innerEntries.join('')}    ),\n`
  })
  return `(\n${entries.join('')}  )`
}
