import * as fs from 'node:fs'
import path from 'node:path'
import type { TrimscaleConfig } from '../models/Config.ts'
import { buildBridgeSource } from './buildBridgeSource.ts'
import { rewriteFontFacesForCss, writeCssOutput } from './generateCss.ts'
import { warnAboutClampedAliases } from './generateColorTokens.ts'
import { computeFontData } from './generateFonts.ts'
import { buildResetRequirementsMarkdown } from './generateResetRequirementsDoc.ts'
import { type ResolvedUtilityFlags, resolveUtilityFlags } from './generateUtilities.ts'
import { buildUtilityClassesMarkdown } from './generateUtilityClassesDoc.ts'
import { loadConfig, resolveOutDir } from './loadConfig.ts'

/**
 * `typography.trim`/`typography.family` being on is coherent whether or not
 * `appFonts` is configured, SCSS still keeps `font-setup`/the placeholders
 * either way, only the CSS *classes* need font roles to exist. So an
 * explicit `true` with no `appFonts` produces zero classes despite the
 * opt-in, which reads as a bug rather than the correct (empty) result it
 * actually is. `false` needs no warning either way, and `true` with
 * `appFonts` configured is the normal path.
 */
const warnIfFontlessTypographyFlags = (cfg: TrimscaleConfig, flags: ResolvedUtilityFlags): void => {
  if (cfg.appFonts) return

  if (flags.typographyTrim) {
    console.warn(
      '⚠ output.utilities.typography.trim is true but appFonts is not configured, so no .trim-text-* classes will be generated. Leading trim requires font metrics. Either add appFonts or set output.utilities.typography.trim: false to silence this.',
    )
  }
  if (flags.typographyFamily) {
    console.warn(
      '⚠ output.utilities.typography.family is true but appFonts is not configured, so no .font-family-* classes will be generated. Either add appFonts or set output.utilities.typography.family: false to silence this.',
    )
  }
}

/**
 * A consumer of the CSS build has no SCSS escape hatch.
 * `output.utilities.typography.trim` only controls whether `.trim-text-*`
 * classes exist; `font-setup` and the `%{role}-text` placeholders stay
 * reachable from a consumer's own SCSS either way. Someone linking the
 * compiled file has no stylesheet in that pipeline to reach them from, so
 * `trim: false` means leading trim doesn't exist at all, not just that the
 * classes are missing: each role's metrics are declared inside
 * `%{role}-text`, which reaches the file only when `.trim-text-*` extends
 * it, so with the class gone the values are nowhere to be found and nothing
 * can reproduce them by hand.
 *
 * `family` is not the same kind of loss and gets no warning:
 * `--font-family-{role}` is emitted in `@layer tokens` for every role
 * regardless of the flag, so `font-family: var(--font-family-heading)` in
 * the consumer's own CSS does what the class does. `.font-family-*` is a
 * convenience, not the only path.
 *
 * Inform, don't force: tokens/spacing/colors without trim in a CSS build is
 * a legitimate choice.
 *
 * Every warning here is about font roles, so a config without `appFonts`
 * gets none of them: the flags have no effect at all without roles to loop
 * over, and telling someone to set `trim: true` would send them after trim
 * that can't exist without metrics. `warnIfFontlessTypographyFlags` owns
 * that case and points at `appFonts` instead.
 */
const warnAboutCssOutputLimitations = (cfg: TrimscaleConfig, flags: ResolvedUtilityFlags): void => {
  if (!cfg.appFonts) return

  if (!flags.typographyTrim) {
    console.warn(
      '⚠ CSS output with output.utilities.typography.trim: false contains no leading trim at all, @layer trim-defaults and @layer trim are both empty. Set trim: true if you want trim in the CSS build.',
    )
  }

  for (const [familyName, fontSource] of Object.entries(cfg.appFonts.families)) {
    const usesNextFont = fontSource.nextFont ?? cfg.appFonts.nextFontDefault ?? false
    if (usesNextFont) {
      console.warn(
        `⚠ "${familyName}" has nextFont enabled, its family will fall through to the generic fallback in the CSS build, var(--next-font-*) is only ever set by Next.js's own runtime, which a standalone CSS file never goes through.`,
      )
    }
  }
}

/**
 * Names Sass would accept for the module `trimscale`, resolved relative to
 * the importing file's own directory. `.css` is in here because Sass
 * resolves plain CSS files too.
 */
const SHADOWING_FILES = [
  'trimscale.scss',
  'trimscale.sass',
  'trimscale.css',
  '_trimscale.scss',
  '_trimscale.sass',
  '_trimscale.css',
  path.join('trimscale', '_index.scss'),
  path.join('trimscale', '_index.sass'),
]

/**
 * The bridge file's `@use "trimscale"` is a bare specifier, and Sass tries
 * the importing file's own directory before `loadPaths`. So a file in
 * `output.dir` that Sass would resolve for that name shadows the package's
 * `styles/trimscale.scss` for the bridge sitting next to it. The bridge then
 * configures a module with no variables in it and fails on the first
 * `with()` argument, reported as `This variable was not declared with
 * !default in the @used module` against `$breakpoints`, which says nothing
 * about the actual cause.
 *
 * This package's own CSS output is named `trimscale.bundle.css` precisely to
 * stay out of that way (see `generateCss.ts`), so what's left to catch is a
 * file the consumer put there themselves.
 */
const warnAboutShadowingFiles = (outDir: string): void => {
  for (const name of SHADOWING_FILES.filter((file) => fs.existsSync(path.join(outDir, file)))) {
    console.warn(
      `⚠ ${path.relative(process.cwd(), path.join(outDir, name))} shadows this package for the bridge file next to it. Sass resolves \`@use "trimscale"\` against the bridge's own directory first, so your SCSS build will fail with "This variable was not declared with !default in the @used module" on $breakpoints. Rename or move that file.`,
    )
  }
}

const cfg = await loadConfig()
const outDir = resolveOutDir(cfg)
const utilityFlags = resolveUtilityFlags(cfg.output?.utilities)

warnIfFontlessTypographyFlags(cfg, utilityFlags)
warnAboutClampedAliases(cfg)

const fontData = await computeFontData(cfg)

fs.mkdirSync(outDir, { recursive: true })

if (cfg.output?.scss ?? true) {
  const output = `// AUTO-GENERATED by \`trimscale-css generate\` — do not edit by hand.
// Configures trimscale-css's static package internals (in node_modules,
// never regenerated) with this project's trimscale.config.ts, passing in
// this project's font metrics and @font-face rules as SCSS values.
// → docs/getting-started.md

${buildBridgeSource(cfg, utilityFlags, fontData)}`

  fs.writeFileSync(path.join(outDir, '_index.scss'), output)
  console.log(`- Bridge file is written to ${path.relative(process.cwd(), path.join(outDir, '_index.scss'))}`)

  warnAboutShadowingFiles(outDir)
}

fs.writeFileSync(path.join(outDir, 'utility-classes.md'), buildUtilityClassesMarkdown(cfg, utilityFlags))
console.log(
  `- Utility class reference is written to ${path.relative(process.cwd(), path.join(outDir, 'utility-classes.md'))}`,
)

if (cfg.output?.reset === false) {
  fs.writeFileSync(path.join(outDir, 'reset-requirements.md'), buildResetRequirementsMarkdown())
  console.log(
    `- Reset requirements are written to ${path.relative(process.cwd(), path.join(outDir, 'reset-requirements.md'))}`,
  )
}

if (cfg.output?.css) {
  warnAboutCssOutputLimitations(cfg, utilityFlags)

  const cssConfig = typeof cfg.output.css === 'object' ? cfg.output.css : {}
  const fontUrlBase = cssConfig.fontUrlBase ?? '/fonts'
  const minify = cssConfig.minify ?? true

  const cssSource = buildBridgeSource(cfg, utilityFlags, {
    ...fontData,
    fontFaces: rewriteFontFacesForCss(fontData.fontFaces, fontUrlBase),
  })
  await writeCssOutput(outDir, cssSource, minify)
}
