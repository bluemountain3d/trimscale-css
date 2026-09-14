import type {
  ColorDefinition,
  ColorToken,
  ColorTokensMap,
  SemanticColorAliases,
  TrimscaleConfig,
} from '../models/Config.ts'
import { type ScssTree, kebabKeys, raw, toKebabCase } from './helpers.ts'

/**
 * Builds each color config map, for use as `@use 'trimscale-css' with
 * ($base-color-tokens: ..., $custom-color-tokens: ..., ...)` arguments in
 * the generated bridge file.
 */

/** Both channels are raw CSS the config author wrote (`oklch(...)`, `#f5f6f8`), so neither is quoted. */
const colorDefinitionTree = (def: ColorDefinition): ScssTree => ({ oklch: raw(def.oklch), hex: raw(def.hex) })

/** The `light`/`dark` maps (plus optional `opacity`) for one ColorToken. An absent `opacity` is dropped while formatting, so it needs no branch here. */
const colorTokenTree = (token: ColorToken): ScssTree => ({
  light: colorDefinitionTree(token.light),
  dark: colorDefinitionTree(token.dark),
  opacity: token.opacity,
})

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

/**
 * The colors the fallback tier can hold: the legacy sRGB syntaxes every
 * engine has parsed for years, plus the bare identifiers (named colors,
 * `transparent`, `currentColor`). `hwb()` counts, it's sRGB and landed just
 * before `oklch()` everywhere, so excluding it would buy no real coverage.
 */
const LEGACY_SRGB_COLOR = /^(#([0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})|(rgba?|hsla?|hwb)\(.*\)|[a-z]+)$/i

/**
 * Warns when a `hex` value is something a browser without `oklch()` support
 * can't parse. Serving those browsers is the entire reason that tier exists,
 * and a base token's value reaches it exactly as written (only a
 * `semanticColorAliases` entry with a multiplier derives its own, gamut-mapped
 * in `get-color-token`). A `color()`, `lab()` or `oklch()` there compiles
 * cleanly and fails only where nobody looks: every browser new enough to run
 * a dev server matches one of the `oklch()` tiers below and never reads this
 * one.
 *
 * Here rather than in the SCSS for the same reason as
 * {@link warnAboutClampedAliases}: by the time Sass sees the value, the field
 * it came from is gone.
 */
export const warnAboutFallbackColors = (cfg: TrimscaleConfig): void => {
  const maps: [string, ColorTokensMap][] = [
    ['baseColorTokens', cfg.baseColorTokens],
    ...Object.entries(cfg.customColorTokens ?? {}).map(
      ([name, map]) => [`customColorTokens.${name}`, map] as [string, ColorTokensMap],
    ),
  ]

  const offenders = maps.flatMap(([mapPath, map]) =>
    Object.entries(map.tokens).flatMap(([tokenName, token]) =>
      MODES.filter((mode) => !LEGACY_SRGB_COLOR.test(token[mode].hex.trim())).map(
        (mode) => `${mapPath}.tokens.${tokenName}.${mode}.hex ("${token[mode].hex}")`,
      ),
    ),
  )

  if (offenders.length === 0) return

  console.warn(
    `⚠ The static fallback tier only ever reaches browsers without oklch() support, and these values are ones those browsers can't parse: ${offenders.join(', ')}. Use a hex, rgb(), hsl(), or a named color, gamut-mapped into sRGB if the oklch() value sits outside it.`,
  )
}

/** Builds a `(prefix:, tokens:)` map from a single `ColorTokensMap`. */
export const colorTokensMapTree = (data: ColorTokensMap): ScssTree => ({
  prefix: data.prefix,
  tokens: kebabKeys(data.tokens, colorTokenTree),
})

/** Builds the `$custom-color-tokens` map-of-maps from `cfg.customColorTokens`. Nests {@link colorTokensMapTree} one level deeper rather than repeating it, which is what the depth-carrying version had to do. */
export const customColorTokensTree = (data: Record<string, ColorTokensMap> | undefined): ScssTree =>
  kebabKeys(data ?? {}, colorTokensMapTree)

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
 */
export const semanticColorAliasDefsTree = (aliases: SemanticColorAliases | undefined): ScssTree => {
  // A one-line Sass map with UNQUOTED keys, unlike every other map here, so it
  // goes out raw rather than through the formatter.
  const multiplier = (value: number | { light: number; dark: number } | undefined) => {
    if (value === undefined) return undefined
    return raw(typeof value === 'number' ? `${value}` : `(light: ${value.light}, dark: ${value.dark})`)
  }

  return kebabKeys(aliases ?? {}, (alias) => ({
    token: toKebabCase(alias.token),
    // `baseColorTokens` is the default map, and naming it explicitly is the
    // same as omitting it, so it is left out.
    'token-map': alias.tokenMap && alias.tokenMap !== 'baseColorTokens' ? toKebabCase(alias.tokenMap) : undefined,
    opacity: alias.opacity,
    'lightness-multiplier': multiplier(alias.lightnessMultiplier),
    'chroma-multiplier': multiplier(alias.chromaMultiplier),
  }))
}
