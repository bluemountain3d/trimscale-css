# Changelog

All notable changes to this project are documented in this file.

## [Unreleased]

### Added

- `package.json` `exports` field, defining the package's public surface
  (`tokens`, `abstracts/variables`, `abstracts/functions`, `abstracts/mixins`,
  `base`, `utilities`, `models/Config.ts`) and enabling Sass's
  `pkg:` importer as an alternative to configuring `loadPaths`. `loadPaths`
  keeps working unchanged, this is additive. Also formally locks `scripts/`
  from external import, it was never meant to be consumer-facing; if
  anything relied on importing `trimscale-css/scripts/*` directly
  (undocumented, unlikely), that now fails.
  **The `pkg:` importer does not work with Next.js's Turbopack** (the
  default bundler since v15): Turbopack only passes plain,
  JSON-serializable values through `sassOptions`, and a
  `NodePackageImporter` instance's `canonicalize`/`load` methods don't
  survive that boundary. Confirmed by reproducing the failure directly.
  `loadPaths` is unaffected and stays the documented approach for Next.js.
- `FontSource.fallbackFamily` (opt-in): generates a metric-matched `@font-face`
  override (`size-adjust`, `ascent-override`, `descent-override`,
  `line-gap-override`) between the webfont and its generic fallback keyword,
  to reduce layout shift on font swap. Don't combine it with `next/font`'s
  own `adjustFontFallback` (on by default for both `next/font/local` and
  `next/font/google`): both generate a metric-matched fallback
  independently, stacking two redundant fallback fonts in the same
  `font-family` list. Not broken, just unnecessary, pick one.
- `$container` parameter on all five breakpoint mixins (`up-to`, `and-up`,
  `and-down`, `between`, `only`): pass a container name, or `true` for the
  nearest anonymous container, to emit a `@container` query instead of
  `@media`. Defaults to `null`, existing calls are unaffected.
- `output.utilities` config option (`spacing`, `typography`, `a11y`): opt
  out of individual utility-class groups. `spacing`/`typography` are each a
  boolean or a per-flag object; `a11y` is boolean only, `.sr-only-focusable`
  and `.aria-live-*` both `@extend .sr-only`, so a partial opt-out would
  break the Sass compile. Defaults to everything enabled, so existing
  configs are unaffected.
- `output.reset` config option: opt out of the package's own `@layer reset`
  block, for a project that already has its own. Default `true`. The
  `@layer reset, tokens, ...` declaration itself is unaffected either way,
  only the block's contents are conditional. `reset: false` also makes
  `generate` write `<output.dir>/reset-requirements.md`, listing exactly
  what your own reset needs to cover (margin resets, `box-sizing`,
  `line-height`), since skipping the package's reset without replacing
  what it does compiles cleanly and fails silently otherwise.
- `generate` now prints the exact `next/font` `variable` name each
  `nextFont`-enabled family expects (e.g. `"Inter" expects next/font's
  \`variable\` to be exactly "--next-font-inter"`). `generate` can't
  validate this against `layout.tsx` itself (it never reads consumer
  files beyond `trimscale.config.ts`), a mismatch there fails silently at
  runtime, so this gives something to check by eye instead of guessing.
- `appFonts` is optional. A config with none of it still gets the full
  fluid type scale, spacing, breakpoints, and color tokens, it just has no
  leading trim and no `--font-family-*` tokens, both need font metrics
  that don't exist without a configured font. `generate` skips font
  parsing entirely (no downloads, no `.trimscale-cache/` writes) when
  `appFonts` is absent or has no `families`, `mx.font-setup` errors with a
  message pointing at `appFonts` when called without any fonts configured
  instead of an empty "valid roles are:" list, and `generate` warns if
  `output.utilities.typography.trim`/`family` is left on with no
  `appFonts` configured, that combination is coherent (SCSS still compiles)
  but produces zero classes, which reads as a bug otherwise.
- `output.css` config option: `generate` compiles the same static SCSS the
  bridge file configures (via a Sass compiler installed in the project at
  generate time, `sass-embedded` or `sass`, there's no separate hand-written
  CSS emitter) and writes `trimscale.css` (and, unless
  `output.css: { minify: false }`, a minified `trimscale.min.css`) into
  `output.dir`, for consumers who don't want to configure Sass at all. Font
  file URLs are rewritten to `output.css.fontUrlBase` (default `'/fonts'`,
  distinct from `AppFonts.publicDir`: one is where the SCSS build's `src`
  is rebased from, the other is what URL a standalone CSS file requests).
  `output.utilities.typography.trim`/`family: false` are function flags in
  this build, not size flags, `generate` warns since there's no SCSS
  escape hatch (`font-setup`, the placeholders) left to fall back on, same
  for a `nextFont`-enabled family, whose `var(--next-font-x)` value is
  never set outside Next.js's own runtime. Default `false`, opt-in.
  See [why-scss.md](docs/why-scss.md) for why the file still needs
  `generate` and can't ship pre-built.

### Changed

- **Breaking:** the cascade layer order gained a layer and `trim` moved. It is
  now `reset, tokens, functions, trim-defaults, base, trim, layouts,
  components, utilities` (was `reset, tokens, functions, trim, base, layouts,
  components, utilities`). The trim system straddles `base` because its two
  halves need opposite positions relative to it: the bare font-size/line-height
  baseline belongs below `base`, so `small { font-size: 0.875em }` still wins,
  while the `--_*` metrics and the role's `font-family` belong above it, so a
  base rule like `code { font-family: ... }` can't leave an element rendering
  in one typeface while trimmed by another's metrics. Previously
  `<code class="trim-text-body">` rendered in the code face with body metrics.
  **Migration:** if you declare the layer order yourself (component-scoped
  import without `@use 'layer'`), add `trim-defaults` and move `trim` after
  `base` to match. An undeclared layer name is not an error in CSS, it creates
  a new layer at the end with the highest priority, so a stale declaration
  fails silently rather than loudly.
- **Breaking:** `%text-properties` split into `%text-baseline` (in
  `@layer trim-defaults`) and `%text-geometry` (in `@layer trim`). Extend the
  role placeholders (`%heading-text` etc.) or use `mx.font-setup` as before,
  both pull in each half automatically. Only a direct `@extend
  %text-properties` needs changing, and that placeholder was never the
  documented entry point.
- **Breaking:** `.trim-text-*` is declared in `@layer trim` instead of
  `@layer utilities`. No output changes from this on its own: `@extend` emits
  into the placeholder's own position, so the class was already landing in the
  trim layer while leaving an empty `utilities` block behind. It matters only
  if you were relying on `.trim-text-*` outranking a rule in `layouts` or
  `components`, which it never did.
- `.trim-text-*` belongs on a `<span>` nested inside the sized element, not
  on the element itself. The fallback path (browsers without native
  `text-box-trim`) occupies that element's `::before`/`::after`, so putting
  the class directly on an element that has its own pseudo-elements makes
  them collide silently. Previously unstated; the constraint has always
  existed.
- After every trimscale-css version bump, re-run `generate` even if your
  config didn't change, in case a newer version changes which config fields
  exist. Previously only documented as a response to config edits.
- **Breaking:** `appFonts.fontRoles` moved from a top-level `TrimscaleConfig`
  field into `appFonts.fontRoles` (a property of `AppFonts` itself). The
  values in `fontRoles` are keys in `appFonts.families` (see below), nesting
  them together makes that relationship visible, and keeps "both exist or
  neither does" a fact the type enforces on its own, now that `appFonts`
  itself is optional (see below). `loadConfig` throws a clear error naming
  the new path if a config still sets `fontRoles` at the top level.
- **Breaking:** `outDir` and `utilities` (top-level config fields) collected
  under a new `output` object: `output.dir` (was `outDir`) and
  `output.utilities` (was `utilities`). `output` also declares `scss`,
  `css`, and `reset`; only `dir` and `utilities` affect anything today, the
  other three are reserved for standalone-CSS-output and opt-out-reset
  work. `loadConfig` throws a clear error naming the new path if a config
  still sets `outDir` or `utilities` at the top level, and throws if
  `output.scss` and `output.css` are both `false` (nothing would be
  generated).
- **Breaking:** `appFonts.fonts` renamed to `appFonts.families`. An entry
  describes a whole family, not a single file, `path`/`url` already accept
  multiple files to cover a family's full weight/style range, and every
  other property on `AppFonts`/`FontRoles` already talks about "family"
  rather than "font".
- **Breaking:** `utilities.spacing.tshirt` renamed to
  `output.utilities.spacing.tShirt`, matching `tShirtScale`'s existing
  casing elsewhere in the config.
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

- `body`'s `font-family: var(--font-family-body)` had no fallback, unlike
  `code`'s `var(--font-family-code, monospace)`. Found testing a config
  with no `appFonts`: `--font-family-body` is never defined in that case,
  so `body` fell through to the browser's raw default instead of a sane
  `sans-serif`. Added the same fallback pattern `code` already had.
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

- `styles/components/` and its `.text-box` component. The package ships
  nothing into the `layouts` and `components` layers, both are declared in
  `_layer.scss` and left empty by design. `_index.scss` never forwarded the
  component, so it emitted no CSS, but the partial was in the published
  tarball and reachable via a `loadPaths` deep import. The recipe stays in
  [examples.md](docs/examples.md) to copy into your own `components/` folder.
- The internal SCSS scaffolding partials (`_fn_[NAME].scss`,
  `_mx_[NAME].scss`, `_[NAME].scss`) no longer ship. They were copy-me
  starting points for this repo's own authoring, never forwarded from any
  index and never documented. Renamed to `_*template.scss` and excluded via
  `files`. Unrelated to `templates/trimscale.config.ts`, the config template
  `init` copies, which still ships.
- **Breaking:** `_z-index-tokens.scss` and its eleven `--z-*` custom
  properties (`dropdown`, `sticky`, `header`, `fixed`, `overlay`, `drawer`,
  `modal`, `popover`, `tooltip`, `toast`, `skip-link`). Only `skip-link`
  was ever used by the package itself (`.skip-link`'s `z-index`), the rest
  shipped a stacking-context design decision that's outside what a
  typography/spacing toolkit says it does. `.skip-link` now reads
  `var(--z-skip-link, 9999)`, copy the old values into your own project
  if you were using them directly.
- **Breaking:** gap utility classes (`.gap-*`, `.row-gap-*`,
  `.column-gap-*`). No opt-back-in. Gap utilities without a matching
  flex/grid utility set didn't fit the toolkit's scope.

