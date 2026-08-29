// ============================================================================
// Typography & Breakpoints
// ============================================================================

// FluidScale & Breakpoints ===================================================
/** Named modular-scale ratios usable in `FluidScale.minTypeScale`/`maxTypeScale`, resolved to their numeric value via `TypeScaleTable` in generateFluidScale.ts. */
export type TypeScaleNames =
  | 'Minor Second'
  | 'Major Second'
  | 'Minor Third'
  | 'Major Third'
  | 'Perfect Fourth'
  | 'Augmented Fourth'
  | 'Perfect Fifth'
  | 'Golden Ratio'

/** The literal ratio values `TypeScaleNames` resolve to — also valid directly as a `minTypeScale`/`maxTypeScale` value. */
export type TypeScaleValues = 1.067 | 1.125 | 1.2 | 1.25 | 1.333 | 1.414 | 1.5 | 1.618

/** Fluid clamp() boundaries: base font-size and modular-scale ratio at the min/max viewport widths. Source for `$fluid-scale` and every `ModularTypographicScale` entry's clamp(). */
export type FluidScale = {
  minWidth: number
  maxWidth: number
  minFontSize: number
  maxFontSize: number
  minTypeScale: TypeScaleNames | TypeScaleValues
  maxTypeScale: TypeScaleNames | TypeScaleValues
  precision: 1 | 2 | 3 | 4 | 5 | 6
}

/** Named viewport breakpoints (in px). Generates the `$breakpoints` SCSS map (kebab-cased keys, converted to rem). */
export type Breakpoints = {
  mobile?: number
  phablet?: number
  tablet?: number
  tabletLg?: number
  laptop?: number
  desktop?: number
  [customBreakpoint: string]: number | undefined
}

// AppFonts ===================================================================
/** Generic CSS font-family fallback keywords usable in `AppFonts.fallbacks`/`defaultFallback`. */
export type FontFallbacks = 'sans-serif' | 'serif' | 'monospace' | 'system-ui' | 'cursive'

/** Local font files and their fallback stacks. See `nextFont`/`nextFontPrefix` for Next.js `next/font/local` integration. */
export type AppFonts = {
  fontPath: string
  nextFont?: boolean // only for next/font/local — metrics require a local font file (fontPath); next/font/google has none to read
  nextFontPrefix?: string // defaults to 'next-font' if omitted
  fallbacks?: Record<string, FontFallbacks>
  defaultFallback: FontFallbacks
}

// FontRoles ==================================================================
/** Maps semantic font roles (primary, heading, body, etc.) to font family names defined in appFonts/font-metrics. `primary` and `body` are required; all others, including arbitrary custom roles via the index signature, are optional. */
export type FontRoles = {
  primary: string
  secondary?: string
  tertiary?: string
  sans?: string
  serif?: string
  mono?: string
  display?: string
  heading?: string
  subheading?: string
  body: string
  decorative?: string
  quote?: string
  code?: string
  ui?: string
  [customRole: string]: string | undefined
}

// FontSizes ==================================================================
/** One step of the modular type scale: `step` is the exponent in the modular-scale formula (0 = fluidScale's base font-size), `unit` is the viewport unit used for the fluid clamp() interpolation. */
export type ScaleStep = {
  step: number
  unit: 'vwx' | 'cqw' | 'cqi' | 'vw'
}

/** The base modular scale (`fs100`..`fs900`). Each entry generates a `--fs-*` custom property as a fluid clamp(). Referenced by `SemanticFontSizes`' `from` field for `type: 'scale'` entries. */
export type ModularTypographicScale = {
  fs100?: ScaleStep
  fs200?: ScaleStep
  fs300?: ScaleStep
  fs350?: ScaleStep
  fs400?: ScaleStep
  fs500?: ScaleStep
  fs600?: ScaleStep
  fs700?: ScaleStep
  fs800?: ScaleStep
  fs900?: ScaleStep
  [customRole: string]: ScaleStep | undefined
}

/** One semantic font-size role's definition: `type: 'scale'` aliases directly to a `ModularTypographicScale` key (`from` names an fs-key); `type: 'linear'` multiplies another `SemanticFontSizes` role via calc() instead of getting its own fluid clamp(). */
export type SizeStep = { type: 'scale'; from: string } | { type: 'linear'; from: string; multiplier: number }

/** Named roles (display1, heading1, textBase, etc.), generates CSS custom properties like `--display-1`, `--text-base`. See `SizeStep` for how each role resolves. */
export type SemanticFontSizes = {
  display1?: SizeStep
  display2?: SizeStep
  heading1?: SizeStep
  heading2?: SizeStep
  heading3?: SizeStep
  heading4?: SizeStep
  textLg?: SizeStep
  textMd?: SizeStep
  textBase?: SizeStep
  textSm?: SizeStep
  textXs?: SizeStep
  [customRole: string]: SizeStep | undefined
}

// FontWeights ================================================================
/** Named font-weight scale. Generates `--font-weight-*` custom properties. */
export type FontWeights = {
  thin?: number
  extralight?: number
  light?: number
  normal?: number
  medium?: number
  semibold?: number
  bold?: number
  extrabold?: number
  black?: number
  [customRole: string]: number | undefined
}

/** Named line-height scale (percent-based keys, e.g. `'125'` = 1.25). Generates `--line-height-*` custom properties. */
export type LineHeights = Record<string, number>

// ============================================================================
// Spacing
// ============================================================================

/** Named spacing tiers usable in `SpacingSetup`'s scale maps — the fixed names, or `${number}xs`/`${number}xl` for extra tiers beyond `xs`/`xl` (e.g. `'2xs'`, `'4xl'`). */
type TShirtScale =
  | `${number}xs`
  | 'xs'
  | 'sm'
  | 'md'
  | 'lg'
  | 'xl'
  | `${number}xl`

/**
 * How `--space-*` tokens grow across viewport widths.
 * - `'coupled'` ties spacing to the fluid type scale: a single `--unit`
 *   (fluidScale's base font-size / $base-grid-size) drives every step, so
 *   one `tShirtScale` map covers every named tier.
 * - `'independent'` keeps spacing on its own two-unit system instead:
 *   `--unit-micro` (static, fixed at `$base-grid-size`) for small steps,
 *   `--unit-macro` (its own fluid clamp from `$base-grid-size` up to
 *   `macroRangeMax`, endpoints unrelated to fluidScale but its viewport
 *   range still comes from fluidScale) for large steps — hence two
 *   separate tier maps (`tShirtScaleMicro`/`tShirtScaleMacro`) and two
 *   numeric-scale bounds (`numericScaleMicroEnd`/`numericScaleMacroEnd`).
 */
export type SpacingSetup =
  | {
    approach: 'coupled'
    tShirtScale: Partial<Record<TShirtScale, number>>
    numericScaleEnd: number
  }
  | {
    approach: 'independent'
    /** Upper end (px) of `--unit-macro`'s fluid clamp at `fluidScale.maxWidth`. The lower end is always `$base-grid-size`, so the two units meet at `fluidScale.minWidth`. @default 8 */
    macroRangeMax?: 4 | 5 | 6 | 7 | 8 | 10 | 12 | 14 | 16
    tShirtScaleMicro: Partial<Record<TShirtScale, number>>
    tShirtScaleMacro: Partial<Record<TShirtScale, number>>
    numericScaleMicroEnd: number
    numericScaleMacroEnd: number
  };

// ============================================================================
// Colors
// ============================================================================

/** Which scheme (light/dark) backs the static fallback tier for browsers without oklch()/light-dark() support. */
export type DefaultScheme = 'light' | 'dark'

/** CSS properties a color token can generate a utility class for (see `ColorToken.utilities`). */
// export type ColorUtilityProperty = 'color' | 'background-color' | 'border-color' | 'fill' | 'stroke'

/** A single light-or-dark color value, given as both `oklch` (used directly) and `hex` (static fallback). */
export type ColorDefinition = {
  oklch: string
  hex: string
}

/** One base color token's light/dark definitions, plus optional shared opacity and which CSS properties to generate utility classes for. */
export type ColorToken = {
  light: ColorDefinition
  dark: ColorDefinition
  opacity?: number
  // utilities?: ColorUtilityProperty[]
}

/** A named palette: a CSS custom-property prefix plus its color tokens. Used for both `baseColorTokens` and any custom `{name}ColorTokens` map. */
export type ColorTokensMap = {
  prefix: string
  tokens: Record<string, ColorToken>
}

/** A semantic name (e.g. 'text-muted') aliasing a token from `baseColorTokens` or a custom tokenMap, with optional opacity/lightness/chroma overrides (single value, or per light/dark). */
export type SemanticAlias = {
  token: string
  tokenMap?: 'baseColorTokens' | `${string}ColorTokens` // | (string & {});
  opacity?: number
  lightness?: number | { light: number; dark: number }
  chroma?: number | { light: number; dark: number }
}

/** Map of semantic alias name to its `SemanticAlias` definition. */
export type SemanticColorAliases = Record<string, SemanticAlias>

// ============================================================================
// Full Config
// ============================================================================

/** The full trimscale-css configuration shape — see `trimscale.config.ts` for the actual values and field-by-field documentation. */
export type TrimscaleConfig = {
  /* Typography */
  appFonts: AppFonts
  fontRoles: FontRoles
  fluidScale: FluidScale
  breakpoints: Breakpoints
  modularTypographicScale: ModularTypographicScale
  semanticFontSizes: SemanticFontSizes
  fontWeights: FontWeights
  lineHeights: LineHeights
  /* Spacing */
  spacingSetup: SpacingSetup
  /* Color */
  defaultScheme: DefaultScheme
  // colorUtilityClasses?: ColorUtilityProperty[]
  baseColorTokens: ColorTokensMap
  semanticColorAliases?: SemanticColorAliases
  [customMapName: `${string}ColorTokens`]: ColorTokensMap
}
