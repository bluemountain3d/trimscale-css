import type { FluidRange, SpaceRange, TrimscaleConfig } from '../models/Config.ts'
import { type ScssTree, toKebabCase } from './helpers.ts'

/** A custom property name as the package writes them: lowercase words and digits joined by single hyphens. */
const KEBAB_CASE = /^[a-z][a-z0-9]*(-[a-z0-9]+)*$/

/**
 * Turns a range's config key into the token name it's emitted under, through
 * the same `toKebabCase` as every other config key, so `fs900` is `fs-900`
 * and `h1Gap` is `h1-gap` here too.
 */
const rangeTokenName = (field: string, key: string): string => {
  const name = toKebabCase(key)
  if (!KEBAB_CASE.test(name)) {
    throw new Error(
      `\`${field}.${key}\` can't be used as a token name: it becomes "${name}". Use camelCase or kebab-case, letters and digits only, starting with a letter.`,
    )
  }
  return name
}

/** Builds a range map under converted token names, failing when two keys convert to the same name (`cardGap` and `card-gap`), which would otherwise leave one of them silently overwritten. */
const rangesTree = <T>(field: string, data: Record<string, T>, entry: (range: T) => ScssTree): ScssTree => {
  const tree: Record<string, ScssTree> = {}
  const keyFor: Record<string, string> = {}

  for (const [key, range] of Object.entries(data)) {
    const name = rangeTokenName(field, key)
    if (name in keyFor) {
      throw new Error(`\`${field}.${keyFor[name]}\` and \`${field}.${key}\` both become "${name}". Rename one of them.`)
    }
    keyFor[name] = key
    tree[name] = entry(range)
  }

  return tree
}

/** A numeric step travels as a string in the config (so it can't be mistaken for pixels) and as a number in SCSS, where `fn.fluid-space-range` tells the two kinds of key apart by type. */
const spaceRangeEndpoint = (key: string): string | number => (/^\d+$/.test(key) ? Number(key) : key)

/** Builds the `$space-ranges` map from `spacingSetup.spaceRanges`, with `round` written out so the SCSS default never decides it. */
export const spaceRangesTree = (data: Record<string, SpaceRange> | undefined): ScssTree =>
  rangesTree('spacingSetup.spaceRanges', data ?? {}, (range) => ({
    from: spaceRangeEndpoint(range.from),
    to: spaceRangeEndpoint(range.to),
    round: range.round ?? true,
  }))

/** Builds the `$fluid-ranges` map from `fluidRanges`. */
export const fluidRangesTree = (data: Record<string, FluidRange> | undefined): ScssTree =>
  rangesTree('fluidRanges', data ?? {}, (range) => ({
    from: range.from,
    to: range.to,
    round: range.round ?? false,
  }))

/**
 * Names the package emits on `:root` regardless of the config, and the
 * prefixes of the families it emits. Keep this in step with `styles/tokens/`
 * when a token is added there. Config-derived names (type scale steps,
 * semantic font sizes, color palette prefixes) are added in
 * {@link reservedTokenNames}.
 */
const PACKAGE_TOKEN_NAMES = ['vwx', 'fluid-base', 'unit', 'unit-micro', 'unit-macro', 'header-height']
const PACKAGE_TOKEN_PREFIXES = [
  'space-',
  'font-weight-',
  'line-height-',
  'font-family-',
  'avg-char-width-',
  'next-font-',
]

/** Every exact name and prefix a `fluidRanges` name can collide with under this config, each with what it is, for the warning. */
const reservedTokenNames = (cfg: TrimscaleConfig): { names: Map<string, string>; prefixes: Map<string, string> } => {
  const names = new Map(PACKAGE_TOKEN_NAMES.map((name) => [name, 'a base token']))
  const prefixes = new Map(PACKAGE_TOKEN_PREFIXES.map((prefix) => [prefix, `the --${prefix}* tokens`]))

  for (const key of Object.keys(cfg.modularTypographicScale)) {
    const step = toKebabCase(key)
    names.set(step, 'a modularTypographicScale step')
    names.set(`${step}-uncapped`, 'a modularTypographicScale step')
  }
  for (const key of Object.keys(cfg.semanticFontSizes)) {
    names.set(toKebabCase(key), 'a semanticFontSizes entry')
  }

  const colors = cfg.colorSetup
  if (colors) {
    for (const map of [colors.baseColorTokens, ...Object.values(colors.customColorTokens ?? {})]) {
      prefixes.set(`${map.prefix}-`, `the --${map.prefix}-* color tokens`)
    }
  }

  return { names, prefixes }
}

/**
 * Warns when a `fluidRanges` name is one the package already emits, or falls
 * in one of its token families. `fluidRanges` has no prefix of its own, so
 * nothing else stops `--fluid-base` or `--space-sm` from being redefined.
 * A warning rather than an error: `tokens/_fluid-range-tokens.scss` is
 * forwarded last, so the project's value always wins, and an override can be
 * deliberate. Here rather than in the SCSS because the names to compare
 * against come from the rest of the config.
 */
export const warnAboutRangeCollisions = (cfg: TrimscaleConfig): void => {
  const ranges = cfg.fluidRanges
  if (!ranges) return

  const { names, prefixes } = reservedTokenNames(cfg)

  for (const key of Object.keys(ranges)) {
    const name = rangeTokenName('fluidRanges', key)
    const prefix = [...prefixes.keys()].find((candidate) => name.startsWith(candidate))
    const what = names.get(name) ?? (prefix && prefixes.get(prefix))
    if (!what) continue

    console.warn(
      `⚠ fluidRanges.${key} emits --${name}, which collides with ${what}. Yours is declared last and wins, so rename it unless the override is deliberate.`,
    )
  }
}
