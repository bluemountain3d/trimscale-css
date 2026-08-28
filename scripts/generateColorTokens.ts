import * as fs from 'node:fs'
import path from 'node:path'
import type { ColorDefinition, ColorToken, ColorTokensMap } from '../models/Config.ts'
import { raw, setNestedScssMap, setScssMap, setScssMapEntry, toCapitalizedNiceName, toKebabCase } from './helpers.ts'
import { loadConfig } from './loadConfig.ts'

const cfg = await loadConfig()

// ============================================================================
// Color Tokens
// ============================================================================

/**
 * Builds the `oklch`/`hex` entry lines for one light-or-dark ColorDefinition.
 * @param def - The color definition to format.
 * @param nestedLevel - Indentation depth (in 2-space units) for these entries.
 * @returns The formatted `oklch`/`hex` entry lines.
 */
const colorDefinitionEntries = (def: ColorDefinition, nestedLevel: number): string[] => [
  setScssMapEntry('oklch', raw(def.oklch), nestedLevel),
  setScssMapEntry('hex', raw(def.hex), nestedLevel),
]

/**
 * Builds the `light`/`dark` nested maps (plus optional `opacity`) for one ColorToken.
 * @param token - The color token to format.
 * @param nestedLevel - Indentation depth (in 2-space units) for these entries.
 * @returns The formatted entry lines for this token.
 */
const colorTokenEntries = (token: ColorToken, nestedLevel: number): string[] => {
  const entries = [
    setNestedScssMap('light', colorDefinitionEntries(token.light, nestedLevel + 1), nestedLevel),
    setNestedScssMap('dark', colorDefinitionEntries(token.dark, nestedLevel + 1), nestedLevel),
  ]

  if (token.opacity !== undefined) entries.push(setScssMapEntry('opacity', token.opacity, nestedLevel))

  return entries
}

/**
 * Builds a complete `$name: (prefix, tokens)` SCSS map declaration from a ColorTokensMap.
 * @param name - The map's name (camelCase or kebab-case; converted to kebab-case for the SCSS variable).
 * @param data - The source ColorTokensMap (e.g. `cfg.baseColorTokens`).
 * @returns The complete SCSS map declaration string.
 */
const colorTokensToScssMap = (name: string, data: ColorTokensMap): string => {
  const tokenEntries = Object.entries(data.tokens).map(([tokenName, token]) =>
    setNestedScssMap(toKebabCase(tokenName), colorTokenEntries(token, 3), 2),
  )

  const entries = [setScssMapEntry('prefix', data.prefix, 1), setNestedScssMap('tokens', tokenEntries, 1)]

  return setScssMap('', toKebabCase(name), entries)
}

// Base Color Tokens ==========================================================
/** Builds the `$base-color-tokens` SCSS map from `cfg.baseColorTokens`. */
const baseColorVariablesToScss = (): string => {
  return colorTokensToScssMap('baseColorTokens', cfg.baseColorTokens)
}

// Custom Color Tokens ========================================================
/**
 * Builds an SCSS map for every custom `{name}ColorTokens` entry in the config
 * (any key besides `baseColorTokens` ending in `ColorTokens`).
 * @returns The concatenated map declarations, or `undefined` if none exist.
 */
const customColorVariablesToScss = (): string | undefined => {
  // Get all keys named {string}ColorTokens except "baseColorTokens"
  const customMaps = Object.entries(cfg)
    .filter(([key]) => {
      return key.endsWith('ColorTokens') && key !== 'baseColorTokens'
    })
    .map(([key, value]) => {
      return {
        name: key,
        data: value as ColorTokensMap,
      }
    })

  // If no keys exist return undefined
  if (customMaps.length === 0) return

  // If key(s) named {string}ColorTokens exist loop through each and create a map
  const scssMaps = customMaps.map((m) => {
    // SASSDocs for Map
    const scssDocs = `
/// @group Abstracts/Variables
/// @name ${toCapitalizedNiceName(m.name)}
/// @type Map
  `
    return `${scssDocs}${colorTokensToScssMap(m.name, m.data)}`
  })

  return `${scssMaps.join('')}`
}

// Semantic Aliases ===========================================================
/**
 * Builds the `$semantic-color-aliases` SCSS map from `cfg.semanticColorAliases`.
 * Each entry resolves to a `fn.get-color-token(...)` call against the alias's
 * `tokenMap` (defaulting to `baseColorTokens`), carrying over any
 * opacity/lightness/chroma overrides.
 * @returns The map declaration, or `undefined` if no aliases are configured.
 */
const semanticAliasesVariablesToScss = (): string | undefined => {
  if (!cfg.semanticColorAliases) return

  const formatMultiplier = (v: number | { light: number; dark: number }) =>
    typeof v === 'number' ? `${v}` : `(light: ${v.light}, dark: ${v.dark})`

  const aliasEntries = Object.entries(cfg.semanticColorAliases).map(([key, value]) => {
    const tokensMap = `$${toKebabCase(value.tokenMap ?? 'baseColorTokens')}`

    const args = [
      `"${toKebabCase(value.token)}"`,
      tokensMap,
      value.opacity !== undefined ? `$opacity: ${value.opacity}` : null,
      value.lightness !== undefined ? `$lightness: ${formatMultiplier(value.lightness)}` : null,
      value.chroma !== undefined ? `$chroma: ${formatMultiplier(value.chroma)}` : null,
    ]
      .filter((a) => a !== null)
      .join(', ')

    return setScssMapEntry(toKebabCase(key), raw(`fn.get-color-token(${args})`), 2)
  })

  const entries = [
    setScssMapEntry('prefix', cfg.baseColorTokens.prefix, 1),
    setNestedScssMap('tokens', aliasEntries, 1),
  ]

  return setScssMap('', 'semantic-color-aliases', entries)
}

const customColorTokens = customColorVariablesToScss()
const semanticColorAliases = semanticAliasesVariablesToScss()

const abstractsOutput = `
// Direct partial import (not the functions index) — the index also forwards
// fn_fluid-typography-and-spacing, which @uses this very variables module,
// and going through it here would create a circular dependency.
@use "styles/abstracts/functions/fn_get-color-token" as fn;

/// @group Abstracts/Variables
/// @name Colors
/// @description Generated from trimscale.config.ts — see there for the source palette.
/// ===========================================================================

// ============================================================================
// Configuration
// ============================================================================

/// @group Abstracts/Variables
/// @name Default Scheme
/// @type String
$default-scheme: ${cfg.defaultScheme};

/// @group Abstracts/Variables
/// @name Base Color Tokens
/// @type Map
${baseColorVariablesToScss()}

${customColorTokens ? customColorTokens : ''}

${
  semanticColorAliases
    ? `
/// @group Abstracts/Variables
/// @name Semantic Alias Tokens
/// @type Map
/// @see fn_get-color-token For the function used to build each entry
${semanticColorAliases}
`
    : ''
}
`

const abstractsOutputFile = path.join(import.meta.dirname, '../styles/abstracts/variables/_colors.scss')
fs.writeFileSync(abstractsOutputFile, abstractsOutput)
console.log('- Color Abstracts is written to file')

// ============================================================================
// Color Tokens
// ============================================================================

/**
 * Builds an `@include mx.generate-color-tokens(...)` call per custom
 * `{name}ColorTokens` map, so each gets its own CSS custom properties
 * alongside the base tokens.
 * @returns The concatenated `@include` lines, or `undefined` if no custom maps exist.
 */
const customColorScssMixinDefs = (): string | undefined => {
  // Get all keys named {string}ColorTokens except "baseColorTokens"
  const customMaps = Object.entries(cfg)
    .filter(([key]) => {
      return key.endsWith('ColorTokens') && key !== 'baseColorTokens'
    })
    .map(([key]) => {
      return key
    })

  // If no keys exist return undefined
  if (customMaps.length === 0) return

  const mixinDefs = customMaps.map(
    (m) => `// ${toCapitalizedNiceName(m)}\n  @include mx.generate-color-tokens($tokens: var.$${toKebabCase(m)});\n`,
  )

  return `${mixinDefs.join('')}`
}

const tokensOutput = `
@use "styles/abstracts/variables" as var;
@use "styles/abstracts/mixins" as mx;
@use "styles/abstracts/functions" as fn;

/// @group Tokens
/// @name Colors
/// @description Maps abstract Sass variables to OKLCH CSS Custom Properties
/// using light-dark() for automatic light/dark mode switching.
///
@layer tokens {
  :root,
  .app-theme-container {

    // ==========================================================================
    // Initiate automatic scheme change
    // ==========================================================================

    color-scheme: light dark;

    // ==========================================================================
    // Manual theme overrides
    // Overrides prefers-color-scheme by forcing color-scheme on :root.
    // light-dark() resolves automatically — no token duplication needed.
    // ==========================================================================

    &.theme-light {
      color-scheme: light;
    }

    &.theme-dark {
      color-scheme: dark;
    }
  }

  // ============================================================================
  // CSS CUSTOM PROPERTIES (:root)
  // ============================================================================
  
  // Base Color Tokens
  @include mx.generate-color-tokens();

  ${customColorTokens ? customColorScssMixinDefs() : ''}
  ${
    semanticColorAliases
      ? `// Semantic Color Aliases\n  @include mx.generate-color-tokens($tokens: var.$semantic-color-aliases);`
      : ''
  }
}
`

const tokensOutputFile = path.join(import.meta.dirname, '../styles/tokens/_color-tokens.scss')
fs.writeFileSync(tokensOutputFile, tokensOutput)
console.log('- Color Tokens is written to file')
