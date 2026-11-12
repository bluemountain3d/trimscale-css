import type { Breakpoints } from '../models/Config.ts'
import { kebabKeys, raw, type ScssTree } from './helpers.ts'

/**
 * Builds the `$breakpoints` map from `cfg.breakpoints`, converting each px value
 * to rem against `rootFontSize`, the same base `abstracts/functions`'
 * `px-to-rem` resolves against, for use as a `@use 'trimscale-css'
 * with ($breakpoints: ...)` argument in the generated bridge file. Done here
 * in JS rather than via a `fn.px-to-rem(...)` call in the bridge file itself,
 * so the bridge file doesn't need to `@use` a trimscale-css internal beyond
 * its main entry point.
 *
 * The quotient is cut to 10 decimals because that is where Sass cuts its own,
 * and a breakpoint reaches CSS both ways: through this map, and through a bare
 * number handed to a breakpoint mixin, which `px-to-rem` converts in Sass. A
 * root size the px values don't divide evenly by would otherwise print the two
 * at different lengths. Whole values stay whole: `20.0000000000` is `20`.
 *
 * Each line carries the px value it came from as a comment. Breakpoints are
 * the only config values converted to a different unit at generate time
 * (everything else, `fluidScale` included, reaches the bridge as the raw
 * numbers the config author typed and is converted inside the SCSS), so this
 * is the one place where reading the generated file back against the config
 * takes arithmetic. The comment is Sass, not CSS: it never reaches the
 * output.
 */
export const breakpointsTree = (data: Breakpoints, rootFontSize: number): ScssTree =>
  kebabKeys(data, (px) =>
    px === undefined ? undefined : raw(`${Number((px / rootFontSize).toFixed(10))}rem`, `${px}px`),
  )
