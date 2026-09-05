# Changelog

All notable changes to this project are documented in this file.

## [Unreleased]

### Added

- `package.json` `exports` field, defining the package's public surface
  (`tokens`, `abstracts/variables`, `abstracts/functions`, `abstracts/mixins`,
  `base`, `utilities`, `components`, `models/Config.ts`) and enabling Sass's
  `pkg:` importer as an alternative to configuring `loadPaths`. `loadPaths`
  keeps working unchanged, this is additive. Also formally locks `scripts/`
  from external import, it was never meant to be consumer-facing; if
  anything relied on importing `trimscale-css/scripts/*` directly
  (undocumented, unlikely), that now fails.
- `FontSource.fallbackFamily` (opt-in): generates a metric-matched `@font-face`
  override (`size-adjust`, `ascent-override`, `descent-override`,
  `line-gap-override`) between the webfont and its generic fallback keyword,
  to reduce layout shift on font swap.
- `$container` parameter on all five breakpoint mixins (`up-to`, `and-up`,
  `and-down`, `between`, `only`): pass a container name, or `true` for the
  nearest anonymous container, to emit a `@container` query instead of
  `@media`. Defaults to `null`, existing calls are unaffected.
- `utilities` config option (`spacing`, `typography`): opt out of individual
  utility-class groups, each a boolean or a per-flag object. Defaults to
  everything enabled, so existing configs are unaffected.
- `generate` now prints the exact `next/font` `variable` name each
  `nextFont`-enabled family expects (e.g. `"Inter" expects next/font's
  \`variable\` to be exactly "--next-font-inter"`). `generate` can't
  validate this against `layout.tsx` itself (it never reads consumer
  files beyond `trimscale.config.ts`), a mismatch there fails silently at
  runtime, so this gives something to check by eye instead of guessing.

### Changed

- Lowered the Node requirement from `>=23.6.0` to `>=22.18.0`. Flagless
  TypeScript type stripping, which `generate` relies on to run
  `trimscale.config.ts` directly, became the default on the 22.x LTS line
  at 22.18.0, not just on 23.6.0.
- `avgCharWidth` font metric: replaced the unreliable `os2.xAvgCharWidth`
  with a frequency-weighted average over lowercase a-z and space.
  Regenerating shifts `--avg-char-width-*` and `--text-box-*` widths for
  fonts with OS/2 version 3 or 4 tables.
- `generate` now converts `breakpoints`' px values to rem itself, instead of
  emitting a `fn.px-to-rem(...)` call into the generated bridge file. Output
  is identical (`320px` still becomes `20rem`), but the bridge file no
  longer needs to `@use` anything beyond trimscale-css's main entry point,
  which is already part of the package's public `exports` surface.

### Fixed

- `next/font` integration (`nextFontDefault`/`nextFont: true`) generated
  invalid SCSS whenever the resulting `family` value had a fallback
  appended: `var(--next-font-x), "X Fallback", sans-serif` was emitted
  unquoted into a Sass map, and Sass reads each top-level comma there as a
  new map entry, causing a parse error (`expected ":"`). The non-`next/font`
  branch already worked because it manually wrapped its value in a Sass
  string; the `next/font` branch was missing that wrapping.
- `toKebabCase` (used to build the `next/font` CSS variable name from a
  family name) didn't convert spaces to hyphens, so a multi-word family
  like "Roboto Serif" produced `--next-font-roboto serif`, a CSS custom
  property name with a literal space in it, invalid and non-functional.
  Both bugs were only reachable together and were caught testing a
  multi-word `next/font` family end-to-end in a real Next.js project.

### Removed

- **Breaking:** gap utility classes (`.gap-*`, `.row-gap-*`,
  `.column-gap-*`). No opt-back-in. Gap utilities without a matching
  flex/grid utility set didn't fit the toolkit's scope.

### Documentation

- Documented that `FontSource.fallbackFamily` shouldn't be combined with
  `next/font`'s own automatic fallback (`adjustFontFallback`, on by default
  for both `next/font/local` and `next/font/google`): both generate a
  metric-matched fallback font independently, stacking two redundant
  fallback fonts in the same `font-family` list. Not broken, just
  unnecessary, pick one.
- Documented that Next.js's Turbopack (default since v15) can't build
  trimscale-css's `@property`-based tokens at all, regardless of `next/font`
  or `pkg:`/`loadPaths`: Lightning CSS, which Turbopack always uses for CSS
  and can't be disabled there, fails to parse a decimal `initial-value`
  with no leading zero (`.25rem`, Sass's own default output), a known open
  upstream bug ([vercel/next.js#76302](https://github.com/vercel/next.js/issues/76302)).
  Confirmed `next dev --webpack` / `next build --webpack` works around it.
- Documented that the `pkg:` importer doesn't work with Next.js's Turbopack
  (the default bundler since v15): Turbopack only passes plain,
  JSON-serializable values through `sassOptions`, and a `NodePackageImporter`
  instance's `canonicalize`/`load` methods don't survive that boundary.
  Confirmed by reproducing the failure directly. `loadPaths` is unaffected
  and stays the documented approach for Next.js.
- Documented that the generated bridge file should be regenerated after
  every trimscale-css version bump, not just after config changes, in case
  a future version changes which config fields exist.
- Documented the `<span>`-wrapper pattern for `.trim-text-*` classes: nest
  the class on a `<span>` inside the sized element rather than on the
  element itself, so the fallback path's `::before`/`::after` don't collide
  with your own.
