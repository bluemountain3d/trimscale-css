import type { Breakpoints } from '../models/Config.ts'
import { raw, setScssMapEntry, setScssMapValue, toKebabCase } from './helpers.ts'

/**
 * Builds the `$breakpoints` map VALUE (no `$name:`/`!default`, see
 * {@link setScssMapValue}) from `cfg.breakpoints`, converting each px value
 * to rem (assuming the standard 1rem == 16px root, same as
 * `abstracts/functions`' `px-to-rem`), for use as a `@use 'trimscale-css'
 * with ($breakpoints: ...)` argument in the generated bridge file. Done here
 * in JS rather than via a `fn.px-to-rem(...)` call in the bridge file itself,
 * so the bridge file doesn't need to `@use` a trimscale-css internal beyond
 * its main entry point.
 *
 * Each line carries the px value it came from as a comment. Breakpoints are
 * the only config values converted to a different unit at generate time
 * (everything else, `fluidScale` included, reaches the bridge as the raw
 * numbers the config author typed and is converted inside the SCSS), so this
 * is the one place where reading the generated file back against the config
 * takes arithmetic. The comment is Sass, not CSS: it never reaches the
 * output.
 */
export const breakpointsToScssMapValue = (data: Breakpoints): string => {
  const entries = Object.entries(data)
    .filter((entry): entry is [string, number] => entry[1] !== undefined)
    .map(([key, px]) => `${setScssMapEntry(toKebabCase(key), raw(`${px / 16}rem`), 2).trimEnd()} // ${px}px\n`)

  return setScssMapValue(entries)
}
