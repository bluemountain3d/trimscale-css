import fs from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import type { TrimscaleConfig } from '../models/Config.ts'

/**
 * Fields that moved to a new location for `1.0.0-beta.5`. A config that
 * still sets one at its old top-level spot has already been type-checked
 * against an older `TrimscaleConfig`, or was never type-checked at all (a
 * plain `.js` config, or one that casts through `any`) — either way, the
 * old field is silently ignored by everything downstream, and the failure
 * shows up much later as a confusing, unrelated error (missing font roles,
 * output written to the wrong place). Catching it here instead gives a
 * direct fix.
 */
const LEGACY_TOP_LEVEL_FIELDS: Record<string, string> = {
  outDir: 'output.dir',
  utilities: 'output.utilities',
  fontRoles: 'appFonts.fontRoles',
}

const assertNoLegacyFields = (cfg: TrimscaleConfig): void => {
  for (const [oldField, newPath] of Object.entries(LEGACY_TOP_LEVEL_FIELDS)) {
    if (oldField in cfg) {
      throw new Error(
        `\`${oldField}\` at the top level of trimscale.config.ts has moved to \`${newPath}\` (as of 1.0.0-beta.5). Update your config and re-run \`npx trimscale-css generate\`.`,
      )
    }
  }
}

/** `output.scss`/`output.css` both `false` is a config mistake, not a valid "generate nothing" state — an explicit no-op would silently produce an empty `generate` run with no indication anything is wrong. */
const assertHasOutputTarget = (cfg: TrimscaleConfig): void => {
  if (cfg.output?.scss === false && cfg.output?.css === false) {
    throw new Error(
      '`output.scss` and `output.css` are both `false` in trimscale.config.ts — there would be nothing to generate. Enable at least one.',
    )
  }
}

/**
 * `undefined` and `{ families: {}, ... }` both mean "no fonts configured",
 * but only one of them short-circuits `computeFontData` and every other
 * `cfg.appFonts` reader downstream. Collapsing the second into the first
 * here means nothing past this point has to check both.
 */
const normalizeConfig = (cfg: TrimscaleConfig): TrimscaleConfig => {
  if (cfg.appFonts && Object.keys(cfg.appFonts.families).length === 0) {
    const { appFonts, ...rest } = cfg
    return rest
  }
  return cfg
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
  const configPath = path.join(process.cwd(), 'trimscale.config.ts')

  if (!fs.existsSync(configPath)) {
    throw new Error(
      `Could not find trimscale.config.ts in ${process.cwd()}. Run \`npx trimscale-css init\` to create one, or run this from the directory that has it.`,
    )
  }

  let mod: { default: TrimscaleConfig }
  try {
    mod = await import(pathToFileURL(configPath).href)
  } catch (err) {
    // A config that exists but won't load is a different problem from one
    // that isn't there, and pointing at `init` would be wrong advice: it
    // refuses to overwrite an existing config. The reason (a syntax error's
    // own message, usually) rides along as `cause`.
    throw new Error(`Could not load ${configPath}.`, { cause: err })
  }

  const cfg = mod.default
  assertNoLegacyFields(cfg)
  assertHasOutputTarget(cfg)
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
