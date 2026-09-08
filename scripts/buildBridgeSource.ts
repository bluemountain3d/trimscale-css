import type { TrimscaleConfig } from '../models/Config.ts'
import { breakpointsToScssMapValue } from './generateBreakpoints.ts'
import {
  colorTokensMapToScssMapValue,
  customColorTokensToScssMapValue,
  semanticColorAliasDefsToScssMapValue,
} from './generateColorTokens.ts'
import { fluidScaleToScssMapValue } from './generateFluidScale.ts'
import {
  fallbackFontFacesToScssListValue,
  fontFacesToScssListValue,
  metricsToScssMapValue,
} from './generateFontMetrics.scss.ts'
import type { FallbackFontFace, FontFace, FontMetricsMap } from './generateFonts.ts'
import {
  dynamicLineHeightToScssMapValue,
  fontRolesToScssMapValue,
  fontWeightsToScssMapValue,
  lineHeightsToScssMapValue,
  modularTypographicScaleToScssMapValue,
  semanticFontSizesToScssMapValue,
} from './generateTypography.ts'
import type { ResolvedUtilityFlags } from './generateUtilities.ts'
import { setScssMapEntries, setScssMapValue, setWithArg } from './helpers.ts'

/** Everything `computeFontData` extracts from a config's fonts, the shape this module needs from it. */
export type FontData = {
  metrics: FontMetricsMap
  fontFaces: FontFace[]
  fallbackFontFaces: FallbackFontFace[]
}

/** Spacing has two mutually-exclusive shapes, see `models/Config.ts`'s `SpacingSetup` and `abstracts/variables/_spacing.scss`. */
const buildSpacingArgs = (spacing: TrimscaleConfig['spacingSetup'], baseGridSize: number): string[] =>
  spacing.approach === 'coupled'
    ? [
        setWithArg('spacing-approach', '"coupled"'),
        setWithArg('t-shirt-scale', setScssMapValue(setScssMapEntries(spacing.tShirtScale, 2))),
        setWithArg('numeric-scale-end', `${spacing.numericScaleEnd}`),
      ]
    : [
        setWithArg('spacing-approach', '"independent"'),
        setWithArg('macro-range-max', `${baseGridSize * (spacing.macroRangeMultiplier ?? 2)}`),
        setWithArg('t-shirt-scale-micro', setScssMapValue(setScssMapEntries(spacing.tShirtScaleMicro, 2))),
        setWithArg('t-shirt-scale-macro', setScssMapValue(setScssMapEntries(spacing.tShirtScaleMacro, 2))),
        setWithArg('numeric-scale-micro-end', `${spacing.numericScaleMicroEnd}`),
        setWithArg('numeric-scale-macro-end', `${spacing.numericScaleMacroEnd}`),
      ]

/**
 * Builds the `@use "trimscale" with (...)` block that configures the
 * package's static SCSS with one project's values. Both output targets go
 * through here: the SCSS bridge file gets it verbatim, and the CSS build
 * gets it with `fontData.fontFaces` rewritten for `output.css.fontUrlBase`
 * (see `rewriteFontFacesForCss`). Everything else is identical between the
 * two, so they can't drift.
 *
 * Pure, and separate from `generateBridge.ts`'s entrypoint, so the same
 * source can be built for a config that never came from
 * `trimscale.config.ts` — `devScripts/measureOutput.ts` builds several in
 * one process.
 *
 * @param cfg - The project's config, already normalized by `loadConfig`.
 * @param flags - Resolved utility-class flags, from `resolveUtilityFlags`.
 * @param fontData - Metrics and font faces, from `computeFontData`.
 * @returns The complete `@use ... with (...);` statement, newline-terminated.
 */
export const buildBridgeSource = (cfg: TrimscaleConfig, flags: ResolvedUtilityFlags, fontData: FontData): string => {
  const spacing = cfg.spacingSetup
  const baseGridSize = spacing.baseGridSize ?? 4

  const withArgs = [
    setWithArg('breakpoints', breakpointsToScssMapValue(cfg.breakpoints)),
    setWithArg('ultrawide-height-threshold-px', `${cfg.ultrawideHeightThresholdPx ?? 944}px`),
    setWithArg('fluid-scale', fluidScaleToScssMapValue(cfg.fluidScale)),
    setWithArg('font-metrics', metricsToScssMapValue(fontData.metrics)),
    setWithArg('font-faces', fontFacesToScssListValue(fontData.fontFaces)),
    setWithArg('fallback-font-faces', fallbackFontFacesToScssListValue(fontData.fallbackFontFaces)),
    setWithArg('font-roles', fontRolesToScssMapValue(cfg.appFonts?.fontRoles ?? {})),
    setWithArg('modular-typographic-scale', modularTypographicScaleToScssMapValue(cfg.modularTypographicScale)),
    setWithArg('semantic-font-sizes', semanticFontSizesToScssMapValue(cfg.semanticFontSizes)),
    setWithArg('font-weights', fontWeightsToScssMapValue(cfg.fontWeights)),
    setWithArg('line-heights', lineHeightsToScssMapValue(cfg.lineHeights)),
    setWithArg('dynamic-line-height', dynamicLineHeightToScssMapValue(cfg.dynamicLineHeight)),
    setWithArg('default-scheme', cfg.defaultScheme),
    setWithArg('base-color-tokens', colorTokensMapToScssMapValue(cfg.baseColorTokens)),
    setWithArg('custom-color-tokens', customColorTokensToScssMapValue(cfg.customColorTokens)),
    setWithArg('semantic-color-alias-defs', semanticColorAliasDefsToScssMapValue(cfg.semanticColorAliases)),
    setWithArg('base-grid-size', `${baseGridSize}`),
    ...buildSpacingArgs(spacing, baseGridSize),
    setWithArg('utilities-spacing-base', `${flags.spacingBase}`),
    setWithArg('utilities-spacing-tshirt', `${flags.spacingTshirt}`),
    setWithArg('utilities-spacing-numeric', `${flags.spacingNumeric}`),
    setWithArg('utilities-typography-trim', `${flags.typographyTrim}`),
    setWithArg('utilities-typography-family', `${flags.typographyFamily}`),
    setWithArg('utilities-typography-size', `${flags.typographySize}`),
    setWithArg('utilities-typography-line-height', `${flags.typographyLineHeight}`),
    setWithArg('utilities-typography-weight', `${flags.typographyWeight}`),
    setWithArg('utilities-typography-style', `${flags.typographyStyle}`),
    setWithArg('utilities-typography-text-transform', `${flags.typographyTextTransform}`),
    setWithArg('utilities-typography-text-align', `${flags.typographyTextAlign}`),
    setWithArg('utilities-typography-numeric-figures', `${flags.typographyNumericFigures}`),
    setWithArg('utilities-a11y', `${flags.a11y}`),
    setWithArg('output-reset', `${cfg.output?.reset ?? true}`),
  ].join('')

  return `@use "trimscale" with (
${withArgs});
`
}
