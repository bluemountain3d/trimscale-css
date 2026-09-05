import type { Breakpoints } from '../models/Config.ts'
import { raw, setScssMapEntries, setScssMapValue, toKebabCase } from './helpers.ts'

/**
 * Builds the `$breakpoints` map VALUE (no `$name:`/`!default`, see
 * {@link setScssMapValue}) from `cfg.breakpoints`, converting each px value
 * to rem (assuming the standard 1rem == 16px root, same as
 * `abstracts/functions`' `px-to-rem`), for use as a `@use 'trimscale-css'
 * with ($breakpoints: ...)` argument in the generated bridge file. Done here
 * in JS rather than via a `fn.px-to-rem(...)` call in the bridge file itself,
 * so the bridge file doesn't need to `@use` a trimscale-css internal beyond
 * its main entry point.
 */
export const breakpointsToScssMapValue = (data: Breakpoints): string => {
  const rawData = Object.fromEntries(
    Object.entries(data)
      .filter((entry): entry is [string, number] => entry[1] !== undefined)
      .map(([key, value]) => [toKebabCase(key), raw(`${value / 16}rem`)]),
  )
  const entries = setScssMapEntries(rawData, 2)
  return setScssMapValue(entries)
}
