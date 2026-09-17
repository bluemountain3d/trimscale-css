import type { FluidScale } from '../models/Config.ts'
import { kebabKeys, type ScssTree } from './helpers.ts'

const TypeScaleTable = {
  'Minor Second': 1.067,
  'Major Second': 1.125,
  'Minor Third': 1.2,
  'Major Third': 1.25,
  'Perfect Fourth': 1.333,
  // biome-ignore lint/suspicious/noApproximativeNumericConstant: a published typographic ratio, not an approximation of Math.SQRT2. The three-decimal value is what a config author types and what every generated size is computed from; Math.SQRT2 raises the sixth step from 159.86px to 160.00px at a 20px base.
  'Augmented Fourth': 1.414,
  'Perfect Fifth': 1.5,
  'Golden Ratio': 1.618,
}

/**
 * Builds the `$fluid-scale` map from a `FluidScale` config object, for use as
 * a `@use 'trimscale-css' with ($fluid-scale: ...)` argument in the generated
 * bridge file. Named type-scale values (e.g. `'Perfect Fourth'`) are
 * resolved to their numeric ratio via `TypeScaleTable`; already-numeric
 * values pass through as-is.
 * @param data - The source config (`cfg.fluidScale`).
 */
export const fluidScaleTree = (data: FluidScale): ScssTree =>
  kebabKeys(data, (value) => (typeof value === 'string' ? TypeScaleTable[value] : value))
