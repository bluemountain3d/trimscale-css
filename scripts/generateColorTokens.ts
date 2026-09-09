import type {
  ColorDefinition,
  ColorToken,
  ColorTokensMap,
  SemanticColorAliases,
  TrimscaleConfig,
} from '../models/Config.ts'
import { raw, setNestedScssMap, setScssMapEntry, setScssMapValue, toKebabCase } from './helpers.ts'

/**
 * Builds each color config map's VALUE (no `$name:`/`!default`, see
 * {@link setScssMapValue}), for use as `@use 'trimscale-css' with
 * ($base-color-tokens: ..., $custom-color-tokens: ..., ...)` arguments in
 * the generated bridge file.
 */

/**
 * Builds the `light`/`dark` nested maps (plus optional `opacity`) for one ColorToken.
 * @param token - The color token to format.
 * @param nestedLevel - Indentation depth (in 2-space units) for these entries.
 * @returns The formatted entry lines for this token.
 */
const colorTokenEntries = (token: ColorToken, nestedLevel: number): string[] => {
  const colorDefinitionEntries = (def: ColorDefinition, level: number): string[] => [
    setScssMapEntry('oklch', raw(def.oklch), level),
    setScssMapEntry('hex', raw(def.hex), level),
  ]

  const entries = [
    setNestedScssMap('light', colorDefinitionEntries(token.light, nestedLevel + 1), nestedLevel),
    setNestedScssMap('dark', colorDefinitionEntries(token.dark, nestedLevel + 1), nestedLevel),
  ]

  if (token.opacity !== undefined) entries.push(setScssMapEntry('opacity', token.opacity, nestedLevel))

  return entries
}

const MODES = ['light', 'dark'] as const
type Mode = (typeof MODES)[number]
type SemanticAliasMultiplier = number | { light: number; dark: number } | undefined

/** A multiplier is either one number for both modes or a `(light:, dark:)` pair; `undefined` means "leave the channel alone". */
const multiplierFor = (multiplier: SemanticAliasMultiplier, mode: Mode): number =>
  multiplier === undefined ? 1 : typeof multiplier === 'number' ? multiplier : multiplier[mode]

/**
 * Reads the lightness out of a token's `oklch()` string, as a 0-1 number.
 * The config carries these as raw CSS (`oklch(45.6% 0.14 273deg)`), and CSS
 * allows the channel either as a percentage or as a plain 0-1 number.
 * @returns The lightness, or `null` for anything this can't read, which the
 *   caller treats as "nothing to check" rather than as an error.
 */
const parseOklchLightness = (oklch: string): number | null => {
  const match = /oklch\(\s*(\d*\.?\d+)(%?)/i.exec(oklch)
  if (!match) return null

  const value = Number(match[1])
  return Number.isNaN(value) ? null : match[2] === '%' ? value / 100 : value
}

/**
 * Warns when a `semanticColorAliases` multiplier pushes a channel outside
 * what OKLCH can hold: lightness is defined 0-100%, chroma can't be negative.
 * `get-color-token` clamps both, so the output stays valid CSS either way,
 * but a clamped lightness is silently white or black and a clamped chroma is
 * silently gray, neither of which resembles the config that caused it.
 *
 * This belongs here rather than in the SCSS because only `generate` can name
 * the offending field. By the time Sass sees it, it's a map of values, not
 * `semanticColorAliases.textMuted.lightnessMultiplier`.
 */
export const warnAboutClampedAliases = (cfg: TrimscaleConfig): void => {
  for (const [aliasName, alias] of Object.entries(cfg.semanticColorAliases ?? {})) {
    const tokens =
      !alias.tokenMap || alias.tokenMap === 'baseColorTokens'
        ? cfg.baseColorTokens.tokens
        : cfg.customColorTokens?.[alias.tokenMap]?.tokens
    const token = tokens?.[alias.token]

    if (!token) continue

    // One warning per alias per channel, listing whichever modes overshot.
    // A single multiplier applies to both modes, so warning per mode says the
    // same thing twice for the common case.
    const negativeChroma = MODES.filter((mode) => multiplierFor(alias.chromaMultiplier, mode) < 0)
    if (negativeChroma.length > 0) {
      console.warn(
        `⚠ semanticColorAliases.${aliasName}.chromaMultiplier is negative for ${negativeChroma.join(' and ')}, which clamps to 0 and leaves the color gray.`,
      )
    }

    const overshoots = MODES.flatMap((mode) => {
      const lightness = parseOklchLightness(token[mode].oklch)
      if (lightness === null) return []

      const scaled = lightness * multiplierFor(alias.lightnessMultiplier, mode)
      if (scaled >= 0 && scaled <= 1) return []

      const percent = (value: number) => `${(value * 100).toFixed(1)}%`
      return [`${mode} ${percent(lightness)} to ${percent(scaled)} (clamps to ${scaled > 1 ? 'white' : 'black'})`]
    })

    if (overshoots.length > 0) {
      console.warn(
        `⚠ semanticColorAliases.${aliasName}.lightnessMultiplier takes "${alias.token}" outside OKLCH's 0-100% lightness: ${overshoots.join(', ')}. Lower the multiplier, or start from a different token.`,
      )
    }
  }
}

/** Builds a `(prefix:, tokens:)` map VALUE from a single `ColorTokensMap`. */
export const colorTokensMapToScssMapValue = (data: ColorTokensMap): string => {
  const tokenEntries = Object.entries(data.tokens).map(([tokenName, token]) =>
    setNestedScssMap(toKebabCase(tokenName), colorTokenEntries(token, 4), 3),
  )
  const entries = [setScssMapEntry('prefix', data.prefix, 2), setNestedScssMap('tokens', tokenEntries, 2)]
  return setScssMapValue(entries)
}

/** Builds the `$custom-color-tokens` map-of-maps VALUE from `cfg.customColorTokens`. */
export const customColorTokensToScssMapValue = (data: Record<string, ColorTokensMap> | undefined): string => {
  if (!data) return '()'
  const entries = Object.entries(data).map(([name, tokens]) => {
    const innerEntries = [
      setScssMapEntry('prefix', tokens.prefix, 3),
      setNestedScssMap(
        'tokens',
        Object.entries(tokens.tokens).map(([tokenName, token]) =>
          setNestedScssMap(toKebabCase(tokenName), colorTokenEntries(token, 5), 4),
        ),
        3,
      ),
    ]
    return setNestedScssMap(toKebabCase(name), innerEntries, 2)
  })
  return setScssMapValue(entries)
}

/**
 * Builds the `$semantic-color-alias-defs` map VALUE from `cfg.semanticColorAliases` —
 * plain data (token/token-map/opacity/lightness-multiplier/chroma-multiplier), no function calls
 * embedded. `tokens/_color-tokens.scss` (static) resolves each entry
 * against `var.$base-color-tokens`/`var.$custom-color-tokens` at its own
 * Sass compile time via `fn.get-color-token(...)`, so this stays plain
 * `with()`-configurable data instead of needing to reference the very
 * values it would otherwise be configured alongside (a `!default` map's
 * default expression can reference another `!default` var declared earlier
 * in the same static file, but a generated `with()` argument in the bridge
 * file can't reference another `with()` argument from the same call).
 * @param aliases - `cfg.semanticColorAliases`.
 * @returns The bare map literal string.
 */
export const semanticColorAliasDefsToScssMapValue = (aliases: SemanticColorAliases | undefined): string => {
  if (!aliases) return '()'

  const formatMultiplier = (v: number | { light: number; dark: number }) =>
    typeof v === 'number' ? `${v}` : `(light: ${v.light}, dark: ${v.dark})`

  const entries = Object.entries(aliases).map(([key, value]) => {
    const defEntries = [
      setScssMapEntry('token', toKebabCase(value.token), 3),
      value.tokenMap && value.tokenMap !== 'baseColorTokens'
        ? setScssMapEntry('token-map', toKebabCase(value.tokenMap), 3)
        : '',
      value.opacity !== undefined ? setScssMapEntry('opacity', value.opacity, 3) : '',
      value.lightnessMultiplier !== undefined
        ? setScssMapEntry('lightness-multiplier', raw(formatMultiplier(value.lightnessMultiplier)), 3)
        : '',
      value.chromaMultiplier !== undefined
        ? setScssMapEntry('chroma-multiplier', raw(formatMultiplier(value.chromaMultiplier)), 3)
        : '',
    ].filter(Boolean)

    return setNestedScssMap(toKebabCase(key), defEntries, 2)
  })

  return setScssMapValue(entries)
}
