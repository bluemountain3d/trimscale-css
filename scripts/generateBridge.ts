import * as fs from 'node:fs'
import path from 'node:path'
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
import { rewriteFontFacesForCss, writeCssOutput } from './generateCss.ts'
import { computeFontData, type FontFace } from './generateFonts.ts'
import {
  dynamicLineHeightToScssMapValue,
  fontRolesToScssMapValue,
  fontWeightsToScssMapValue,
  lineHeightsToScssMapValue,
  modularTypographicScaleToScssMapValue,
  semanticFontSizesToScssMapValue,
} from './generateTypography.ts'
import { buildResetRequirementsMarkdown } from './generateResetRequirementsDoc.ts'
import { type ResolvedUtilityFlags, resolveUtilityFlags } from './generateUtilities.ts'
import { buildUtilityClassesMarkdown } from './generateUtilityClassesDoc.ts'
import { setScssMapEntries, setScssMapValue, setWithArg } from './helpers.ts'
import { loadConfig, resolveOutDir } from './loadConfig.ts'

/**
 * `typography.trim`/`typography.family` being on is coherent whether or not
 * `appFonts` is configured, SCSS still keeps `font-setup`/the placeholders
 * either way, only the CSS *classes* need font roles to exist. So an
 * explicit `true` with no `appFonts` produces zero classes despite the
 * opt-in, which reads as a bug rather than the correct (empty) result it
 * actually is. `false` needs no warning either way, and `true` with
 * `appFonts` configured is the normal path.
 */
const warnIfFontlessTypographyFlags = (cfg: TrimscaleConfig, flags: ResolvedUtilityFlags): void => {
  if (cfg.appFonts) return

  if (flags.typographyTrim) {
    console.warn(
      '⚠ output.utilities.typography.trim is true but appFonts is not configured, so no .trim-text-* classes will be generated. Leading trim requires font metrics. Either add appFonts or set output.utilities.typography.trim: false to silence this.',
    )
  }
  if (flags.typographyFamily) {
    console.warn(
      '⚠ output.utilities.typography.family is true but appFonts is not configured, so no .font-family-* classes will be generated. Either add appFonts or set output.utilities.typography.family: false to silence this.',
    )
  }
}

/**
 * A consumer of the CSS build has no SCSS escape hatch.
 * `output.utilities.typography.trim` only controls whether `.trim-text-*`
 * classes exist; `font-setup` and the `%{role}-text` placeholders stay
 * reachable from a consumer's own SCSS either way. Someone linking the
 * compiled file has no stylesheet in that pipeline to reach them from, so
 * `trim: false` means leading trim doesn't exist at all, not just that the
 * classes are missing: each role's metrics are declared inside
 * `%{role}-text`, which reaches the file only when `.trim-text-*` extends
 * it, so with the class gone the values are nowhere to be found and nothing
 * can reproduce them by hand.
 *
 * `family` is not the same kind of loss and gets no warning:
 * `--font-family-{role}` is emitted in `@layer tokens` for every role
 * regardless of the flag, so `font-family: var(--font-family-heading)` in
 * the consumer's own CSS does what the class does. `.font-family-*` is a
 * convenience, not the only path.
 *
 * Inform, don't force: tokens/spacing/colors without trim in a CSS build is
 * a legitimate choice.
 *
 * Every warning here is about font roles, so a config without `appFonts`
 * gets none of them: the flags have no effect at all without roles to loop
 * over, and telling someone to set `trim: true` would send them after trim
 * that can't exist without metrics. `warnIfFontlessTypographyFlags` owns
 * that case and points at `appFonts` instead.
 */
const warnAboutCssOutputLimitations = (cfg: TrimscaleConfig, flags: ResolvedUtilityFlags): void => {
  if (!cfg.appFonts) return

  if (!flags.typographyTrim) {
    console.warn(
      '⚠ CSS output with output.utilities.typography.trim: false contains no leading trim at all, @layer trim-defaults and @layer trim are both empty. Set trim: true if you want trim in the CSS build.',
    )
  }

  for (const [familyName, fontSource] of Object.entries(cfg.appFonts.families)) {
    const usesNextFont = fontSource.nextFont ?? cfg.appFonts.nextFontDefault ?? false
    if (usesNextFont) {
      console.warn(
        `⚠ "${familyName}" has nextFont enabled, its family will fall through to the generic fallback in the CSS build, var(--next-font-*) is only ever set by Next.js's own runtime, which a standalone CSS file never goes through.`,
      )
    }
  }
}

const cfg = await loadConfig()
const outDir = resolveOutDir(cfg)
const spacing = cfg.spacingSetup
const baseGridSize = spacing.baseGridSize ?? 4
const utilityFlags = resolveUtilityFlags(cfg.output?.utilities)

warnIfFontlessTypographyFlags(cfg, utilityFlags)

const { metrics, fontFaces, fallbackFontFaces } = await computeFontData(cfg)

// Spacing: two mutually-exclusive shapes (coupled/independent), see
// models/Config.ts's SpacingSetup and abstracts/variables/_spacing.scss.
const spacingArgs =
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

// Built as a function, not a single array, because the CSS build (below)
// needs the same with() args with one difference: font-faces' src values
// rewritten for output.css.fontUrlBase instead of the SCSS build's
// root-relative paths. Everything else is identical between targets.
const buildWithArgs = (fontFacesForTarget: FontFace[]): string =>
  [
    setWithArg('breakpoints', breakpointsToScssMapValue(cfg.breakpoints)),
    setWithArg('ultrawide-height-threshold-px', `${cfg.ultrawideHeightThresholdPx ?? 944}px`),
    setWithArg('fluid-scale', fluidScaleToScssMapValue(cfg.fluidScale)),
    setWithArg('font-metrics', metricsToScssMapValue(metrics)),
    setWithArg('font-faces', fontFacesToScssListValue(fontFacesForTarget)),
    setWithArg('fallback-font-faces', fallbackFontFacesToScssListValue(fallbackFontFaces)),
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
    ...spacingArgs,
    setWithArg('utilities-spacing-base', `${utilityFlags.spacingBase}`),
    setWithArg('utilities-spacing-tshirt', `${utilityFlags.spacingTshirt}`),
    setWithArg('utilities-spacing-numeric', `${utilityFlags.spacingNumeric}`),
    setWithArg('utilities-typography-trim', `${utilityFlags.typographyTrim}`),
    setWithArg('utilities-typography-family', `${utilityFlags.typographyFamily}`),
    setWithArg('utilities-typography-size', `${utilityFlags.typographySize}`),
    setWithArg('utilities-typography-line-height', `${utilityFlags.typographyLineHeight}`),
    setWithArg('utilities-typography-weight', `${utilityFlags.typographyWeight}`),
    setWithArg('utilities-typography-style', `${utilityFlags.typographyStyle}`),
    setWithArg('utilities-typography-text-transform', `${utilityFlags.typographyTextTransform}`),
    setWithArg('utilities-typography-text-align', `${utilityFlags.typographyTextAlign}`),
    setWithArg('utilities-typography-numeric-figures', `${utilityFlags.typographyNumericFigures}`),
    setWithArg('utilities-a11y', `${utilityFlags.a11y}`),
    setWithArg('output-reset', `${cfg.output?.reset ?? true}`),
  ].join('')

const buildBridgeSource = (withArgs: string): string => `@use "trimscale" with (
${withArgs});
`

fs.mkdirSync(outDir, { recursive: true })

if (cfg.output?.scss ?? true) {
  const withArgs = buildWithArgs(fontFaces)

  const output = `// AUTO-GENERATED by \`trimscale-css generate\` — do not edit by hand.
// Configures trimscale-css's static package internals (in node_modules,
// never regenerated) with this project's trimscale.config.ts, passing in
// this project's font metrics and @font-face rules as SCSS values.
// → docs/getting-started.md

${buildBridgeSource(withArgs)}`

  fs.writeFileSync(path.join(outDir, '_index.scss'), output)
  console.log(`- Bridge file is written to ${path.relative(process.cwd(), path.join(outDir, '_index.scss'))}`)
}

fs.writeFileSync(path.join(outDir, 'utility-classes.md'), buildUtilityClassesMarkdown(cfg, utilityFlags))
console.log(
  `- Utility class reference is written to ${path.relative(process.cwd(), path.join(outDir, 'utility-classes.md'))}`,
)

if (cfg.output?.reset === false) {
  fs.writeFileSync(path.join(outDir, 'reset-requirements.md'), buildResetRequirementsMarkdown())
  console.log(
    `- Reset requirements are written to ${path.relative(process.cwd(), path.join(outDir, 'reset-requirements.md'))}`,
  )
}

if (cfg.output?.css) {
  warnAboutCssOutputLimitations(cfg, utilityFlags)

  const cssConfig = typeof cfg.output.css === 'object' ? cfg.output.css : {}
  const fontUrlBase = cssConfig.fontUrlBase ?? '/fonts'
  const minify = cssConfig.minify ?? true

  const cssWithArgs = buildWithArgs(rewriteFontFacesForCss(fontFaces, fontUrlBase))
  await writeCssOutput(outDir, buildBridgeSource(cssWithArgs), minify)
}
