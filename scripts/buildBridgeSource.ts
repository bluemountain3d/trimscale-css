import type { TrimscaleConfig } from '../models/Config.ts'
import { breakpointsTree } from './generateBreakpoints.ts'
import { colorTokensMapTree, customColorTokensTree, semanticColorAliasDefsTree } from './generateColorTokens.ts'
import { fluidScaleTree } from './generateFluidScale.ts'
import { fallbackFontFacesTree, fontFacesTree, metricsTree } from './generateFontMetrics.scss.ts'
import type { FallbackFontFace, FontFace, FontMetricsMap } from './generateFonts.ts'
import {
  dynamicLineHeightTree,
  fontRolesTree,
  fontWeightsTree,
  lineHeightsTree,
  modularTypographicScaleTree,
  semanticFontSizesTree,
} from './generateTypography.ts'
import type { ResolvedUtilityFlags } from './generateUtilities.ts'
import { raw, setWithArg, toKebabCase } from './helpers.ts'

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
        setWithArg('spacing-approach', 'coupled'),
        setWithArg('t-shirt-scale', { ...spacing.tShirtScale }),
        setWithArg('numeric-scale-end', spacing.numericScaleEnd),
      ]
    : [
        setWithArg('spacing-approach', 'independent'),
        setWithArg('macro-range-max', baseGridSize * (spacing.macroRangeMultiplier ?? 2)),
        setWithArg('t-shirt-scale-micro', { ...spacing.tShirtScaleMicro }),
        setWithArg('t-shirt-scale-macro', { ...spacing.tShirtScaleMacro }),
        setWithArg('numeric-scale-micro-end', spacing.numericScaleMicroEnd),
        setWithArg('numeric-scale-macro-end', spacing.numericScaleMacroEnd),
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
    setWithArg('breakpoints', breakpointsTree(cfg.breakpoints)),
    setWithArg('ultrawide-height-threshold-px', raw(`${cfg.ultrawideHeightThresholdPx ?? 944}px`)),
    setWithArg('fluid-scale', fluidScaleTree(cfg.fluidScale)),
    setWithArg('font-metrics', metricsTree(fontData.metrics)),
    setWithArg('font-faces', fontFacesTree(fontData.fontFaces)),
    setWithArg('fallback-font-faces', fallbackFontFacesTree(fontData.fallbackFontFaces)),
    setWithArg('font-roles', fontRolesTree(cfg.appFonts?.fontRoles ?? {})),
    setWithArg('modular-typographic-scale', modularTypographicScaleTree(cfg.modularTypographicScale)),
    setWithArg('semantic-font-sizes', semanticFontSizesTree(cfg.semanticFontSizes)),
    setWithArg('font-weights', fontWeightsTree(cfg.fontWeights)),
    setWithArg('line-heights', lineHeightsTree(cfg.lineHeights)),
    setWithArg('dynamic-line-height', dynamicLineHeightTree(cfg.dynamicLineHeight)),
    // Unquoted: `_color-tokens.scss` compares this against the bare idents
    // `light`/`dark`, and a quoted "light" is not equal to either in Sass.
    setWithArg('default-scheme', raw(cfg.defaultScheme)),
    setWithArg('base-color-tokens', colorTokensMapTree(cfg.baseColorTokens)),
    setWithArg('custom-color-tokens', customColorTokensTree(cfg.customColorTokens)),
    setWithArg('semantic-color-alias-defs', semanticColorAliasDefsTree(cfg.semanticColorAliases)),
    setWithArg('base-grid-size', baseGridSize),
    ...buildSpacingArgs(spacing, baseGridSize),
    // Every flag's SCSS variable is `utilities-` plus the kebab-cased flag
    // name, so the list is derived rather than repeated. `a11y` is the one
    // exception: `toKebabCase` would split the digits off as `a-11y`.
    ...Object.entries(flags).map(([flag, enabled]) =>
      setWithArg(flag === 'a11y' ? 'utilities-a11y' : `utilities-${toKebabCase(flag)}`, enabled),
    ),
    setWithArg('output-reset', cfg.output?.reset ?? true),
  ].join('')

  return `@use "trimscale" with (
${withArgs});
`
}
