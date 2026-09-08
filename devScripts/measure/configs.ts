import type { TrimscaleConfig } from '../../models/Config.ts'
import templateConfig from '../../templates/trimscale.config.ts'
import repoConfig from '../../trimscale.config.ts'

/**
 * Configs to measure. Both anchors are real, checked-in files rather than
 * invented examples: `templates/trimscale.config.ts` is exactly what
 * `trimscale-css init` copies into a new project, and the repo's own config
 * is the everything-on end of the range. Neither can drift from what a
 * consumer actually gets.
 *
 * Every other variant is that repo config with one dimension changed, so a
 * reader can attribute a difference to the thing that changed.
 */
export type Variant = {
  name: string
  /** What distinguishes this config, for the table's second column. */
  note: string
  config: TrimscaleConfig
}

/** Everything off that can be turned off, as the starting point for a config that then turns one group back on. */
const NO_UTILITIES = {
  spacing: false,
  typography: false,
  a11y: false,
} as const

/** `resolveUtilityFlags` defaults every unlisted sub-flag to `true`, so a "only trim" config has to name the rest. */
const ONLY_TRIM = {
  spacing: false,
  typography: {
    trim: true,
    family: false,
    size: false,
    lineHeight: false,
    weight: false,
    style: false,
    textTransform: false,
    textAlign: false,
    numericFigures: false,
  },
  a11y: false,
} as const

const { appFonts: _appFonts, ...repoConfigWithoutFonts } = repoConfig

export const variants: Variant[] = [
  {
    name: 'init default',
    note: 'templates/trimscale.config.ts, untouched',
    config: templateConfig,
  },
  {
    name: 'full',
    note: 'every group on, 3 families, 11 roles, numeric spacing to 48',
    config: repoConfig,
  },
  {
    name: 'trim only',
    note: 'fonts and .trim-text-*, no other utility group',
    config: { ...repoConfig, output: { ...repoConfig.output, utilities: ONLY_TRIM } },
  },
  {
    name: 'floor',
    note: 'no appFonts, no utility classes: tokens, reset and base only',
    config: { ...repoConfigWithoutFonts, output: { ...repoConfig.output, utilities: NO_UTILITIES } },
  },
]

/**
 * Per-unit costs, each measured as the difference between the full config
 * and the same config with `units` fewer of one thing. These are what let a
 * reader price their own config instead of picking whichever example row
 * looks closest.
 */
export type Axis = {
  /** What one unit is, e.g. one numeric spacing step. */
  name: string
  /** How many units separate this config from the full one. */
  units: number
  config: TrimscaleConfig
}

/** Halves the numeric macro scale. Guarded rather than cast: `SpacingSetup` is a union and only the `'independent'` branch has this field. */
const withNumericMacroEnd = (end: number): TrimscaleConfig => {
  const spacing = repoConfig.spacingSetup
  if (spacing.approach !== 'independent') return repoConfig
  return { ...repoConfig, spacingSetup: { ...spacing, numericScaleMacroEnd: end } }
}

const withTwoRoles = (): TrimscaleConfig => {
  if (!repoConfig.appFonts) return repoConfig
  return {
    ...repoConfig,
    appFonts: { ...repoConfig.appFonts, fontRoles: { primary: 'Roboto', body: 'Roboto' } },
  }
}

/**
 * Thins the campaign palette to its first token rather than dropping the
 * palette outright: a palette carries fixed overhead of its own, and folding
 * that into the delta would price a token well above what the next one
 * actually costs.
 */
const withFewerCustomColors = (keep: number): TrimscaleConfig => {
  const campaign = repoConfig.customColorTokens?.campaign
  if (!campaign) return repoConfig
  return {
    ...repoConfig,
    customColorTokens: {
      ...repoConfig.customColorTokens,
      campaign: { ...campaign, tokens: Object.fromEntries(Object.entries(campaign.tokens).slice(0, keep)) },
    },
  }
}

/** Keeps one file per family (the repo config gives each of its three an upright and an italic), so the delta is what an `@font-face` rule costs. */
const withOneFilePerFamily = (): TrimscaleConfig => {
  if (!repoConfig.appFonts) return repoConfig
  const families = Object.entries(repoConfig.appFonts.families).map(([name, source]) => [
    name,
    source.source === 'local' && source.path ? { ...source, path: source.path.slice(0, 1) } : source,
  ])
  return {
    ...repoConfig,
    appFonts: { ...repoConfig.appFonts, families: Object.fromEntries(families) },
  }
}

export const axes: Axis[] = [
  { name: 'one numeric spacing step (14 classes)', units: 24, config: withNumericMacroEnd(24) },
  { name: 'one font role (.trim-text-*, .font-family-*, tokens)', units: 9, config: withTwoRoles() },
  { name: 'one color token (light + dark, oklch + hex)', units: 2, config: withFewerCustomColors(1) },
  { name: 'one @font-face rule (one file, one weight or style)', units: 3, config: withOneFilePerFamily() },
]
