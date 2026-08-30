import type { Breakpoints } from '../models/Config.ts'
import { raw, setScssMapEntries, setScssMapValue, toKebabCase } from './helpers.ts'

/**
 * Builds the `$breakpoints` map VALUE (no `$name:`/`!default`, see
 * {@link setScssMapValue}) from `cfg.breakpoints`, converting each px value
 * to rem via `fn.px-to-rem`, for use as a `@use 'trimscale-css' with
 * ($breakpoints: ...)` argument in the generated bridge file (which must
 * have `fn` in scope for the `px-to-rem` calls to resolve).
 */
export const breakpointsToScssMapValue = (data: Breakpoints): string => {
  const rawData = Object.fromEntries(
    Object.entries(data).map(([key, value]) => [toKebabCase(key), raw(`fn.px-to-rem(${value})`)]),
  )
  const entries = setScssMapEntries(rawData, 2)
  return setScssMapValue(entries)
}
