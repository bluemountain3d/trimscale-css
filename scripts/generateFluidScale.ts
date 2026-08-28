import * as fs from 'node:fs'
import path from 'node:path'
import type { FluidScale } from '../models/Config.ts'
import { loadConfig } from './loadConfig.ts'
import { setScssMap, toKebabCase } from './helpers.ts'

const cfg = await loadConfig()

const TypeScaleTable = {
  'Minor Second': 1.067,
  'Major Second': 1.125,
  'Minor Third': 1.2,
  'Major Third': 1.25,
  'Perfect Fourth': 1.333,
  'Augmented Fourth': 1.414,
  'Perfect Fifth': 1.5,
  'Golden Ratio': 1.618,
}

const sassDocs = `
/// @group Abstracts/Variables
/// @name Fluid Typography Scale
/// @description Configuration for fluid typography system
/// Controls how font sizes scale between viewport sizes using modular scale
/// ===========================================================================

// ============================================================================
// Fluid Typography Configuration
// ============================================================================

/// Fluid typography scale configuration
/// @type Map
/// @prop {Number} min-width - Minimum viewport width in pixels (360px)
/// @prop {Number} max-width - Maximum viewport width in pixels (1440px)
/// @prop {Number} min-font-size - Base font size at min viewport (16px)
/// @prop {Number} max-font-size - Base font size at max viewport (20px)
/// @prop {Number} min-type-scale - Modular scale ratio at min viewport (1.2 - Minor Third)
/// @prop {Number} max-type-scale - Modular scale ratio at max viewport (1.333 - Perfect Fourth)
/// @prop {Number} precision - Decimal precision for calculations (4)
/// @link https://type-scale.com/ Type scale calculator
/// @example
///   // At 360px viewport: base = 16px, scale = 1.2
///   // Level 1: 16 * 1.2 = 19.2px
///   // Level 2: 16 * 1.2^2 = 23.04px
///
///   // At 1440px viewport: base = 20px, scale = 1.333
///   // Level 1: 20 * 1.333 = 26.66px
///   // Level 2: 20 * 1.333^2 = 35.54px
`

/**
 * Builds the `$fluid-scale` SCSS map from a `FluidScale` config object.
 * Named type-scale values (e.g. `'Perfect Fourth'`) are resolved to their
 * numeric ratio via `TypeScaleTable`; already-numeric values pass through as-is.
 * @param data - The source config (`cfg.fluidScale`).
 * @returns The complete SCSS map declaration string.
 */
const objectToScssMap = (data: FluidScale): string => {
  const entries: string[] = Object.entries(data).map(([key, value]) => {
    const outValue = typeof value === 'string' ? TypeScaleTable[value] : value
    return `  "${toKebabCase(key)}": ${outValue},\n`
  })

  return setScssMap(sassDocs, 'fluid-scale', entries)
}

const outputFile = path.join(import.meta.dirname, '../styles/abstracts/variables/_fluid-scale.scss')
fs.writeFileSync(outputFile, objectToScssMap(cfg.fluidScale))
console.log('- Fluid Scale abstracts is written to file')
