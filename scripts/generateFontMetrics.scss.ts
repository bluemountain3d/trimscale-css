import type { FamilyFontMetrics } from './generateFontMetrics.parser.ts';
import type { FontFace, FontMetricsMap } from './generateFontMetrics.ts';
import { raw, setNestedScssMap, setScssMap, setScssMapEntry, toKebabCase } from './helpers.ts';

const sassDocs = `
/// @group Abstracts/Variables
/// @name Font Metrics Database
/// @description Raw font metrics extracted from font files using fontkit/opentype.js
///
/// DATA LAYER - Pure metrics data with no dependencies
///
/// Metrics are normalized to em units (divided by units-per-em from font file):
/// - avg-char-width: Average character width
/// - top-trim: Space from ascender to cap-height (for leading-trim)
/// - bottom-trim: Space from baseline to descender (for leading-trim)
/// - lsb-adjust: Left side bearing adjustment
/// - rsb-adjust: Right side bearing adjustment
///
/// @see tokens/_leading-trim.scss For usage of these metrics
///
/// @example scss - Access via typography variables (recommended)
///   // In _typography.scss — use the _get-metric() helper
///   $capHeight-body: _get-metric("body", "cap-height"); // Returns: 0.66
///
/// @example scss - Direct map access (internal use only)
///   @use 'styles/abstracts/variables/font-metrics' as metrics;
///   @use 'sass:map';
///   $cap: map.get(map.get(metrics.$font-metrics, "Source Sans 3"), "cap-height");
/// ===========================================================================

// ============================================================================
// Font Metrics Database
// ============================================================================

/// Font metrics for precise vertical rhythm and optical alignment
/// @type Map
`

export const metricsToScss = (metrics: FontMetricsMap): string => {
  const entries = Object.entries(metrics).map(([key, value]) => {
    const innerEntries = Object.entries(value as FamilyFontMetrics).map(([k, v]) => 
      setScssMapEntry(toKebabCase(k), k === 'family' ? raw(v as string) : v, 2));
    return setNestedScssMap(key, innerEntries)
  })
  return setScssMap(sassDocs, 'font-metrics', entries)
}

// ============================================================================
// Fonts: @font-face rules if nextFont === false
// ============================================================================

/**
 * Builds `_fonts.scss`'s `@font-face` rules from a list of `FontFace`s,
 * grouping consecutive entries for the same family under one `// {family}`
 * comment (relies on `fontFaces` already being ordered by family).
 * @param fontFaces - The font faces to emit, in family-grouped order.
 * @returns The complete `@font-face` block(s), ready to write to `_fonts.scss`.
 */
export const fontFacesToScss = (fontFaces: FontFace[]): string => {
  let lastFamily = ''
  const output = fontFaces.map((face) => {
    const isNewFamily = face.family !== lastFamily
    lastFamily = face.family

    return `${isNewFamily ? `// ${face.family}\n` : ''}@font-face {
  font-family: "${face.family}";
  src: url("${face.path}") format("${face.ext}");
  font-weight: ${typeof face.weight === 'number'
                  ? face.weight
                  : `${face.weight.min} ${face.weight.max}`};
  font-style: ${face.style};
  font-display: swap;
}${isNewFamily ? `\n` : `\n\n`}`
  })

  return `${output.join('')}`
}

/**
 * Builds `_index.scss`, the entry point for `styles/base/`. Omits the
 * `@forward './fonts'` line when `isNext` is true, since Next.js's
 * `next/font/local` handles font loading itself and no `_fonts.scss` is
 * generated in that case.
 * @param isNext - Mirrors `cfg.appFonts.nextFont`.
 * @returns The complete `_index.scss` contents.
 */
export const baseIndexToScss = (isNext: boolean) => `
/// @group Base
/// @name Base Styles
/// @description Entry point for all base styles.
/// Forwards ${isNext ? '' : 'fonts, '}reset, base defaults, and typography.
/// Import order matters — reset must come before base and typography.
/// ===========================================================================
${isNext ? '' : `\n@forward './fonts';`}
@forward './reset';
@forward './base';
@forward './typography';
`