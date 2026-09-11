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

  // Renamed in the same release as the three above, and the only one of the
  // four that isn't top-level. Left unchecked it surfaces as
  // `normalizeConfig` reading `Object.keys(undefined)`, which names neither
  // the field nor the release.
  if (cfg.appFonts && 'fonts' in cfg.appFonts) {
    throw new Error(
      '`appFonts.fonts` has been renamed to `appFonts.families` (as of 1.0.0-beta.5). Update your config and re-run `npx trimscale-css generate`.',
    )
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
