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
import { type ScssTree, kebabKeys, toKebabCase } from './helpers.ts'

/**
 * Builds each typography config map, for use as `@use 'trimscale-css' with
 * ($font-roles: ..., $modular-typographic-scale: ..., ...)` arguments in
 * the generated bridge file.
 */

// Font Roles ==================================================================
/** `data` is `Partial<FontRoles>` rather than `FontRoles` so `{}` (no `appFonts` configured) is a valid call, not just a config with `primary`/`body` set. Role keys are used verbatim, matching what `utilityClassesDoc.ts` documents. */
export const fontRolesTree = (data: Partial<FontRoles>): ScssTree => ({ ...data })

// Modular Typographic Scale ==================================================
/** Step keys inside a `ScaleStep` are already kebab-free (`min`/`max`/...), so only the step names are converted. */
export const modularTypographicScaleTree = (data: ModularTypographicScale): ScssTree =>
  kebabKeys(data, (step) => ({ ...(step as ScaleStep) }))

// Semantic Font Sizes ========================================================
/** A `from` field names another size step, so its VALUE is kebab-cased too: it has to match the key that step was emitted under. */
export const semanticFontSizesTree = (data: SemanticFontSizes): ScssTree =>
  kebabKeys(data, (step) =>
    Object.fromEntries(
      Object.entries(step as SizeStep).map(([field, value]) => [
        field,
        field === 'from' ? toKebabCase(value as string) : value,
      ]),
    ),
  )

// Font Weights ===============================================================
export const fontWeightsTree = (data: FontWeights): ScssTree => ({ ...data })

// Line-heights ===============================================================
export const lineHeightsTree = (data: LineHeights): ScssTree => ({ ...data })

// Dynamic Line-height ========================================================
const DYNAMIC_LINE_HEIGHT_DEFAULTS: Required<DynamicLineHeight> = {
  fsBase: 16,
  ratioBase: 1.5,
  fsCeil: 64,
  ratioCeil: 1.05,
  ratioCap: 1.6,
}

/**
 * Builds the `$dynamic-line-height` map from a `DynamicLineHeight` config
 * object, backfilling any omitted field with its own default (see
 * {@link DYNAMIC_LINE_HEIGHT_DEFAULTS}) since the generated map fully
 * replaces the package's own `!default` map rather than merging into it.
 */
export const dynamicLineHeightTree = (data: DynamicLineHeight = {}): ScssTree =>
  kebabKeys({ ...DYNAMIC_LINE_HEIGHT_DEFAULTS, ...data }, (value) => value)
