import path from 'node:path'
import type {
  FontSource,
  MatchableFallbackChain,
  MatchableFallbackFamily,
  RawFontMetrics,
  TrimscaleConfig,
} from '../models/Config.ts'
import { fetchRemoteFont, getFontExtension, listLocalFontDir, readLocalFont } from './generateFontMetrics.io.ts'
import { parseFontBuffer } from './generateFontMetrics.parser.ts'
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
 * when a `FontSource.fallbackFamily` is one of these keywords instead of an
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
  const normalizedEntry = entry.replace(/^\.[\\/]/, '').split(path.sep).join('/')
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

/** Resolves a `FontSource.fallbackFamily` value (single family, explicit array, or named chain) to a flat `MatchableFallbackFamily[]`. */
const resolveFallbackFamilies = (
  value: MatchableFallbackFamily | MatchableFallbackFamily[] | MatchableFallbackChain,
): MatchableFallbackFamily[] => {
  if (Array.isArray(value)) return value
  return value in FALLBACK_CHAINS ? FALLBACK_CHAINS[value as MatchableFallbackChain] : [value as MatchableFallbackFamily]
}

/** A single metric-matched `@font-face` override to emit, so a fallback system font takes on the web font's vertical/horizontal metrics during font-swap (reduces CLS). */
export type FallbackFontFace = {
  /** `font-family` value for the override (`"${familyName} Fallback"`), inserted between the web font and the generic fallback in the `font-family` stack */
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
 * font's own (uncorrected) ascender/descender/lineGap divided by
 * size-adjust, so the fallback's glyphs occupy the same vertical box the web
 * font would have. Same approach as fontaine and next/font's
 * `adjustFontFallback`. Formula: notes/trimscale-css-forbattringar.md.
 */
const computeOneFallbackFontFace = (
  familyName: string,
  webMetrics: Required<Pick<RawFontMetrics, 'avgCharWidth' | 'ascender' | 'descender' | 'lineGap'>>,
  fallbackFamily: MatchableFallbackFamily,
): FallbackFontFace => {
  const fb = FALLBACK_FONT_METRICS[fallbackFamily]
  const fallbackAvgCharWidth = fb.avgCharWidth / fb.upm

  const sizeAdjust = webMetrics.avgCharWidth / fallbackAvgCharWidth
  const ascentOverride = webMetrics.ascender / sizeAdjust
  const descentOverride = webMetrics.descender / sizeAdjust
  const lineGapOverride = webMetrics.lineGap / sizeAdjust

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
 * Computes one metric-matched `@font-face` override per family in
 * `fallbackFamily` (a single family, an explicit array, or a named
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
  fallbackFamily: MatchableFallbackFamily | MatchableFallbackFamily[] | MatchableFallbackChain,
): FallbackFontFace[] => {
  if (webMetrics.ascender === undefined || webMetrics.descender === undefined || webMetrics.lineGap === undefined) {
    console.warn(
      `⚠ "${familyName}": \`fallbackFamily\` is set but this family's metrics are missing \`ascender\`/\`descender\`/\`lineGap\` (only extracted automatically for \`local\`/\`cdn\` sources, a \`manual\` entry must supply them explicitly). Skipping its fallback @font-face.`,
    )
    return []
  }

  const resolvedMetrics = { ...webMetrics, ascender: webMetrics.ascender, descender: webMetrics.descender, lineGap: webMetrics.lineGap }

  return resolveFallbackFamilies(fallbackFamily).map((family) =>
    computeOneFallbackFontFace(familyName, resolvedMetrics, family),
  )
}

/**
 * A single `@font-face` rule to emit (as one `$font-faces` list entry via
 * `fontFacesToScssListValue`). Written for `local` sources (unless that
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
}

/** One `path`/`url` entry's extracted metrics plus what's needed to build its `@font-face`, kept until the family's best-metrics candidate is picked. */
type ParsedEntry = {
  src: string
  ext: string
  isItalic: boolean
  weightClass: number
  weightRange: { min: number; max: number } | null
  raw: RawFontMetrics
}

/** One family's full metrics entry: the raw extracted/manual metrics plus its resolved SCSS-ready `family` string. */
export type FamilyFontMetrics = RawFontMetrics & { family: string }

/** Map of resolved font family name to its extracted metrics */
export type FontMetricsMap = Record<string, FamilyFontMetrics>

/** Explicit `path` wins outright; otherwise looks under `localFontsPath/<familyName>/`. */
const resolveLocalFontPaths = async (
  cfg: TrimscaleConfig,
  familyName: string,
  fontSource: Extract<FontSource, { source: 'local' }>,
): Promise<string[]> => {
  if (fontSource.path) return fontSource.path

  if (!cfg.appFonts.localFontsPath) {
    throw new Error(
      `Font family "${familyName}" has no \`path\` and \`appFonts.localFontsPath\` is not set. Set one or the other.`,
    )
  }

  const dir = path.join(process.cwd(), cfg.appFonts.localFontsPath, familyName)
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
 */
const warnIfFamilyNameUnverifiable = (familyName: string, source: 'manual' | 'cdn'): void => {
  console.warn(
    `⚠ "${familyName}": no @font-face written (source: ${source}). Confirm "${familyName}" matches the font-family actually loaded elsewhere, or metrics apply to nothing.`,
  )
}

/** Builds the SCSS-ready `font-family` value: `next/font`'s CSS variable, or a quoted family name, both with the resolved fallback appended. When `fallbackFaceGenerated`, the metric-matched `"${familyName} Fallback"` override is inserted between the family and the generic fallback. */
const buildFamilyString = (
  cfg: TrimscaleConfig,
  familyName: string,
  fallback: string | undefined,
  usesNextFont: boolean,
  fallbackFaceGenerated: boolean,
): string => {
  const resolvedFallback = fallback ?? cfg.appFonts.fallbackDefault
  const nextPrefix = cfg.appFonts.nextFontPrefix ?? 'next-font'
  const fallbackFaceSegment = fallbackFaceGenerated ? `, "${familyName} Fallback"` : ''

  return usesNextFont
    ? `var(--${nextPrefix}-${toKebabCase(familyName)})${fallbackFaceSegment}, ${resolvedFallback}`
    : `'"${familyName}"${fallbackFaceSegment}, ${resolvedFallback}'`
}

/**
 * Scans every family in `appFonts.fonts`, extracts metrics from its
 * `local`/`cdn` file(s) (or takes `manual` metrics as-is), and picks the
 * single best-matching file per family for metrics (preferring non-italic,
 * then whichever weight is closest to 400/Regular). Also builds one
 * `FontFace` per file that should get a `@font-face` rule. Local font paths
 * are resolved relative to `process.cwd()` (the directory containing
 * `trimscale.config.ts`); each `FontFace.src` is a root-relative URL (leading
 * `/`), also relative to `process.cwd()`, NOT to `outDir`. Sass never
 * rebases a `url()` to the partial it came from, so a path relative to
 * `outDir` only survives once the bundler compiles the CSS if the
 * consumer's own entry stylesheet happens to sit at `outDir` too; a
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
  const nextFontDefault = cfg.appFonts.nextFontDefault ?? false
  const publicDir = cfg.appFonts.publicDir ?? 'public'

  const metrics: FontMetricsMap = {}
  const fontFaces: FontFace[] = []
  const fallbackFontFaces: FallbackFontFace[] = []

  for (const [familyName, fontSource] of Object.entries(cfg.appFonts.fonts)) {
    const usesNextFont = fontSource.nextFont ?? nextFontDefault

    if (fontSource.source === 'manual') {
      warnIfFamilyNameUnverifiable(familyName, 'manual')

      const fallbackFaces = fontSource.fallbackFamily
        ? computeFallbackFontFaces(familyName, fontSource.metrics, fontSource.fallbackFamily)
        : []
      fallbackFontFaces.push(...fallbackFaces)

      const family = buildFamilyString(cfg, familyName, fontSource.fallback, usesNextFont, fallbackFaces.length > 0)
      metrics[familyName] = { ...fontSource.metrics, family }
      continue
    }

    const entries =
      fontSource.source === 'local' ? await resolveLocalFontPaths(cfg, familyName, fontSource) : fontSource.url
    const parsedEntries: ParsedEntry[] = []

    for (const entry of entries) {
      try {
        const buffer =
          fontSource.source === 'local'
            ? await readLocalFont(path.join(process.cwd(), entry))
            : await fetchRemoteFont(entry)

        const src = fontSource.source === 'local' ? buildLocalFontSrc(entry, publicDir) : entry

        const {
          metrics: raw,
          isItalic,
          weightClass,
          weightRange,
        } = await parseFontBuffer(buffer, `${familyName} (${entry})`)

        parsedEntries.push({ src, ext: getFontExtension(entry), isItalic, weightClass, weightRange, raw })
      } catch (err: unknown) {
        console.error(`Failed to parse ${familyName} (${entry}):`, err)
      }
    }

    if (parsedEntries.length === 0) continue

    // Lower score wins. The 10_000 italic penalty always dominates the
    // weight distance (which maxes out around 600, since usWeightClass
    // runs 1-1000) — so any non-italic file beats any italic one
    // regardless of weight. Among files with the same italic-ness, the
    // one closest to weight 400 wins. A family with only an Italic file
    // still gets metrics from it — italic is only passed over when a
    // non-italic alternative exists.
    const best = parsedEntries.reduce((best, entry) => {
      const score = (entry.isItalic ? 10_000 : 0) + Math.abs(entry.weightClass - 400)
      const bestScore = (best.isItalic ? 10_000 : 0) + Math.abs(best.weightClass - 400)
      return score < bestScore ? entry : best
    })

    const fallbackFaces = fontSource.fallbackFamily
      ? computeFallbackFontFaces(familyName, best.raw, fontSource.fallbackFamily)
      : []
    fallbackFontFaces.push(...fallbackFaces)

    const family = buildFamilyString(cfg, familyName, fontSource.fallback, usesNextFont, fallbackFaces.length > 0)
    metrics[familyName] = { ...best.raw, family }

    const shouldGenerateFontFace =
      fontSource.source === 'local' ? !usesNextFont : (fontSource.generateFontFace ?? false)

    if (fontSource.source === 'cdn' && !shouldGenerateFontFace) {
      warnIfFamilyNameUnverifiable(familyName, 'cdn')
    }

    if (shouldGenerateFontFace) {
      for (const entry of parsedEntries) {
        fontFaces.push({
          family: familyName,
          src: entry.src,
          ext: entry.ext,
          weight: entry.weightRange ?? entry.weightClass,
          style: entry.isItalic ? 'italic' : 'normal',
        })
      }
    }
  }

  return { metrics, fontFaces, fallbackFontFaces }
}
