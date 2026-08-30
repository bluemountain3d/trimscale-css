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
/** Generic CSS font-family fallback keywords usable in a `FontSource.fallback`/`AppFonts.fallbackDefault`. */
export type FontFallbacks = 'sans-serif' | 'serif' | 'monospace' | 'system-ui' | 'cursive'

/** The five trim/spacing metrics a font contributes, normalized to em. Same shape the generator extracts from a real font file — a `manual` `FontSource` supplies these by hand instead (see precisionspec.dev). */
export type RawFontMetrics = {
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

/**
 * Where one font family's metrics (and, for `local`/`cdn`, its `@font-face`
 * rules) come from. `path`/`url` accept multiple files so a family's full
 * weight/style range (or a single variable-font file) can be declared —
 * metrics are always read from whichever entry is closest to non-italic
 * weight 400, the rest still each get their own `@font-face`.
 */
export type FontSource =
  | {
      source: 'local'
      /** Path(s) to the font file(s) including file extension, relative to `trimscale.config.ts` */
      path: string[]
      fallback?: FontFallbacks
      /** Overrides `AppFonts.nextFontDefault` for this family only. Set `false` here if most of your fonts go through `next/font` but this particular one doesn't. */
      nextFont?: boolean
    }
  | {
      source: 'cdn'
      /** Direct URL(s) to the actual font file(s) — not a CSS-generating endpoint (e.g. not Google Fonts' `css2?family=...`, which resolves differently per `User-Agent` and isn't a font file itself). Fetched once and cached under `.trimscale-cache/fonts/` (gitignored), not re-fetched while cached. */
      url: string[]
      fallback?: FontFallbacks
      /** Write `@font-face` rules pointing at `url` (self-hosting via the CDN's file URLs directly). Default `false`: assumes the font is already loaded some other way (a `<link>` tag, a JS loader, `next/font/google`), and only metrics are needed. */
      generateFontFace?: boolean
      /** Overrides `AppFonts.nextFontDefault` for this family only. Set `true` here for a `next/font/google` font when most of your other fonts *aren't* going through `next/font`, or `false` if this one isn't even though most are. */
      nextFont?: boolean
    }
  | {
      source: 'manual'
      fallback?: FontFallbacks
      /** Hand-entered metrics for a font whose file trimscale can't read (e.g. a CDN that doesn't expose downloadable files). See precisionspec.dev. No `@font-face` is generated, load the font some other way. */
      metrics: RawFontMetrics
      /** Overrides `AppFonts.nextFontDefault` for this family only. */
      nextFont?: boolean
    }

/** Font sources (local, CDN, or manually-entered metrics) keyed by family name. See `nextFontDefault`/`nextFontPrefix` for Next.js `next/font` integration. */
export type AppFonts = {
  fonts: Record<string, FontSource>
  /** Whether `family` values are built around a `next/font` CSS variable instead of a plain quoted name, and (for `local`) whether trimscale skips writing its own `@font-face`. Applies to every family in `fonts` unless a family sets its own `nextFont`, which wins for that family only — most projects only ever set this here. */
  nextFontDefault?: boolean
  nextFontPrefix?: string // defaults to 'next-font' if omitted
  fallbackDefault: FontFallbacks
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
  uncapped?: boolean
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

/**
 * Curve for the self-scaling `--line-height-dynamic` token (see
 * `fn.dynamic-line-height` in `abstracts/functions`): pins an exact ratio at
 * one font-size, interpolates down to a minimum ratio at a ceiling
 * font-size, and caps the ratio for font-sizes below the natural crossover
 * point. All fields optional, each falls back to the function's own default.
 */
export type DynamicLineHeight = {
  /** Font-size (px) where `ratioBase` applies exactly. @default 16 */
  fsBase?: number
  /** Line-height ratio at `fsBase`. @default 1.5 */
  ratioBase?: number
  /** Font-size (px) at and beyond which the ratio bottoms out at `ratioCeil`. Must differ from `fsBase`. @default 64 */
  fsCeil?: number
  /** Ratio for large font-sizes (at/beyond `fsCeil`). Must not exceed `ratioCap`. @default 1.05 */
  ratioCeil?: number
  /** Ratio for small font-sizes (below the natural crossover point). @default 1.6 */
  ratioCap?: number
}

// ============================================================================
// Spacing
// ============================================================================

/** Named spacing tiers usable in `SpacingSetup`'s scale maps — the fixed names, or `${number}xs`/`${number}xl` for extra tiers beyond `xs`/`xl` (e.g. `'2xs'`, `'4xl'`). */
type TShirtScale = `${number}xs` | 'xs' | 'sm' | 'md' | 'lg' | 'xl' | `${number}xl`

/**
 * How `--space-*` tokens grow across viewport widths.
 * - `'coupled'` ties spacing to the fluid type scale: a single `--unit`
 *   (fluidScale's base font-size / `baseGridSize`) drives every step, so
 *   one `tShirtScale` map covers every named tier.
 * - `'independent'` keeps spacing on its own two-unit system instead:
 *   `--unit-micro` (static, fixed at `baseGridSize`) for small steps,
 *   `--unit-macro` (its own fluid clamp from `baseGridSize` up to
 *   `baseGridSize * macroRangeMultiplier`, endpoints unrelated to
 *   fluidScale but its viewport range still comes from fluidScale) for
 *   large steps — hence two separate tier maps
 *   (`tShirtScaleMicro`/`tShirtScaleMacro`) and two numeric-scale bounds
 *   (`numericScaleMicroEnd`/`numericScaleMacroEnd`).
 */
export type SpacingSetup = {
  /** The base spacing grid unit (px): `--unit-micro` under `'independent'`, or the divisor of `--unit` under `'coupled'`. @default 4 */
  baseGridSize?: 4 | 8
} & (
  | {
      approach: 'coupled'
      tShirtScale: Partial<Record<TShirtScale, number>>
      numericScaleEnd: number
    }
  | {
      approach: 'independent'
      /** Multiplier of `baseGridSize` giving `--unit-macro`'s upper end (px) at `fluidScale.maxWidth`. The lower end is always `baseGridSize`, so the two units meet at `fluidScale.minWidth`. @default 2 */
      macroRangeMultiplier?: 1.25 | 1.5 | 1.75 | 2 | 2.25 | 2.5 | 2.75 | 3 | 3.25 | 3.5 | 3.75 | 4
      tShirtScaleMicro: Partial<Record<TShirtScale, number>>
      tShirtScaleMacro: Partial<Record<TShirtScale, number>>
      numericScaleMicroEnd: number
      numericScaleMacroEnd: number
    }
)

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

/** A semantic name (e.g. 'text-muted') aliasing a token from `baseColorTokens` or a `customColorTokens` palette (named by its key there), with optional opacity/lightness/chroma overrides (single value, or per light/dark). */
export type SemanticAlias = {
  token: string
  /** `'baseColorTokens'` (default), or a key into `customColorTokens`. */
  tokenMap?: 'baseColorTokens' | (string & {})
  /** Absolute opacity (0-1) applied to all oklch/hex variants. */
  opacity?: number
  /** Multiplier applied to the token's current lightness, NOT an absolute lightness value. */
  lightnessMultiplier?: number | { light: number; dark: number }
  /** Multiplier applied to the token's current chroma, NOT an absolute chroma value. */
  chromaMultiplier?: number | { light: number; dark: number }
}

/** Map of semantic alias name to its `SemanticAlias` definition. */
export type SemanticColorAliases = Record<string, SemanticAlias>

// ============================================================================
// Full Config
// ============================================================================

/** The full trimscale-css configuration shape — see `trimscale.config.ts` for the actual values and field-by-field documentation. */
export type TrimscaleConfig = {
  /**
   * Where `trimscale-css generate` writes this project's generated output
   * (the bridge file plus, if any font sources need `@font-face` rules,
   * `_fonts.scss`), relative to the directory containing this config file.
   * The static parts of the package (functions, mixins, and the rest of
   * `styles/`) are never written here — they stay in `node_modules` as
   * normal package internals. @default './trimscale-generated'
   */
  outDir?: string
  /* Typography */
  appFonts: AppFonts
  fontRoles: FontRoles
  fluidScale: FluidScale
  breakpoints: Breakpoints
  /**
   * Viewport height (px) threshold for the `--vwx` ultrawide switch-over:
   * past this height (combined with a ≥ 21:9 aspect ratio), `--vwx` switches
   * from `1vw` to `2vh` to stop fluid sizes from growing unbounded on very
   * wide monitors. @default 944
   */
  ultrawideHeightThresholdPx?: number
  modularTypographicScale: ModularTypographicScale
  semanticFontSizes: SemanticFontSizes
  fontWeights: FontWeights
  lineHeights: LineHeights
  /** Curve for the self-scaling `--line-height-dynamic` token. Optional, every field falls back to its own default. */
  dynamicLineHeight?: DynamicLineHeight
  /* Spacing */
  spacingSetup: SpacingSetup
  /* Color */
  defaultScheme: DefaultScheme
  // colorUtilityClasses?: ColorUtilityProperty[]
  baseColorTokens: ColorTokensMap
  /** Additional named palettes beyond `baseColorTokens` (e.g. a `campaign` palette), keyed by whatever name you like. Each gets its own `@include mx.generate-color-tokens(...)` alongside the base tokens. */
  customColorTokens?: Record<string, ColorTokensMap>
  semanticColorAliases?: SemanticColorAliases
}
