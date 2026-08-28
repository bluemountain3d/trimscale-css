import type { FamilyFontMetrics } from './generateFontMetrics.parser.ts'

/** Ordered font metric keys used when generating per-role font-metric SCSS variables (e.g. `$ff-primary`, `$top-trim-primary`). */
export const metricsList: (keyof FamilyFontMetrics)[] = [
  'family',
  'avgCharWidth',
  'topTrim',
  'bottomTrim',
  'lsbAdjust',
  'rsbAdjust',
]

/**
 * Converts a camelCase or alphanumeric identifier to kebab-case.
 * @param text - The string to convert (e.g. `fontSize`, `fs900`).
 * @returns The kebab-cased string (e.g. `font-size`, `fs-900`).
 * @example
 *   toKebabCase('fontSize'); // 'font-size'
 *   toKebabCase('fs900');    // 'fs-900'
 */
export const toKebabCase = (text: string) =>
  text
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2') // 1. Handles camelCase (eg fontSize -> font-Size)
    .replace(/([a-zA-Z])(\d)/g, '$1-$2') // 2. Separates letters and numbers (e.g., fs900 -> fs-900)
    .toLowerCase() // 3. Convert everything to lowercase.

/**
 *
 */
export const toCapitalizedNiceName = (text: string) => {
  const spacedName = text.replace(/([a-z0-9])([A-Z])/g, '$1 $2')
  return spacedName.charAt(0).toUpperCase() + spacedName.slice(1)
}

/**
 * Transforms all keys of an object to kebab-case, keeping their values as-is.
 * @param data - The source object.
 * @returns A new object with the same values under kebab-cased keys.
 * @example
 *   kebabKeys({ fs900: 6, textLg: 1 }); // { 'fs-900': 6, 'text-lg': 1 }
 */
export const kebabKeys = <T extends Record<string, unknown>>(data: T): Record<string, T[keyof T]> =>
  Object.fromEntries(Object.entries(data).map(([key, value]) => [toKebabCase(key), value])) as Record<
    string,
    T[keyof T]
  >

/**
 * Builds a boxed SCSS section-title comment banner.
 * @param text - The section title text. Pass `''` (default) to render nothing.
 * @returns The formatted comment banner, or `''` if `text` is empty.
 */
export const scssSectionTitle = (text: string = ''): string => {
  if (!text) return ''

  return `
// ============================================================================
// ${text}
// ============================================================================`
}

// ============================================================================
// Scss Map and List Helpers
// ============================================================================

/**
 * Wrapper type marking a value as raw SCSS output.
 * Used to bypass automatic string quoting for values that must be
 * emitted unquoted in SCSS (e.g. hex colors, SCSS keywords, function calls).
 */
export type Raw = { __raw: string }

/**
 * Marks a string value as raw SCSS, so it is emitted unquoted instead of
 * being wrapped in double quotes.
 *
 * @param value - The raw SCSS snippet to emit as-is (e.g. `#ccc`, `bold`).
 * @returns A {@link Raw} wrapper recognized by {@link formatScssValue}.
 * @example
 *   raw('#ffffff') // emitted as: #ffffff (not "#ffffff")
 */
export const raw = (value: string): Raw => ({ __raw: value })

/** A single leaf value that can appear in an SCSS map or list. */
export type ScssValue = string | number | boolean | Raw

/**
 * Recursive input shape for an SCSS map. Values may be a leaf ScssValue,
 * another nested map, or `undefined` at any depth, so arbitrary source
 * types (optional properties, `[key: string]: T | undefined` index
 * signatures, Partial<...>, or nested combinations thereof) can be passed
 * in directly without pre-filtering, no matter how deep.
 */
type ScssMapInput = { [key: string]: ScssValue | ScssMapInput | undefined }

/**
 * Type guard checking whether a value is a {@link Raw} wrapper.
 *
 * @param value - The value to check.
 * @returns True if `value` is a Raw-wrapped SCSS snippet.
 */
const isRaw = (value: unknown): value is Raw => typeof value === 'object' && value !== null && '__raw' in value

/**
 * Type guard checking whether a value is a nested {@link ScssMapInput} object,
 * as opposed to a leaf value or a {@link Raw} wrapper.
 *
 * @param value - The value to check.
 * @returns True if `value` should be treated as a nested SCSS map.
 */
const isNestedMap = (value: unknown): value is ScssMapInput =>
  typeof value === 'object' && value !== null && !isRaw(value)

/**
 * Formats a single SCSS map value: strings are quoted, numbers and booleans
 * are stringified as-is, {@link Raw} values are emitted unquoted, and nested
 * maps are recursively formatted with increased indentation.
 *
 * @param value - The value to format (leaf value or nested map).
 * @param indent - Current indentation depth (in 2-space units), used when
 *                 recursing into nested maps.
 * @returns The formatted SCSS value as a string, ready to follow a `key: `.
 */
const formatScssValue = (value: ScssValue | ScssMapInput, indent: number): string => {
  if (isRaw(value)) return value.__raw
  if (isNestedMap(value)) return formatScssMapBody(value, indent + 1)
  if (typeof value === 'string') return `"${value}"`
  return String(value) // number | boolean
}

/**
 * Recursively formats the body of an SCSS map (everything inside the
 * parentheses), including nested maps at any depth, with consistent
 * 2-space indentation per level. Entries with an `undefined` value are
 * skipped at every level, so optional/index-signature source types can be
 * passed in as-is, no matter how deeply nested.
 *
 * @param data - The map data to format.
 * @param indent - Indentation depth (in 2-space units) for this map's entries.
 * @returns The formatted map body, e.g. `(\n  "key": value,\n)`.
 */
const formatScssMapBody = (data: ScssMapInput, indent: number): string => {
  const pad = '  '.repeat(indent)
  const closingPad = '  '.repeat(indent - 1)
  const entries = Object.entries(data)
    .filter((entry): entry is [string, ScssValue | ScssMapInput] => entry[1] !== undefined)
    .map(([key, value]) => `${pad}"${key}": ${formatScssValue(value, indent)},`)
    .join('\n')

  return `(\n${entries}\n${closingPad})`
}

/**
 * Formats a single `"key": value,` line for an SCSS map, quoting string
 * values automatically ({@link formatScssValue}) and indenting to match
 * `nestedLevel`.
 *
 * @param key - The map key (emitted quoted).
 * @param value - The map value. Strings are quoted, numbers/booleans are
 *                emitted as-is, {@link Raw}-wrapped values are emitted unquoted.
 * @param nestedLevel - Indentation depth (in 2-space units) for this entry.
 * @returns A single `  "key": value,\n` line, ready to be joined with sibling entries.
 */
export const setScssMapEntry = (key: string, value: ScssValue, nestedLevel: number = 1): string => {
  const pad = '  '.repeat(nestedLevel)
  return `${pad}"${key}": ${formatScssValue(value, nestedLevel)},\n`
}

/**
 * Builds an array of formatted SCSS map entry lines from a plain data
 * object, filtering out `undefined` values so optional/index-signature
 * config types (e.g. `FontRoles`) can be passed in directly.
 *
 * @param data - The source object; each own-enumerable, non-`undefined`
 *               entry becomes one map line.
 * @param nestedLevel - Indentation depth (in 2-space units) applied to
 *                       every entry.
 * @returns An array of `  "key": value,\n` lines, one per entry.
 */
export const setScssMapEntries = <T extends Record<string, ScssValue | undefined>>(
  data: T,
  nestedLevel: number = 1,
): string[] => {
  return Object.entries(data)
    .filter((entry): entry is [string, ScssValue] => entry[1] !== undefined)
    .map(([key, value]) => setScssMapEntry(key, value, nestedLevel))
}

/**
 * Formats a single list-item line for an SCSS list, quoting string values
 * automatically ({@link formatScssValue}) and indenting to match `nestedLevel`.
 *
 * @param value - The list item. Strings are quoted, numbers/booleans are
 *                emitted as-is, {@link Raw}-wrapped values are emitted unquoted.
 * @param nestedLevel - Indentation depth (in 2-space units) for this item.
 * @returns A single `  value,\n` line, ready to be joined with sibling items.
 */
export const setScssListEntry = (value: ScssValue, nestedLevel: number = 1): string => {
  const pad = '  '.repeat(nestedLevel)
  return `${pad}${formatScssValue(value, nestedLevel)},\n`
}

/**
 * Builds an array of formatted SCSS list-item lines from a plain array,
 * filtering out `undefined` entries.
 *
 * @param data - The source array; each non-`undefined` item becomes one list line.
 * @param nestedLevel - Indentation depth (in 2-space units) applied to every item.
 * @returns An array of `  value,\n` lines, one per item.
 */
export const setScssListEntries = (data: (ScssValue | undefined)[], nestedLevel: number = 1): string[] => {
  return data
    .filter((value): value is ScssValue => value !== undefined)
    .map((value) => setScssListEntry(value, nestedLevel))
}

/**
 * Wraps pre-built entry lines (e.g. from {@link setScssMapEntries}) as a
 * named nested SCSS map: `"name": ( ...entries ),`. Entries are expected to
 * already be indented for `nestedLevel + 1` (their own `nestedLevel` when
 * built); this only pads the wrapping `"name": (` / `)` lines so the
 * closing paren lines up with the opening one.
 *
 * @param name - The nested map's key.
 * @param entries - Pre-formatted entry lines, each ending in `\n`.
 * @param nestedLevel - Indentation depth (in 2-space units) of this map
 *                       within its parent.
 * @returns The wrapped nested map line(s), ready to append to a parent map's entries.
 */
export const setNestedScssMap = (name: string, entries: string[], nestedLevel: number = 1): string => {
  const pad = '  '.repeat(nestedLevel)
  return `${pad}"${name}": (\n${entries.join('')}${pad}),\n`
}

/** Alias of {@link setNestedScssMap} for building a named nested SCSS list instead of a map. */
export const setNestedScssList = setNestedScssMap

/**
 * Builds a complete `$name: ( ...entries ) !default;` SCSS map declaration.
 *
 * @param sassDocs - SassDoc comment block to prepend above the declaration.
 * @param name - The map's SCSS variable name, without the leading `$`.
 * @param entries - Pre-formatted entry lines (e.g. from
 *                      {@link setScssMapEntries}), each ending in `\n`.
 * @returns The complete SCSS map declaration string.
 */
export const setScssMap = (sassDocs: string, name: string, entries: string[]): string => {
  return `${sassDocs}$${name}: (\n${entries.join('')}) !default;`
}

/** Alias of {@link setScssMap} for building a top-level SCSS list instead of a map. */
export const setScssList = setScssMap
