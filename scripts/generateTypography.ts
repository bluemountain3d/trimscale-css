import type {
  DynamicLineHeight,
  FontRoles,
  FontWeights,
  LineHeights,
  ModularTypographicScale,
  ScaleStep,
  SemanticFontSizes,
  SizeStep,
} from '../models/Config.ts'
import { setNestedScssMap, setScssMapEntries, setScssMapEntry, setScssMapValue, toKebabCase } from './helpers.ts'

/**
 * Builds each typography config map's VALUE (no `$name:`/`!default`, see
 * {@link setScssMapValue}), for use as `@use 'trimscale-css' with
 * ($font-roles: ..., $modular-typographic-scale: ..., ...)` arguments in
 * the generated bridge file.
 */

// Font Roles ==================================================================
export const fontRolesToScssMapValue = (data: FontRoles): string => setScssMapValue(setScssMapEntries(data, 2))

// Modular Typographic Scale ==================================================
export const modularTypographicScaleToScssMapValue = (data: ModularTypographicScale): string => {
  const entries = Object.entries(data).map(([key, value]) => {
    const innerEntries = Object.entries(value as ScaleStep).map(([k, v]) => setScssMapEntry(k, v, 3))
    return setNestedScssMap(toKebabCase(key), innerEntries, 2)
  })
  return setScssMapValue(entries)
}

// Semantic Font Sizes ========================================================
export const semanticFontSizesToScssMapValue = (data: SemanticFontSizes): string => {
  const entries = Object.entries(data).map(([key, value]) => {
    const innerEntries = Object.entries(value as SizeStep).map(([k, v]) =>
      setScssMapEntry(k, k === 'from' ? toKebabCase(v as string) : v, 3),
    )
    return setNestedScssMap(toKebabCase(key), innerEntries, 2)
  })
  return setScssMapValue(entries)
}

// Font Weights ===============================================================
export const fontWeightsToScssMapValue = (data: FontWeights): string => setScssMapValue(setScssMapEntries(data, 2))

// Line-heights ===============================================================
export const lineHeightsToScssMapValue = (data: LineHeights): string => setScssMapValue(setScssMapEntries(data, 2))

// Dynamic Line-height ========================================================
const DYNAMIC_LINE_HEIGHT_DEFAULTS: Required<DynamicLineHeight> = {
  fsBase: 16,
  ratioBase: 1.5,
  fsCeil: 64,
  ratioCeil: 1.05,
  ratioCap: 1.6,
}

/**
 * Builds the `$dynamic-line-height` map VALUE from a `DynamicLineHeight`
 * config object, backfilling any omitted field with its own default (see
 * {@link DYNAMIC_LINE_HEIGHT_DEFAULTS}) since the generated map fully
 * replaces the package's own `!default` map rather than merging into it.
 */
export const dynamicLineHeightToScssMapValue = (data: DynamicLineHeight = {}): string => {
  const merged = { ...DYNAMIC_LINE_HEIGHT_DEFAULTS, ...data }
  const entries = Object.entries(merged).map(([key, value]) => `    "${toKebabCase(key)}": ${value},\n`)
  return setScssMapValue(entries)
}
