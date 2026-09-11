/**
 * Converts a camelCase, alphanumeric, or space-separated identifier to kebab-case.
 * @param text - The string to convert (e.g. `fontSize`, `fs900`, `Roboto Serif`).
 * @returns The kebab-cased string (e.g. `font-size`, `fs-900`, `roboto-serif`).
 * @example
 *   toKebabCase('fontSize');     // 'font-size'
 *   toKebabCase('fs900');        // 'fs-900'
 *   toKebabCase('Roboto Serif'); // 'roboto-serif'
 */
export const toKebabCase = (text: string) =>
  text
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2') // 1. Handles camelCase (eg fontSize -> font-Size)
    .replace(/([a-zA-Z])(\d)/g, '$1-$2') // 2. Separates letters and numbers (e.g., fs900 -> fs-900)
    .replace(/\s+/g, '-') // 3. Collapses whitespace into a single hyphen (e.g., "Roboto Serif" -> "Roboto-Serif")
    .toLowerCase() // 4. Convert everything to lowercase.

/**
 * Rebuilds an object under kebab-cased keys, passing each value through
 * `mapValue`. The generators use this to turn a config object (camelCase
 * keys, config-shaped values) into the {@link ScssTree} shape in one step.
 * @param data - The source object.
 * @param mapValue - Receives each value and its ORIGINAL key, so a single
 *   field can be special-cased by name (e.g. emitting `family` as {@link raw}).
 * @example
 *   kebabKeys({ fs900: 6, textLg: 1 }, (v) => v); // { 'fs-900': 6, 'text-lg': 1 }
 */
export const kebabKeys = <T, R>(data: Record<string, T>, mapValue: (value: T, key: string) => R): Record<string, R> =>
  Object.fromEntries(Object.entries(data).map(([key, value]) => [toKebabCase(key), mapValue(value, key)]))

// ============================================================================
// Scss Map and List Helpers
// ============================================================================

/**
 * Wrapper type marking a value as raw SCSS output.
 * Used to bypass automatic string quoting for values that must be
 * emitted unquoted in SCSS (e.g. hex colors, SCSS keywords, function calls).
 */
export type Raw = { __raw: string; __comment?: string | undefined }

/**
 * Marks a string value as raw SCSS, so it is emitted unquoted instead of
 * being wrapped in double quotes.
 *
 * @param value - The raw SCSS snippet to emit as-is (e.g. `#ccc`, `bold`).
 * @param comment - Optional Sass line comment, appended after the entry's
 *   trailing comma. Only `$breakpoints` uses it, to carry the px value each
 *   rem was converted from; it never reaches the compiled CSS.
 * @returns A {@link Raw} wrapper recognized by {@link formatTree}.
 * @example
 *   raw('#ffffff')          // emitted as: #ffffff (not "#ffffff")
 *   raw('20rem', '320px')   // emitted as: 20rem, // 320px
 */
export const raw = (value: string, comment?: string): Raw => ({ __raw: value, __comment: comment })

/** A single leaf value that can appear in an SCSS map or list. */
export type ScssValue = string | number | boolean | Raw

/**
 * Anything the generators can hand to {@link setWithArg}: a leaf value, a
 * list (array), or a map (object), nested to any depth. `undefined` values
 * are dropped at every level, so optional config fields, `Partial<...>` and
 * `[key: string]: T | undefined` index signatures can be passed in as-is
 * without pre-filtering.
 *
 * Nothing that builds one of these knows its own depth: indentation is
 * derived while formatting, so a map can be moved or nested one level
 * deeper without touching the code that produces it.
 */
export type ScssTree = ScssValue | ScssTree[] | { [key: string]: ScssTree | undefined }

/** Type guard checking whether a value is a {@link Raw} wrapper. */
const isRaw = (value: unknown): value is Raw => typeof value === 'object' && value !== null && '__raw' in value

const INDENT = '  '

/**
 * Formats one entry of a map or list: the value, its trailing comma, and the
 * line comment when the value is a {@link Raw} carrying one. `prefix` is the
 * `"key": ` part for a map entry, and empty for a list item.
 */
const formatEntry = (pad: string, prefix: string, value: ScssTree, level: number): string =>
  `${pad}${prefix}${formatTree(value, level)},${isRaw(value) && value.__comment ? ` // ${value.__comment}` : ''}`

/**
 * Formats a {@link ScssTree} into SCSS source. Strings are quoted, numbers
 * and booleans are stringified as-is, {@link Raw} values are emitted
 * unquoted, and maps/lists are recursed into with two more spaces of
 * indentation per level.
 *
 * @param value - The tree to format.
 * @param level - Indentation depth (in 2-space units) of the line this
 *   value's opening `(` sits on. Entries land one level deeper, and the
 *   closing `)` lines up with the opening one.
 * @returns The formatted value, ready to follow a `"key": ` or a `$name: `.
 */
const formatTree = (value: ScssTree, level: number): string => {
  if (isRaw(value)) return value.__raw
  if (typeof value === 'string') return `"${value}"`
  if (value === null || typeof value !== 'object') return String(value) // number | boolean

  const pad = INDENT.repeat(level + 1)
  const closingPad = INDENT.repeat(level)

  const lines = Array.isArray(value)
    ? value.map((item) => formatEntry(pad, '', item, level + 1))
    : Object.entries(value)
        .filter((entry): entry is [string, ScssTree] => entry[1] !== undefined)
        .map(([key, entryValue]) => formatEntry(pad, `"${key}": `, entryValue, level + 1))

  // An empty map still has to render as `()`, not as a stray blank line.
  return lines.length === 0 ? `(\n${closingPad})` : `(\n${lines.join('\n')}\n${closingPad})`
}

/**
 * Builds one `  $name: <value>,\n` line for the bridge file's
 * `@use "trimscale" with (...)` argument list. This is the only place that
 * knows what indentation the arguments sit at; every generator hands over a
 * plain {@link ScssTree} and stays out of it.
 *
 * @param name - The configured variable's name, without the leading `$`.
 * @param value - The value tree. A bare string is QUOTED, so a value Sass
 *   has to see unquoted (`$default-scheme: light`) needs {@link raw}.
 */
export const setWithArg = (name: string, value: ScssTree): string => `  $${name}: ${formatTree(value, 1)},\n`
