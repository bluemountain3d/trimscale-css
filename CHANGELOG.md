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

### Removed

- **Breaking:** gap utility classes (`.gap-*`, `.row-gap-*`,
  `.column-gap-*`). No opt-back-in. Gap utilities without a matching
  flex/grid utility set didn't fit the toolkit's scope.

### Documentation

- Documented that the generated bridge file should be regenerated after
  every trimscale-css version bump, not just after config changes, in case
  a future version changes which config fields exist.
- Documented the `<span>`-wrapper pattern for `.trim-text-*` classes: nest
  the class on a `<span>` inside the sized element rather than on the
  element itself, so the fallback path's `::before`/`::after` don't collide
  with your own.
