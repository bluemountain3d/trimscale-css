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
