import type { Font } from 'fontkit'

/**
 * Gets the maximum height from a list of character bounding boxes
 * @param font - The fontkit Font object
 * @param chars - Array of characters to measure
 * @returns Minimum height from all measured characters, or 0 if none found
 */
export const getBBoxHeight = (font: Font, chars: string[]): number => {
  const heights = chars
    .map((char) => {
      const codePoint = char.codePointAt(0) ?? 0;
      const glyph = font.glyphForCodePoint(codePoint);  
      return glyph?.bbox?.maxY || 0
    })
    .filter((h) => h > 0)

  return heights.length > 0 ? Math.min(...heights) : 0
}

/**
 * Calculates and return trimmed ascender and descender to be used in
 * @param ascender
 * @param descender
 * @param unitsPerEm
 * @returns
 */
export const getCorrectedAscenderDescender = (ascender: number, descender: number, unitsPerEm: number) => {
  const absDescender = Math.abs(descender)
  const totalHeight = ascender + absDescender

  if (totalHeight > unitsPerEm) {
    const overshoot = (totalHeight - unitsPerEm) / 2
    return {
      upmAscender: ascender - overshoot,
      upmDescender: absDescender - overshoot,
    }
  }

  return {
    upmAscender: ascender,
    upmDescender: absDescender,
  }
}

/**
 * The same correction as `getCorrectedAscenderDescender`, for values already
 * normalized to em. Shares that function rather than repeating the arithmetic,
 * so the two can't drift apart.
 * @param ascender - Ascender in em
 * @param descender - Descender in em (either sign)
 * @returns Both in em, summing to exactly 1 whenever the font's own metrics reach or exceed the em
 */
export const correctedEmMetrics = (ascender: number, descender: number): { ascender: number; descender: number } => {
  const { upmAscender, upmDescender } = getCorrectedAscenderDescender(ascender, descender, 1)
  return { ascender: upmAscender, descender: upmDescender }
}

/**
 * How far the leading-trim fallback's cap top lands from where the browser
 * actually draws it, in em. Zero when the browser reads the same ascender and
 * descender the trim was calculated from.
 *
 * The fallback's `::before` removes `(1lh - 1em) / 2 + topTrim`, which assumes
 * a content area of exactly 1em. The browser's real distance from the line
 * box's top to the cap top is `(1lh - (A + D)) / 2 + (A - capHeight)`, for
 * whichever A and D it picked. Subtracting one from the other cancels `1lh`
 * and `capHeight` and leaves what this returns. It comes out to zero whenever
 * A and D are the corrected metrics, at any line-height, which is why the
 * assumption holds for most fonts and silently fails for the rest.
 *
 * Which A and D the browser picks isn't a property of the font: with OS/2
 * `fsSelection` bit 7 (`USE_TYPO_METRICS`) set it reads the typo metrics
 * everywhere, and with it clear Windows reads `usWin` while macOS reads
 * `hhea`. Callers compute both and take the worst, since CSS can't branch on
 * the platform.
 * @param browserAscender - Ascender the browser reads, in em
 * @param browserDescender - Descender the browser reads, in em (positive)
 * @param correctedAscender - Ascender the trim was calculated against, in em (see `correctedEmMetrics`)
 * @returns Absolute error in em, independent of font-size and line-height
 */
export const capTopError = (browserAscender: number, browserDescender: number, correctedAscender: number): number =>
  Math.abs((1 - (browserAscender + browserDescender)) / 2 + (browserAscender - correctedAscender))

/**
 * Calculates trim values for text-box-trim CSS polyfill
 * @param capHeight - Cap height in font units
 * @param upmAscender - Corrected ascender value
 * @param upmDescender - Corrected descender value (positive)
 * @param unitsPerEm - Font's units per em
 * @returns Object with top and bottom trim values
 */
export const calculateTrimValues = (
  capHeight: number,
  upmAscender: number,
  upmDescender: number,
  unitsPerEm: number,
): { topTrim: number; bottomTrim: number } => {
  const topTrim = Math.round(Math.abs((capHeight - upmAscender) / unitsPerEm) * unitsPerEm)

  const bottomTrim = Math.round(Math.abs(upmDescender / unitsPerEm) * unitsPerEm)

  return { topTrim, bottomTrim }
}

/**
 * Checks if a font only contains uppercase glyphs
 * @param font - The fontkit Font object
 * @returns true if font is all-caps (no lowercase glyphs or lowercase = uppercase)
 */
export const isAllCapsFont = (font: Font): boolean => {
  // Check for missing lowercase glyphs
  const hasLowercase = ['a', 'e', 'i', 'o', 'n'].some((char) => font.hasGlyphForCodePoint(char.charCodeAt(0)))

  if (!hasLowercase) return true

  // Check if lowercase = uppercase (same glyph)
  const lowerA = font.glyphForCodePoint('a'.charCodeAt(0))
  const upperA = font.glyphForCodePoint('A'.charCodeAt(0))

  return lowerA?.id === upperA?.id
}

/**
 * Calculates average of an array of numbers
 * @param values - Array of numbers to average
 * @returns Average value, or 0 if array is empty
 */
export const average = (values: number[]): number => {
  return values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : 0
}

/**
 * Calculates average side bearings for given characters
 * @param font - The fontkit Font object
 * @returns Object with average left and right side bearings in font units
 */
export const getAverageSideBearings = (font: Font): { lsb: number; rsb: number } => {
  const lsbValues: number[] = []
  const rsbValues: number[] = []

  const charList: string[] = isAllCapsFont(font) ? 'BDEHILNORS'.split('') : 'aehilmnors'.split('')

  for (const char of charList) {
    try {
      const glyph = font.glyphForCodePoint(char.charCodeAt(0))
      if (!glyph || glyph.id === 0) continue

      // LSB (left side bearing)
      lsbValues.push(glyph.bbox.minX)

      // RSB (right side bearing): advanceWidth minus where the letter path ends
      const rsb = glyph.advanceWidth - glyph.bbox.maxX
      rsbValues.push(rsb)
    } catch {
      continue
    }
  }

  return {
    lsb: Math.round(average(lsbValues)),
    rsb: Math.round(average(rsbValues)),
  }
}


// English letter-frequency weights (space + a-z sum to 1), used to weight
// advance-width by how often each character actually appears in running
// text. Space dominates (~18%) because average word length + gap is what
// determines where text wraps — see notes/trimscale-css-avgcharwidth.md.
const CHAR_WEIGHTS: Record<string, number> = {
  ' ': 0.1801,
  e: 0.1025, t: 0.0761, a: 0.0659, o: 0.0627, i: 0.0621,
  n: 0.0593, s: 0.0534, r: 0.0515, h: 0.0414, l: 0.0334,
  d: 0.0313, c: 0.0274, u: 0.0224, m: 0.0206, f: 0.0197,
  p: 0.0176, g: 0.0153, w: 0.0138, y: 0.0136, b: 0.0121,
  v: 0.0086, k: 0.0044, x: 0.0019, j: 0.0013, q: 0.0010, z: 0.0007,
}

/**
 * Frequency-weighted average advance width over lowercase a-z + space,
 * used instead of OS/2 xAvgCharWidth (whose definition silently changes
 * between table versions — see notes/trimscale-css-avgcharwidth.md).
 * Missing glyphs are dropped and remaining weights renormalized rather
 * than silently counted as zero width.
 * @param font - The fontkit Font object
 * @returns Weighted average advance width, in font units (not normalized to em)
 */
export const getAvgAdvanceWidth = (font: Font): number => {
  const entries = Object.entries(CHAR_WEIGHTS)
    .map(([char, weight]) => {
      const glyph = font.glyphForCodePoint(char.codePointAt(0) ?? 0)
      return glyph && glyph.id !== 0 ? { width: glyph.advanceWidth, weight } : null
    })
    .filter((entry): entry is { width: number; weight: number } => entry !== null)

  const totalWeight = entries.reduce((sum, { weight }) => sum + weight, 0)
  const weightedAverage = entries.reduce((sum, { width, weight }) => sum + width * (weight / totalWeight), 0)

  // Real running text includes occasional capitals/punctuation that the
  // a-z+space weighting doesn't cover, making the raw weighted average ~4%
  // narrower than actual text width — measured empirically against rendered
  // .text-box-N wrap points, see notes/trimscale-css-avgcharwidth.md.
  const REAL_TEXT_CORRECTION = 1.044

  return weightedAverage * REAL_TEXT_CORRECTION
}

/**
 * Share of `CHAR_WEIGHTS`' total weight the font actually has glyphs for,
 * 0 to 1.
 *
 * `getAvgAdvanceWidth` drops missing characters and renormalizes the rest,
 * which is right for a font missing a `q` or a `z` and badly wrong for a font
 * missing everything: with only the space glyph present it returns the width
 * of a space and calls it the average character. `getAverageSideBearings`
 * fails in a nastier way still, averaging an empty list to `0`, which reads
 * downstream as "this font needs no horizontal trim" rather than as a
 * failure.
 *
 * The case that produces this in practice is a Google Fonts subset URL that
 * isn't the `latin` one: `latin-ext` covers Ā-ž and has no basic lowercase at
 * all. See `docs/adding-a-font.md`.
 * @param font - The fontkit Font object
 * @returns Covered share of the sample's total weight
 */
export const getSampleCoverage = (font: Font): number => {
  const entries = Object.entries(CHAR_WEIGHTS)
  const totalWeight = entries.reduce((sum, [, weight]) => sum + weight, 0)
  const coveredWeight = entries.reduce(
    (sum, [char, weight]) => (font.hasGlyphForCodePoint(char.codePointAt(0) ?? 0) ? sum + weight : sum),
    0,
  )

  return coveredWeight / totalWeight
}
