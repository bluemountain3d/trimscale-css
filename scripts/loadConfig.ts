import fs from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import type { TrimscaleConfig } from '../models/Config.ts'

/**
 * Fields that moved to a new location, with the release that moved them. A
 * config that still sets one at its old top-level spot has already been
 * type-checked against an older `TrimscaleConfig`, or was never type-checked
 * at all (a plain `.js` config, or one that casts through `any`): either
 * way, the old field is silently ignored by everything downstream, and the
 * failure shows up much later as a confusing, unrelated error (missing font
 * roles, output written to the wrong place, a palette that generates
 * nothing). Catching it here instead gives a direct fix.
 */
const LEGACY_TOP_LEVEL_FIELDS: Record<string, { to: string; since: string }> = {
  outDir: { to: 'output.dir', since: '1.0.0-beta.5' },
  utilities: { to: 'output.utilities', since: '1.0.0-beta.5' },
  fontRoles: { to: 'appFonts.fontRoles', since: '1.0.0-beta.5' },
  defaultScheme: { to: 'colorSetup.defaultScheme', since: '1.0.0-beta.6' },
  baseColorTokens: { to: 'colorSetup.baseColorTokens', since: '1.0.0-beta.6' },
  customColorTokens: { to: 'colorSetup.customColorTokens', since: '1.0.0-beta.6' },
  semanticColorAliases: { to: 'colorSetup.semanticColorAliases', since: '1.0.0-beta.6' },
}

const assertNoLegacyFields = (cfg: TrimscaleConfig): void => {
  for (const [oldField, { to, since }] of Object.entries(LEGACY_TOP_LEVEL_FIELDS)) {
    if (oldField in cfg) {
      throw new Error(
        `\`${oldField}\` at the top level of trimscale.config.ts has moved to \`${to}\` (as of ${since}). Update your config and re-run \`npx trimscale-css generate\`.`,
      )
    }
  }

  // Renamed in the same release as the three above, and the only one of the
  // four that isn't top-level. Left unchecked it surfaces as
  // `normalizeConfig` reading `Object.keys(undefined)`, which names neither
  // the field nor the release.
  if (cfg.appFonts && 'fonts' in cfg.appFonts) {
    throw new Error(
      '`appFonts.fonts` has been renamed to `appFonts.families` (as of 1.0.0-beta.5). Update your config and re-run `npx trimscale-css generate`.',
    )
  }

  if (cfg.appFonts && 'fallbackDefault' in cfg.appFonts) {
    throw new Error(
      '`appFonts.fallbackDefault` has been renamed to `appFonts.defaultFallback` (as of 1.0.0-beta.5). Update your config and re-run `npx trimscale-css generate`.',
    )
  }

  // The one rename that changes shape rather than just spelling, and the one
  // that fails most quietly: an unread `fallbackFamily` writes no
  // metric-matched @font-face at all, and the family simply falls back to a
  // generic without anything saying so.
  for (const [familyName, fontSource] of Object.entries(cfg.appFonts?.families ?? {})) {
    if ('fallbackFamily' in fontSource) {
      throw new Error(
        `\`fallbackFamily\` on "${familyName}" has moved into \`fallback\` (as of 1.0.0-beta.5): write \`fallback: { matched: ${JSON.stringify((fontSource as { fallbackFamily: unknown }).fallbackFamily)} }\`, and drop that family's generic \`fallback\` if it has one. A metric-matched fallback replaces the generic rather than sitting in front of it. Update your config and re-run \`npx trimscale-css generate\`.`,
      )
    }
  }
}

/** `output.scss`/`output.css` both `false` is a config mistake, not a valid "generate nothing" state — an explicit no-op would silently produce an empty `generate` run with no indication anything is wrong. */
const assertHasOutputTarget = (cfg: TrimscaleConfig): void => {
  if (cfg.output?.scss === false && cfg.output?.css === false) {
    throw new Error(
      '`output.scss` and `output.css` are both `false` in trimscale.config.ts, so there would be nothing to generate. Enable at least one.',
    )
  }
}

/** A `rootFontSize` that isn't a positive number scales every rem value in the output at once, so the result reads as a layout bug rather than as a config one. */
const assertRootFontSize = (cfg: TrimscaleConfig): void => {
  const value = cfg.rootFontSize
  if (value === undefined) return

  if (!Number.isFinite(value) || value <= 0) {
    throw new Error(
      `\`rootFontSize\` in trimscale.config.ts is \`${value}\`. It must be a positive number of pixels, for example 16.`,
    )
  }

  if (value < 8 || value > 32) {
    console.warn(
      `⚠ \`rootFontSize\` is ${value}px, outside the range a browser root realistically has. Every rem value in the output scales against it, so check that this is deliberate.`,
    )
  }
}

/** Whether a `colorSetup` holds any token at all, across the base palette and the custom ones. Aliases are not counted: an alias resolves against a token, so it can't be the only thing a palette consists of. */
const hasAnyColorToken = (colors: NonNullable<TrimscaleConfig['colorSetup']>): boolean =>
  Object.keys(colors.baseColorTokens?.tokens ?? {}).length > 0 ||
  Object.values(colors.customColorTokens ?? {}).some((map) => Object.keys(map.tokens ?? {}).length > 0)

/**
 * `undefined` and an empty axis both mean "not configured", but only one of
 * them short-circuits the readers downstream. Collapsing the second into the
 * first here means nothing past this point has to check both:
 * `computeFontData` and every other `cfg.appFonts` reader for fonts, the two
 * color warnings and the bridge's color arguments for colors.
 */
const normalizeConfig = (cfg: TrimscaleConfig): TrimscaleConfig => {
  let normalized = cfg

  if (normalized.appFonts && Object.keys(normalized.appFonts.families).length === 0) {
    const { appFonts, ...rest } = normalized
    normalized = rest
  }

  if (normalized.colorSetup && !hasAnyColorToken(normalized.colorSetup)) {
    const { colorSetup, ...rest } = normalized
    normalized = rest
  }

  return normalized
}

/**
 * Config file names, in the order they're looked for. `.mts` is an ES module
 * whatever the nearest `package.json` says, which is the way out for a
 * project that declares `"type": "commonjs"`: there Node reads a `.ts` config
 * as CommonJS, and the config's `export default` is a syntax error, with no
 * module detection to fall back on (detection only runs when `type` is
 * absent). `init` writes whichever fits the project; both are accepted here,
 * so renaming an existing config by hand works too.
 */
const CONFIG_FILE_NAMES = ['trimscale.config.ts', 'trimscale.config.mts'] as const

/** Whether the project's own `package.json` declares CommonJS outright. Mirrors the check in `bin/init.ts`, which is what picks the extension in the first place. */
const projectDeclaresCommonJs = (): boolean => {
  try {
    return JSON.parse(fs.readFileSync(path.join(process.cwd(), 'package.json'), 'utf8')).type === 'commonjs'
  } catch {
    return false
  }
}

/**
 * Loads `trimscale.config.ts` from the current working directory (the
 * consumer's own project root when this package is published and run via
 * `npx trimscale-css generate`), not from this package's own install
 * location. Must be a dynamic, cwd-based import: a static relative import
 * (`import cfg from '../trimscale.config.ts'`) resolves against *this
 * file's* location, which once published lives inside the consumer's
 * `node_modules/trimscale-css/scripts/` — that would always load the
 * package's own template config, never the consumer's.
 * @returns The consumer's (or, in dev, this repo's own) config.
 */
export const loadConfig = async (): Promise<TrimscaleConfig> => {
  const configPath = CONFIG_FILE_NAMES.map((name) => path.join(process.cwd(), name)).find((candidate) =>
    fs.existsSync(candidate),
  )

  if (configPath === undefined) {
    throw new Error(
      `Could not find ${CONFIG_FILE_NAMES.join(' or ')} in ${process.cwd()}. Run \`npx trimscale-css init\` to create one, or run this from the directory that has it.`,
    )
  }

  let mod: { default: TrimscaleConfig }
  try {
    mod = await import(pathToFileURL(configPath).href)
  } catch (err) {
    // Node can't load a `.ts` file at all below 22.18.0, where flagless type
    // stripping became the default. `engines` stops that install under pnpm,
    // but npm only warns, so this is reachable, and Node's own
    // ERR_UNKNOWN_FILE_EXTENSION says nothing about Node versions.
    if ((err as NodeJS.ErrnoException).code === 'ERR_UNKNOWN_FILE_EXTENSION') {
      throw new Error(
        `Loading trimscale.config.ts needs Node's built-in TypeScript type stripping, which is only on by default from Node 22.18.0 (23.6.0 on the odd-numbered line). This is Node ${process.version}. Upgrade Node and re-run \`generate\`.`,
        { cause: err },
      )
    }

    // A `.ts` config in a project that declares `"type": "commonjs"` is read
    // as CommonJS, where the config's own `export default` is a syntax error.
    // Node only re-parses as an ES module when `type` is absent, so this one
    // is a dead end for the `.ts` name, and Node's message ("Unexpected token
    // 'export'") points at the config rather than at the setting.
    //
    // Node also emits a process warning of its own for the same failure,
    // advising `.mjs`. It reaches stderr before this message does and can
    // only be silenced by dropping every warning the process makes, so the
    // message answers it instead: `.mts` is the TypeScript spelling of that
    // advice.
    if (err instanceof SyntaxError && configPath.endsWith('.ts') && projectDeclaresCommonJs()) {
      throw new Error(
        `${path.basename(configPath)} can't be loaded in a project whose package.json declares \`"type": "commonjs"\`: Node reads it as CommonJS, and the config's \`export default\` is a syntax error there. Node's own warning about the same failure points at \`.mjs\`; for a TypeScript config that means trimscale.config.mts, an ES module whatever the project's type is. Rename it, or set \`"type": "module"\` if the rest of your project is ESM.`,
        { cause: err },
      )
    }

    // A config that exists but won't load is a different problem from one
    // that isn't there, and pointing at `init` would be wrong advice: it
    // refuses to overwrite an existing config. The reason (a syntax error's
    // own message, usually) rides along as `cause`.
    throw new Error(`Could not load ${configPath}.`, { cause: err })
  }

  const cfg = mod.default
  assertNoLegacyFields(cfg)
  assertHasOutputTarget(cfg)
  assertRootFontSize(cfg)
  return normalizeConfig(cfg)
}

/** Default `output.dir`, relative to the directory containing `trimscale.config.ts`, when the config doesn't set its own. */
export const DEFAULT_OUT_DIR = 'trimscale-generated'

/**
 * Resolves `cfg.output.dir` to an absolute path, relative to `process.cwd()`
 * (the directory containing `trimscale.config.ts`, same base `loadConfig`
 * itself resolves against). This is the ONLY place generated per-consumer
 * output (the bridge file, `_fonts.scss`) gets written — never relative to
 * this package's own install location, so a consumer's `generate` run
 * never writes into `node_modules`.
 */
export const resolveOutDir = (cfg: TrimscaleConfig): string =>
  path.join(process.cwd(), cfg.output?.dir ?? DEFAULT_OUT_DIR)
