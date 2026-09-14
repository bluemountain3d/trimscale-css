import path from 'node:path'
import type {
  AppFonts,
  FontFallback,
  FontFallbacks,
  FontSource,
  MatchableFallbackChain,
  MatchableFallbackFamily,
  RawFontMetrics,
  TrimscaleConfig,
} from '../models/Config.ts'
import { correctedEmMetrics } from './fontMetrics.helpers.ts'
import {
  fetchRemoteFont,
  getFontExtension,
  listLocalFontDir,
  readLocalFont,
  resolveFamilyDirName,
} from './fontMetrics.io.ts'
import { parseFontBuffer } from './fontMetrics.parser.ts'
import { toKebabCase } from './helpers.ts'

/**
 * `unitsPerEm`/`avgCharWidth` (raw font units) for each `MatchableFallbackFamily`,
 * hardcoded since these system fonts don't change. Only these two fields are
 * needed, `computeFallbackFontFaces`'s size-adjust/ascent-override formula
 * uses the WEB font's own ascender/descender/lineGap (scaled by size-adjust),
 * not the fallback's, see notes/trimscale-css-forbattringar.md.
 */
const FALLBACK_FONT_METRICS: Record<MatchableFallbackFamily, { upm: number; avgCharWidth: number }> = {
  Arial: { upm: 2048, avgCharWidth: 935 },
  'Courier New': { upm: 2048, avgCharWidth: 1283 },
  Georgia: { upm: 2048, avgCharWidth: 931 },
  'Noto Serif': { upm: 1000, avgCharWidth: 495 },
  Helvetica: { upm: 1000, avgCharWidth: 457 },
  'Helvetica Neue': { upm: 1000, avgCharWidth: 463 },
  Consolas: { upm: 2048, avgCharWidth: 1176 },
  Menlo: { upm: 2048, avgCharWidth: 1287 },
  Roboto: { upm: 2048, avgCharWidth: 939 },
  'Segoe UI': { upm: 2048, avgCharWidth: 938 },
  'Times New Roman': { upm: 2048, avgCharWidth: 848 },
}

/**
 * Named cross-platform fallback chains, resolved by `resolveFallbackFamilies`
 * when a `{ matched }` fallback is one of these keywords instead of an
 * explicit `MatchableFallbackFamily`/array. `computeFallbackFontFaces` emits
 * one `@font-face` per family in the chain, all sharing the same
 * `font-family` name: the browser tries each in order and uses the first
 * one actually installed (same technique as a `src: local(...), url(...)`
 * fallback list, just across separate `@font-face` rules).
 */
const FALLBACK_CHAINS: Record<MatchableFallbackChain, MatchableFallbackFamily[]> = {
  'sans-serif': ['Segoe UI', 'Arial', 'Helvetica', 'Helvetica Neue', 'Roboto'],
  serif: ['Times New Roman', 'Georgia', 'Noto Serif'],
  monospace: ['Consolas', 'Menlo', 'Courier New'],
}

/**
 * Builds a `local` font file's `@font-face` `src: url(...)` value: a
 * root-relative path (leading `/`), with the leading `publicDir` segment
 * stripped when the file lives under it, matching how a bundler serves
 * that folder's contents at the site root, without the folder name itself
 * in the URL (Vite's `public/`, SvelteKit's `static/`, etc.). A file
 * outside `publicDir` still gets a root-relative path (works in dev, not
 * guaranteed after a production build, see `AppFonts.publicDir`).
 */
const buildLocalFontSrc = (entry: string, publicDir: string): string => {
  const normalizedEntry = entry
    .replace(/^\.[\\/]/, '')
    .split(path.sep)
    .join('/')
  const normalizedPublicDir = publicDir
    .replace(/^\.[\\/]/, '')
    .replace(/[\\/]+$/, '')
    .split(path.sep)
    .join('/')

  const withoutPublicDir = normalizedEntry.startsWith(`${normalizedPublicDir}/`)
    ? normalizedEntry.slice(normalizedPublicDir.length + 1)
    : normalizedEntry

  return `/${withoutPublicDir}`
}

/** Resolves a `{ matched }` fallback value (single family, explicit array, or named chain) to a flat `MatchableFallbackFamily[]`. */
const resolveFallbackFamilies = (
  value: MatchableFallbackFamily | MatchableFallbackFamily[] | MatchableFallbackChain,
): MatchableFallbackFamily[] => {
  if (Array.isArray(value)) return value
  return value in FALLBACK_CHAINS
    ? FALLBACK_CHAINS[value as MatchableFallbackChain]
    : [value as MatchableFallbackFamily]
}

/** The `{ matched }` half of a `FontFallback`, or `undefined` when it's a plain generic keyword. Narrows on the object form, so a family that asks for metric matching is the only one that reaches `computeFallbackFontFaces`. */
const matchedFallbackOf = (
  fallback: FontFallback | undefined,
): MatchableFallbackChain | MatchableFallbackFamily | MatchableFallbackFamily[] | undefined =>
  typeof fallback === 'object' ? fallback.matched : undefined

/** A single metric-matched `@font-face` override to emit, so a fallback system font takes on the web font's vertical/horizontal metrics during font-swap (reduces CLS). */
export type FallbackFontFace = {
  /** `font-family` value for the override (`"${familyName} Fallback"`), which follows the web font in the `font-family` stack and, per `buildFamilyString`, replaces the generic keyword rather than preceding it */
  family: string
  /** The `MatchableFallbackFamily` to load via `src: local(...)` */
  fallbackFamily: MatchableFallbackFamily
  /** Percentage value, e.g. `107.06` for `size-adjust: 107.06%` */
  sizeAdjust: number
  ascentOverride: number
  descentOverride: number
  lineGapOverride: number
}

/**
 * Computes one metric-matched `@font-face` override's four descriptors for a
 * single fallback family. `size-adjust` is the only descriptor that reads
 * the fallback's own metrics (`avgCharWidth`, for the width ratio):
 * `ascent-override`/`descent-override`/`line-gap-override` reuse the WEB
 * font's own metrics divided by size-adjust, so the fallback's glyphs occupy
 * the same vertical box the web font would have. Same approach as fontaine
 * and next/font's `adjustFontFallback`. Formula:
 * notes/trimscale-css-forbattringar.md.
 *
 * Ascent and descent come from the CORRECTED metrics, the same ones the web
 * font's own face declares (see `buildFontFace`), not the raw ones. The point
 * of this face is that swapping to it changes nothing but the glyphs, and two
 * faces declaring different heights for the same family would shift the layout
 * at exactly the moment the swap happens.
 */
const computeOneFallbackFontFace = (
  familyName: string,
  web: { avgCharWidth: number; lineGap: number },
  corrected: { ascender: number; descender: number },
  fallbackFamily: MatchableFallbackFamily,
): FallbackFontFace => {
  const fb = FALLBACK_FONT_METRICS[fallbackFamily]
  const fallbackAvgCharWidth = fb.avgCharWidth / fb.upm

  const sizeAdjust = web.avgCharWidth / fallbackAvgCharWidth
  const ascentOverride = corrected.ascender / sizeAdjust
  const descentOverride = corrected.descender / sizeAdjust
  const lineGapOverride = web.lineGap / sizeAdjust

  return {
    family: `${familyName} Fallback`,
    fallbackFamily,
    sizeAdjust: +(sizeAdjust * 100).toFixed(2),
    ascentOverride: +(ascentOverride * 100).toFixed(2),
    descentOverride: +(descentOverride * 100).toFixed(2),
    lineGapOverride: +(lineGapOverride * 100).toFixed(2),
  }
}

/**
 * Computes one metric-matched `@font-face` override per family in a
 * `{ matched }` fallback (a single family, an explicit array, or a named
 * `MatchableFallbackChain`, see `resolveFallbackFamilies`). All returned
 * entries share the same `family` name, so multiple `@font-face` rules with
 * identical `font-family` end up in the output: the browser tries each in
 * declaration order and uses the first one whose `src` actually resolves,
 * covering multiple platforms without averaging their metrics together.
 * @returns `[]` (with a console warning) if `webMetrics` is missing `ascender`/`descender`/`lineGap` (only guaranteed present for extracted `local`/`cdn` fonts, optional for `manual`).
 */
export const computeFallbackFontFaces = (
  familyName: string,
  webMetrics: RawFontMetrics,
  matched: MatchableFallbackFamily | MatchableFallbackFamily[] | MatchableFallbackChain,
): FallbackFontFace[] => {
  // Destructured so the guard below narrows all three to `number` for the rest
  // of the function. Testing `webMetrics.lineGap` in place would not: that
  // narrows the property access, while the object keeps its optional type.
  const { ascender, descender, lineGap } = webMetrics

  if (ascender === undefined || descender === undefined || lineGap === undefined) {
    console.warn(
      `⚠ "${familyName}": \`fallback: { matched }\` is set but this family's metrics are missing \`ascender\`/\`descender\`/\`lineGap\` (only extracted automatically for \`local\`/\`cdn\` sources, a \`manual\` entry must supply them explicitly). Skipping its fallback @font-face, and falling back to the generic \`defaultFallback\` instead.`,
    )
    return []
  }

  const corrected = correctedEmMetrics(ascender, descender)
  const web = { avgCharWidth: webMetrics.avgCharWidth, lineGap }

  return resolveFallbackFamilies(matched).map((family) =>
    computeOneFallbackFontFace(familyName, web, corrected, family),
  )
}

/**
 * A single `@font-face` rule to emit (as one `$font-faces` list entry via
 * `fontFacesTree`). Written for `local` sources (unless that
 * family resolves to `nextFont: true`) and for `cdn` sources with
 * `generateFontFace: true`; never for `manual`.
 */
export type FontFace = {
  /** Font family name (`font-family` value) — always the family's config key, never a name read from the file */
  family: string
  /** `src: url(...)` value: a root-relative path (leading `/`, relative to `process.cwd()`) for `local`, the CDN URL as-is for `cdn` */
  src: string
  /** File extension, used as the `format(...)` hint (e.g. `woff2`) */
  ext: string
  /** A single weight for static fonts, or a `{min, max}` range for variable fonts (`font-weight: min max;`) */
  weight: number | { min: number; max: number }
  style: 'normal' | 'italic'
  /**
   * Percentage value for `ascent-override`, e.g. `73.5` for `73.5%`. Together
   * with `descentOverride` this pins the content area to exactly 1em, which is
   * what the leading-trim fallback's `(1lh - 1em)` assumes. Without them the
   * browser is free to measure the font by whichever of its three metric pairs
   * its platform prefers, and the trim lands off by `capTopError`.
   */
  ascentOverride: number
  /** Percentage value for `descent-override`. See `ascentOverride`. */
  descentOverride: number
}

/** One `path`/`url` entry's extracted metrics plus what's needed to build its `@font-face`, kept until the family's best-metrics candidate is picked. */
type ParsedEntry = {
  src: string
  ext: string
  isItalic: boolean
  weightClass: number
  weightRange: { min: number; max: number } | null
  raw: RawFontMetrics
  corrected: { ascender: number; descender: number }
  trimError: number
}

/** A `local` or `cdn` family: the two whose files trimscale reads itself, as opposed to `manual`, whose metrics arrive already measured. */
type FileBackedFontSource = Extract<FontSource, { source: 'local' | 'cdn' }>

/** One family's full metrics entry: the raw extracted/manual metrics plus its resolved SCSS-ready `family` string. */
export type FamilyFontMetrics = RawFontMetrics & { family: string }

/** Map of resolved font family name to its extracted metrics */
export type FontMetricsMap = Record<string, FamilyFontMetrics>

/** Explicit `path` wins outright; otherwise looks under `localFontsPath/`, in the folder named after the family as it's spelled on disk (see `resolveFamilyDirName`). */
const resolveLocalFontPaths = async (
  appFonts: AppFonts,
  familyName: string,
  fontSource: Extract<FontSource, { source: 'local' }>,
): Promise<string[]> => {
  if (fontSource.path) return fontSource.path

  if (!appFonts.localFontsPath) {
    throw new Error(
      `Font family "${familyName}" has no \`path\` and \`appFonts.localFontsPath\` is not set. Set one or the other.`,
    )
  }

  const fontsRoot = path.join(process.cwd(), appFonts.localFontsPath)
  const dirName = await resolveFamilyDirName(fontsRoot, familyName)

  if (dirName === null) {
    throw new Error(
      `No folder for "${familyName}" in ${path.relative(process.cwd(), fontsRoot)}. Create ${path.relative(process.cwd(), path.join(fontsRoot, familyName))} and put the family's files there, or set \`path\` explicitly.`,
    )
  }

  if (dirName !== familyName) {
    console.warn(
      `⚠ Font family "${familyName}" is in a folder named "${dirName}". The @font-face src follows the folder, since the other spelling would 404 on a case-sensitive host even though it resolves here. Rename one of the two to match.`,
    )
  }

  const dir = path.join(fontsRoot, dirName)
  const found = await listLocalFontDir(dir)

  if (found.length === 0) {
    throw new Error(
      `No font files found for "${familyName}" in ${path.relative(process.cwd(), dir)}. Add files there, or set \`path\` explicitly.`,
    )
  }

  return found
}

/**
 * Warns that a family's config key is used as-is for `font-family` even
 * though trimscale writes no `@font-face` for it (`manual`, or `cdn` without
 * `generateFontFace`), so nothing here confirms it matches whatever
 * `font-family` the font is actually loaded under elsewhere.
 *
 * A `manual` family gets a second clause, about its leading trim. A `cdn`
 * one doesn't need it: its file is readable, so `warnIfTrimUncorrectable`
 * reports that family's actual error in em. `manual` has no file to measure
 * and no way to acquire one: config fields carrying `usWin`/`hhea` would
 * describe whichever file the consumer measured, not the one the CDN serves,
 * and those differ in practice (see devDocs/font-vertical-metrics.md). So the
 * most that can honestly be said is where to look if the symptom appears.
 */
const warnIfFamilyNameUnverifiable = (familyName: string, source: 'manual' | 'cdn'): void => {
  const trimNote =
    source === 'manual'
      ? ' Its leading trim is unverified for the same reason: no @font-face means no `ascent-override` pinning the content area to 1em. If trimmed text sits low in one browser but not another, see docs/adding-a-font.md#when-trimmed-text-sits-low-in-one-browser-but-not-another'
      : ''

  console.warn(
    `⚠ "${familyName}": no @font-face written (source: ${source}). Confirm "${familyName}" matches the font-family actually loaded elsewhere, or metrics apply to nothing.${trimNote}`,
  )
}

/**
 * Trim error small enough to stay quiet about, in em. Most fonts land at
 * zero and a few land above 0.05, with almost nothing in between, so this
 * number only has to sit somewhere in the empty middle — it isn't a tuning
 * knob and isn't worth making configurable.
 */
const MIN_REPORTED_TRIM_ERROR = 0.01

/**
 * Warns that a family's leading trim will be visibly off because its
 * `@font-face` belongs to someone else, so the metric overrides that would
 * pin its content area to 1em can't be written (see `FontFace.ascentOverride`).
 * Silent below `MIN_REPORTED_TRIM_ERROR`, which covers most fonts.
 *
 * The message carries the two values and the one edit that applies them,
 * rather than the reasoning: a `generate` run is the wrong place to explain
 * OS/2 metric selection, and docs/adding-a-font.md is the right one.
 */
const warnIfTrimUncorrectable = (
  familyName: string,
  best: ParsedEntry,
  usesNextFont: boolean,
  source: 'local' | 'cdn',
): void => {
  if (best.trimError < MIN_REPORTED_TRIM_ERROR) return

  const owner = usesNextFont ? 'next/font' : 'whatever loads it'
  const fix = usesNextFont
    ? source === 'local'
      ? "Pass them through next/font/local's `declarations` option."
      : "next/font/google has no way to set them. Load the family with `source: 'local'` instead if the trim matters more than the CDN."
    : 'Set `generateFontFace: true` and trimscale writes the rule, overrides included.'

  console.warn(
    `⚠ "${familyName}" needs \`ascent-override: ${(best.corrected.ascender * 100).toFixed(1)}%\` and \`descent-override: ${(best.corrected.descender * 100).toFixed(1)}%\` for its leading trim to land right, and its @font-face is written by ${owner}, so trimscale can't add them. Without them the trim sits ${best.trimError.toFixed(3)}em off (${(best.trimError * 16).toFixed(1)}px at 16px) in browsers with no native text-box-trim. ${fix} Why: docs/adding-a-font.md#font-metric-overrides`,
  )
}

/**
 * Builds the exact `next/font` CSS custom property name a family's `family`
 * value expects (e.g. `--next-font-inter`), so it can both be embedded in
 * that value and printed at generate time for the consumer to cross-check
 * against their own `layout.tsx` by eye. `generate` only reads
 * `trimscale.config.ts`, it never parses `layout.tsx` or any other
 * consumer file, so nothing here can validate the match automatically, a
 * mismatch surfaces at runtime rather than at generate time, and for a
 * `next/font/google` family it doesn't surface at all: the family name that
 * `buildFamilyString` puts inside the `var()` matches the `@font-face` Next
 * writes for it, so the font renders correctly off the fallback. Printing the
 * name is therefore the only check there is.
 */
const buildNextFontVariableName = (appFonts: AppFonts, familyName: string): string => {
  const nextPrefix = appFonts.nextFontPrefix ?? 'next-font'
  return `--${nextPrefix}-${toKebabCase(familyName)}`
}

/**
 * Builds the SCSS-ready `font-family` value: `next/font`'s CSS variable, or a
 * quoted family name, followed by exactly one fallback.
 *
 * The metric-matched `"${familyName} Fallback"` and a generic keyword are
 * alternatives, never both. A generic needs no loading, so it is available
 * the instant the real font isn't, and a generic standing behind the
 * metric-matched name wins the swap window every time: the override renders
 * in the one moment it exists for, which is to say never. `next/font` emits
 * its own fallbacks the same way, with no generic behind them. What covers
 * the platforms instead is the chain, one `@font-face` per system font under
 * a single name, see `FALLBACK_CHAINS`.
 *
 * `fallbackFaceGenerated` is what decides, not the config: a `{ matched }`
 * whose faces were skipped (a `manual` family missing `ascender`, see
 * `computeFallbackFontFaces`) falls back to the generic rather than to a
 * name nothing defines.
 *
 * The `next/font` branch repeats the family name inside the `var()` as its
 * fallback. A `var()` pointing at an undefined property is invalid at
 * computed-value time, which takes the whole `font-family` down, fallback
 * included, and leaves the element inheriting its parent's font: the name
 * inside is the only part that still resolves when Next's `variable` class
 * never reaches the DOM or its name doesn't match. See
 * `buildNextFontVariableName` for what it resolves to per loader.
 */
const buildFamilyString = (
  appFonts: AppFonts,
  familyName: string,
  fallback: FontFallback | undefined,
  usesNextFont: boolean,
  fallbackFaceGenerated: boolean,
): string => {
  const generic: FontFallbacks = typeof fallback === 'string' ? fallback : appFonts.defaultFallback
  const tail = fallbackFaceGenerated ? `, "${familyName} Fallback"` : `, ${generic}`

  return usesNextFont
    ? `'var(${buildNextFontVariableName(appFonts, familyName)}, "${familyName}")${tail}'`
    : `'"${familyName}"${tail}'`
}

/**
 * Reads and parses every file configured for one family, in config order.
 *
 * A file that won't parse is collected rather than thrown on the spot: one
 * bad file among several is survivable, since the family still gets its
 * metrics and its other `@font-face` rules from the ones that did parse.
 * Every file failing is not survivable, and the two cases want different
 * wording, so the messages wait until the count is known. Each one already
 * names the file it came from.
 * @throws If not one file parsed. That family is configured, so contributing
 *   no metrics, no `@font-face` and no `font-family` token while `generate`
 *   still exits 0 and reports success is the wrong outcome.
 */
const parseFamilyFiles = async (
  appFonts: AppFonts,
  familyName: string,
  fontSource: FileBackedFontSource,
  publicDir: string,
): Promise<ParsedEntry[]> => {
  const entries =
    fontSource.source === 'local' ? await resolveLocalFontPaths(appFonts, familyName, fontSource) : fontSource.url

  const parsed: ParsedEntry[] = []
  const failures: string[] = []

  for (const entry of entries) {
    try {
      const buffer =
        fontSource.source === 'local'
          ? await readLocalFont(path.join(process.cwd(), entry))
          : await fetchRemoteFont(entry)

      const parsedFont = await parseFontBuffer(buffer, `${familyName} (${entry})`)

      parsed.push({
        src: fontSource.source === 'local' ? buildLocalFontSrc(entry, publicDir) : entry,
        ext: getFontExtension(entry),
        isItalic: parsedFont.isItalic,
        weightClass: parsedFont.weightClass,
        weightRange: parsedFont.weightRange,
        raw: parsedFont.metrics,
        corrected: parsedFont.corrected,
        trimError: parsedFont.trimError,
      })
    } catch (err: unknown) {
      failures.push(err instanceof Error ? err.message : String(err))
    }
  }

  if (parsed.length === 0) {
    throw new Error(`No usable font file for "${familyName}". ${failures.join(' ')}`)
  }

  if (failures.length > 0) {
    console.warn(
      `⚠ "${familyName}": ${failures.length} of ${entries.length} files were skipped, metrics come from the rest. ${failures.join(' ')}`,
    )
  }

  return parsed
}

/**
 * Picks the one file a family's metrics are read from: non-italic first, then
 * whichever weight sits closest to 400.
 *
 * Lowest score wins. The italic penalty always dominates the weight distance,
 * which tops out around 600 since `usWeightClass` runs 1-1000, so any
 * non-italic file beats any italic one whatever the weights are. A family
 * with nothing but an Italic file still gets its metrics from that one:
 * italic is passed over only when there is something else to pick.
 */
const pickMetricsSource = (parsed: ParsedEntry[]): ParsedEntry => {
  const score = (entry: ParsedEntry): number => (entry.isItalic ? 10_000 : 0) + Math.abs(entry.weightClass - 400)
  return parsed.reduce((best, entry) => (score(entry) < score(best) ? entry : best))
}

/**
 * The two things a family's `fallback` decides, resolved together because the
 * second depends on the first: whether a metric-matched `@font-face` was
 * actually written, and what the `font-family` value ends up being (see
 * `buildFamilyString`, which falls back to the generic when it wasn't).
 *
 * A `manual` family reaches this with the metrics its config supplied and a
 * parsed one with the metrics of its best file, and nothing past that point
 * differs, which is why this is one function rather than the same four lines
 * in each branch.
 */
const resolveFamilyFallback = (
  appFonts: AppFonts,
  familyName: string,
  fontSource: FontSource,
  rawMetrics: RawFontMetrics,
  usesNextFont: boolean,
): { family: string; fallbackFaces: FallbackFontFace[] } => {
  const matched = matchedFallbackOf(fontSource.fallback)
  const fallbackFaces = matched ? computeFallbackFontFaces(familyName, rawMetrics, matched) : []

  return {
    family: buildFamilyString(appFonts, familyName, fontSource.fallback, usesNextFont, fallbackFaces.length > 0),
    fallbackFaces,
  }
}

/** One `@font-face` per parsed file, all under the family's config key, unlike the metrics which come from a single file (see `pickMetricsSource`). */
const buildFontFaces = (familyName: string, parsed: ParsedEntry[]): FontFace[] =>
  parsed.map((entry) => ({
    family: familyName,
    src: entry.src,
    ext: entry.ext,
    weight: entry.weightRange ?? entry.weightClass,
    style: entry.isItalic ? 'italic' : 'normal',
    ascentOverride: +(entry.corrected.ascender * 100).toFixed(3),
    descentOverride: +(entry.corrected.descender * 100).toFixed(3),
  }))

/**
 * Scans every family in `appFonts.families`, extracts metrics from its
 * `local`/`cdn` file(s) (or takes `manual` metrics as-is), and picks the
 * single best-matching file per family for metrics (preferring non-italic,
 * then whichever weight is closest to 400/Regular). Also builds one
 * `FontFace` per file that should get a `@font-face` rule. Local font paths
 * are resolved relative to `process.cwd()` (the directory containing
 * `trimscale.config.ts`); each `FontFace.src` is a root-relative URL (leading
 * `/`), also relative to `process.cwd()`, NOT to `output.dir`. Sass never
 * rebases a `url()` to the partial it came from, so a path relative to
 * `output.dir` only survives once the bundler compiles the CSS if the
 * consumer's own entry stylesheet happens to sit at `output.dir` too; a
 * root-relative path resolves the same regardless of which stylesheet
 * pulls it in. This assumes `process.cwd()` (where `trimscale.config.ts`
 * lives) is also the bundler's project root, true for Vite/webpack's
 * default setup. `AppFonts.publicDir` (default `'public'`) is stripped as a
 * leading segment when present, matching how a bundler serves that folder's
 * contents at the site root, see `buildLocalFontSrc`. A font file outside
 * `publicDir` still gets a root-relative path, but isn't guaranteed to
 * resolve correctly after a production build (works in dev, where the
 * whole project root is servable).
 */
export const computeFontData = async (
  cfg: TrimscaleConfig,
): Promise<{ metrics: FontMetricsMap; fontFaces: FontFace[]; fallbackFontFaces: FallbackFontFace[] }> => {
  if (!cfg.appFonts) {
    return { metrics: {}, fontFaces: [], fallbackFontFaces: [] }
  }
  const appFonts = cfg.appFonts
  const publicDir = appFonts.publicDir ?? 'public'

  const metrics: FontMetricsMap = {}
  const fontFaces: FontFace[] = []
  const fallbackFontFaces: FallbackFontFace[] = []

  for (const [familyName, fontSource] of Object.entries(appFonts.families)) {
    const usesNextFont = fontSource.nextFont ?? appFonts.nextFontDefault ?? false

    if (usesNextFont) {
      console.log(
        `- "${familyName}" expects next/font's \`variable\` to be exactly "${buildNextFontVariableName(appFonts, familyName)}"`,
      )
    }

    // `manual` skips every step below that reads a file, and takes the
    // config's metrics as its own. Everything after that is shared.
    if (fontSource.source === 'manual') {
      warnIfFamilyNameUnverifiable(familyName, 'manual')

      const resolved = resolveFamilyFallback(appFonts, familyName, fontSource, fontSource.metrics, usesNextFont)
      fallbackFontFaces.push(...resolved.fallbackFaces)
      metrics[familyName] = { ...fontSource.metrics, family: resolved.family }
      continue
    }

    const parsed = await parseFamilyFiles(appFonts, familyName, fontSource, publicDir)
    const best = pickMetricsSource(parsed)

    const resolved = resolveFamilyFallback(appFonts, familyName, fontSource, best.raw, usesNextFont)
    fallbackFontFaces.push(...resolved.fallbackFaces)
    metrics[familyName] = { ...best.raw, family: resolved.family }

    // A `local` family's rule is trimscale's to write unless next/font is
    // writing it instead; a `cdn` family's is opt-in.
    const writesFontFace = fontSource.source === 'local' ? !usesNextFont : (fontSource.generateFontFace ?? false)

    if (fontSource.source === 'cdn' && !writesFontFace) {
      warnIfFamilyNameUnverifiable(familyName, 'cdn')
    }

    if (writesFontFace) {
      fontFaces.push(...buildFontFaces(familyName, parsed))
    } else {
      warnIfTrimUncorrectable(familyName, best, usesNextFont, fontSource.source)
    }
  }

  return { metrics, fontFaces, fallbackFontFaces }
}
