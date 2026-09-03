import type { Font } from 'fontkit'
import * as fontkit from 'fontkit'
import type { RawFontMetrics } from '../models/Config.ts'
import {
  calculateTrimValues,
  getAverageSideBearings,
  getAvgAdvanceWidth,
  getBBoxHeight,
  getCorrectedAscenderDescender,
} from './generateFontMetrics.helpers.ts'

export type ParsedFont = {
  metrics: RawFontMetrics
  /** Whether the file's OS/2 table declares it italic (`fsSelection` bit 0) */
  isItalic: boolean
  /** The file's declared weight class (OS/2 `usWeightClass`), e.g. 400 = Regular, 700 = Bold */
  weightClass: number
  /** `wght` axis min/max from the `fvar` table for a variable font, or `null` for a static font */
  weightRange: { min: number; max: number } | null
}

// Weight metrics are extracted at. fontkit@2.0.4's getVariation() is
// unreliable for WOFF2 (drops the cmap table when re-instancing), so we only
// need to instance when the target weight differs from the axis default —
// otherwise the font's un-varied outline already represents the target
// weight (guaranteed by the OpenType spec).
const TARGET_WEIGHT = 400

/**
 * Extracts leading-trim and side-bearing metrics from a single font file's
 * raw bytes. The caller (local read or remote fetch) is responsible for
 * getting the buffer, this only touches fontkit.
 * @param buffer - The font file's raw bytes (.ttf/.otf/.woff/.woff2)
 * @param label - Human-readable source description used in error messages only (e.g. `'Roboto (./fonts/roboto.woff2)'`)
 * @returns The font's normalized metrics plus its italic/weight classification
 */
export const parseFontBuffer = async (buffer: Buffer, label: string): Promise<ParsedFont> => {
  const fontOrCollection = fontkit.create(buffer)

  let font: Font

  if ('fonts' in fontOrCollection) {
    const firstFont = fontOrCollection.fonts[0]

    if (!firstFont) {
      throw new Error(`Font collection in the file is empty: ${label}`)
    }

    font = firstFont
  } else {
    font = fontOrCollection
  }

  // Cache the original font's OS/2 table up front — works around an internal fontkit crash otherwise
  const f = font as any
  const os2 = f['OS/2']

  if (!os2) {
    throw new Error(`Could not find the OS/2 table in font: ${label}`)
  }

  const isVariable = !!f.variationAxes?.wght
  let activeFont = font

  if (isVariable) {
    const defaultWeight = f.variationAxes.wght.default

    if (defaultWeight !== TARGET_WEIGHT) {
      try {
        const instance = f.getVariation({ wght: TARGET_WEIGHT })

        // Instancing is lazy, so force a glyph read to trigger any crash here,
        // where we can catch it cleanly
        instance.glyphForCodePoint(65) // 'A'

        activeFont = instance
      } catch (e) {
        console.warn(
          `Could not instance wght ${TARGET_WEIGHT} for ${label} (fontkit's getVariation() is unreliable for WOFF2). Metrics may be inaccurate — falling back to default weight (${defaultWeight}).`,
        )
        activeFont = font
      }
    }
  }

  const upm: number = font.unitsPerEm

  // Read capHeight from the ORIGINAL font to avoid a "reading 'ascent'" crash
  // if activeFont is a broken instance. Measure H/I/E/T on activeFont instead
  // if the table doesn't have it.
  let capHeight = font.capHeight
  if (!capHeight || capHeight <= 0) {
    capHeight = getBBoxHeight(activeFont, ['H', 'I', 'E', 'T'])
  }

  const avgCharWidth: number = getAvgAdvanceWidth(activeFont)

  const { upmAscender, upmDescender } = getCorrectedAscenderDescender(os2.typoAscender, os2.typoDescender, upm)

  const { topTrim, bottomTrim } = calculateTrimValues(capHeight, upmAscender, upmDescender, upm)

  // Side bearings MUST come from activeFont — glyph widths actually change with weight
  const { lsb, rsb } = getAverageSideBearings(activeFont)

  // Read from the original font's OS/2 table, not activeFont: fsSelection and
  // usWeightClass are style-classification fields the file declares about
  // itself (not glyph measurements), so they don't change between the
  // original and an instanced variation — reading from the original avoids
  // the getVariation() crash risk for no loss of accuracy.
  const isItalic = os2.fsSelection.italic
  const weightClass = os2.usWeightClass
  const weightRange = isVariable
    ? { min: f.variationAxes.wght.min, max: f.variationAxes.wght.max }
    : null

  return {
    metrics: {
      avgCharWidth: +(avgCharWidth / upm).toFixed(3),
      topTrim: +(topTrim / upm).toFixed(3),
      bottomTrim: +(bottomTrim / upm).toFixed(3),
      lsbAdjust: +((lsb / upm) * -1).toFixed(4),
      rsbAdjust: +((rsb / upm) * -1).toFixed(4),
      // Raw (uncorrected) OS/2 typo metrics, not upmAscender/upmDescender —
      // those are clipped to fit unitsPerEm for leading-trim's cap-height
      // math, but ascent-override/descent-override/line-gap-override need
      // the font's true declared metrics, overshoot and all.
      ascender: +(os2.typoAscender / upm).toFixed(3),
      descender: +(Math.abs(os2.typoDescender) / upm).toFixed(3),
      lineGap: +(os2.typoLineGap / upm).toFixed(3),
    },
    isItalic: isItalic,
    weightClass: weightClass,
    weightRange: weightRange,
  }
}
