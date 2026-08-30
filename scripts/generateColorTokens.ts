import type { ColorDefinition, ColorToken, ColorTokensMap, SemanticColorAliases } from '../models/Config.ts'
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
