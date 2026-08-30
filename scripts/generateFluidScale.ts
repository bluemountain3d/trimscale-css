import type { FluidScale } from '../models/Config.ts'
import { setScssMapValue, toKebabCase } from './helpers.ts'

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

/**
 * Builds the `$fluid-scale` map VALUE (no `$name:`/`!default`, see
 * {@link setScssMapValue}) from a `FluidScale` config object, for use as a
 * `@use 'trimscale-css' with ($fluid-scale: ...)` argument in the generated
 * bridge file. Named type-scale values (e.g. `'Perfect Fourth'`) are
 * resolved to their numeric ratio via `TypeScaleTable`; already-numeric
 * values pass through as-is.
 * @param data - The source config (`cfg.fluidScale`).
 * @returns The bare map literal string.
 */
export const fluidScaleToScssMapValue = (data: FluidScale): string => {
  const entries: string[] = Object.entries(data).map(([key, value]) => {
    const outValue = typeof value === 'string' ? TypeScaleTable[value] : value
    return `    "${toKebabCase(key)}": ${outValue},\n`
  })

  return setScssMapValue(entries)
}
