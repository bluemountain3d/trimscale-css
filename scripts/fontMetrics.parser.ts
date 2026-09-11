import type { Font } from 'fontkit'
import * as fontkit from 'fontkit'
import type { RawFontMetrics } from '../models/Config.ts'
import {
  calculateTrimValues,
  getAverageSideBearings,
  getAvgAdvanceWidth,
  capTopError,
  getBBoxHeight,
  getCorrectedAscenderDescender,
  getSampleCoverage,
} from './fontMetrics.helpers.ts'

export type ParsedFont = {
  metrics: RawFontMetrics
  /** Whether the file's OS/2 table declares it italic (`fsSelection` bit 0) */
  isItalic: boolean
  /** The file's declared weight class (OS/2 `usWeightClass`), e.g. 400 = Regular, 700 = Bold */
  weightClass: number
  /** `wght` axis min/max from the `fvar` table for a variable font, or `null` for a static font */
  weightRange: { min: number; max: number } | null
  /** The ascender and descender the trim is calculated against, em. Emitted as `ascent-override`/`descent-override` so the browser measures the font the same way, see `capTopError`. */
  corrected: { ascender: number; descender: number }
  /** What the fallback trim would be off by, in em, if nothing overrides this font's metrics. Zero for a font that settles the question itself (see `capTopError`). */
  trimError: number
}

// Weight metrics are extracted at. fontkit@2.0.4's getVariation() is
// unreliable for WOFF2 (drops the cmap table when re-instancing), so we only
// need to instance when the target weight differs from the axis default —
// otherwise the font's un-varied outline already represents the target
// weight (guaranteed by the OpenType spec).
const TARGET_WEIGHT = 400

/**
 * Share of the character sample (see `getSampleCoverage`) a font has to cover
 * for its measured metrics to mean anything. Half is deliberately generous:
 * every real Latin font covers all of it, and the failure this guards against
 * lands at 18% (the space glyph alone).
 */
const MIN_SAMPLE_COVERAGE = 0.5

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

  const coverage = getSampleCoverage(activeFont)

  if (coverage < MIN_SAMPLE_COVERAGE) {
    throw new Error(
      `${label} has glyphs for only ${Math.round(coverage * 100)}% of the basic Latin characters the metrics are measured from, so its average character width and side bearings can't be read out of it. The usual cause is a Google Fonts URL for a subset other than \`latin\`: \`latin-ext\` holds Ā-ž and no basic lowercase at all. Take the \`src\` from the \`/* latin */\` block, see docs/adding-a-font.md. For a font that genuinely isn't Latin, supply the metrics yourself with \`source: 'manual'\`.`,
    )
  }

  // Read capHeight from the ORIGINAL font to avoid a "reading 'ascent'" crash
  // if activeFont is a broken instance. Measure H/I/E/T on activeFont instead
  // if the table doesn't have it.
  let capHeight = font.capHeight
  if (!capHeight || capHeight <= 0) {
    capHeight = getBBoxHeight(activeFont, ['H', 'I', 'E', 'T'])
  }

  // Both sources can come up empty: no `sCapHeight` in OS/2 and no H/I/E/T to
  // measure. A zero here doesn't fail, it silently becomes a top trim of a
  // full ascender, so it's caught rather than carried.
  if (capHeight <= 0) {
    throw new Error(
      `${label} declares no cap height in its OS/2 table and has no H, I, E or T glyph to measure one from, so its leading-trim values can't be derived. Supply the metrics yourself with \`source: 'manual'\`.`,
    )
  }

  const avgCharWidth: number = getAvgAdvanceWidth(activeFont)

  const { upmAscender, upmDescender } = getCorrectedAscenderDescender(os2.typoAscender, os2.typoDescender, upm)

  const { topTrim, bottomTrim } = calculateTrimValues(capHeight, upmAscender, upmDescender, upm)

  // What the browser would measure this font by if nothing overrides it. The
  // typo metrics above are only one of three candidates in the file, and the
  // file itself doesn't get to pick: `USE_TYPO_METRICS` set means every engine
  // reads them, clear means Windows reads `usWin` and macOS reads `hhea`. Both
  // are measured because CSS can't branch per platform, so the override has to
  // satisfy the worse of the two.
  const hhea = f.hhea
  const correctedAscender = upmAscender / upm
  const trimError = os2.fsSelection.useTypoMetrics
    ? 0
    : Math.max(
        capTopError(os2.winAscent / upm, os2.winDescent / upm, correctedAscender),
        hhea ? capTopError(hhea.ascent / upm, Math.abs(hhea.descent) / upm, correctedAscender) : 0,
      )

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
      // Raw (uncorrected) OS/2 typo metrics, not upmAscender/upmDescender:
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
    corrected: {
      ascender: +correctedAscender.toFixed(4),
      descender: +(upmDescender / upm).toFixed(4),
    },
    trimError: +trimError.toFixed(4),
  }
}
