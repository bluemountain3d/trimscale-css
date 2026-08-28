import * as fs from 'node:fs'
import type { Font } from 'fontkit'
import * as fontkit from 'fontkit'
import {
  calculateTrimValues,
  getAverageSideBearings,
  getBBoxHeight,
  getCorrectedAscenderDescender,
} from './generateFontMetrics.helpers.ts'
import { toKebabCase } from './helpers.ts'
import { loadConfig } from './loadConfig.ts'

const cfg = await loadConfig()

/**
 * Per-family font metrics used to generate leading-trim and font-family SCSS
 * variables. All numeric values are normalized to font units-per-em, except
 * `family` which is a ready-to-use SCSS font-family string.
 */
export interface FamilyFontMetrics {
  /** SCSS-ready font-family value, e.g. '"Roboto", sans-serif' */
  family: string
  /** Average character width, normalized to em */
  avgCharWidth: number
  /** Space between cap-height and ascender, normalized to em */
  topTrim: number
  /** Space between baseline and descender, normalized to em */
  bottomTrim: number
  /** Left side bearing adjustment, normalized to em (negative) */
  lsbAdjust: number
  /** Right side bearing adjustment, normalized to em (negative) */
  rsbAdjust: number
}

export type ParsedFont = {
  name: string
  data: FamilyFontMetrics
  /** Whether the file's OS/2 table declares it italic (`fsSelection` bit 0) */
  isItalic: boolean
  /** The file's declared weight class (OS/2 `usWeightClass`), e.g. 400 = Regular, 700 = Bold */
  weightClass: number
  /** `wght` axis min/max from the `fvar` table for a variable font, or `null` for a static font */
  weightRange: {min: number, max: number} | null
}

// Weight metrics are extracted at. fontkit@2.0.4's getVariation() is
// unreliable for WOFF2 (drops the cmap table when re-instancing), so we only
// need to instance when the target weight differs from the axis default —
// otherwise the font's un-varied outline already represents the target
// weight (guaranteed by the OpenType spec).
const TARGET_WEIGHT = 400

/**
 * Extracts leading-trim and font-family metrics from a single font file.
 * @param filePath - Absolute path to a .ttf/.otf/.woff/.woff2 font file
 * @returns The font's resolved family name and its normalized metrics
 */
export const parseFontFile = async (filePath: string): Promise<ParsedFont> => {
  const buffer = await fs.promises.readFile(filePath)
  const fontOrCollection = fontkit.create(buffer)

  let font: Font

  if ('fonts' in fontOrCollection) {
    const firstFont = fontOrCollection.fonts[0]

    if (!firstFont) {
      throw new Error(`Font collection in the file is empty: ${filePath}`)
    }

    font = firstFont
  } else {
    font = fontOrCollection
  }

  // Cache the original font's OS/2 table up front — works around an internal fontkit crash otherwise
  const f = font as any
  const os2 = f['OS/2']

  if (!os2) {
    throw new Error(`Could not find the OS/2 table in font ${font.familyName}`)
  }

  // Prefer nameID 16 (Typographic Family) over nameID 1 (legacy family):
  // variable fonts with multiple width masters (e.g. Condensed) often encode
  // the "real" family name there instead
  const fontName = f.name.records.preferredFamily?.en || font.familyName || 'Unknown'

  const isVariable = !!f.variationAxes?.wght
  let activeFont = font

  if (isVariable) {
    const defaultWeight = f.variationAxes.wght.default
    // console.log(`Variable font detected: ${fontName} (default weight ${defaultWeight}).`)

    if (defaultWeight !== TARGET_WEIGHT) {
      try {
        const instance = f.getVariation({ wght: TARGET_WEIGHT })

        // Instancing is lazy, so force a glyph read to trigger any crash here,
        // where we can catch it cleanly
        instance.glyphForCodePoint(65) // 'A'

        activeFont = instance
      } catch (e) {
        console.warn(
          `Could not instance wght ${TARGET_WEIGHT} (fontkit's getVariation() is unreliable for WOFF2). Metrics may be inaccurate — falling back to default weight (${defaultWeight}).`,
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

  const avgCharWidth: number = os2.xAvgCharWidth // Read directly from the original's OS/2

  const { upmAscender, upmDescender } = getCorrectedAscenderDescender(os2.typoAscender, os2.typoDescender, upm)

  const { topTrim, bottomTrim } = calculateTrimValues(capHeight, upmAscender, upmDescender, upm)

  // Side bearings MUST come from activeFont — glyph widths actually change with weight
  const { lsb, rsb } = getAverageSideBearings(activeFont)

  // Fall back safely if the file's name diffs from the config
  // const fallback = cfg.appFonts.fallbacks[fontName] || cfg.appFonts.defaultFallback || 'sans-serif';
  const fallback = cfg.appFonts.fallbacks
    ? cfg.appFonts.fallbacks[fontName]
    : cfg.appFonts.defaultFallback
      ? cfg.appFonts.defaultFallback
      : 'sans-serif'

  const isNext = cfg.appFonts.nextFont;
  const nextPrefix = cfg.appFonts.nextFontPrefix ?? 'next-font';
  const scssFamilyString = isNext
    ? `var(--${nextPrefix}-${toKebabCase(fontName)}), ${fallback}`
    : `'"${fontName}", ${fallback}'`

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
    name: fontName,
    data: {
      family: scssFamilyString,
      avgCharWidth: +(avgCharWidth / upm).toFixed(3),
      topTrim: +(topTrim / upm).toFixed(3),
      bottomTrim: +(bottomTrim / upm).toFixed(3),
      lsbAdjust: +((lsb / upm) * -1).toFixed(4),
      rsbAdjust: +((rsb / upm) * -1).toFixed(4),
    },
    isItalic: isItalic,
    weightClass: weightClass,
    weightRange: weightRange
  }
}
