# Changelog

All notable changes to this project are documented in this file.

## [Unreleased]

## [1.0.0-beta.5]

### Added

- `package.json` `exports` field, defining the package's public surface
  (`tokens`, `abstracts/variables`, `abstracts/functions`, `abstracts/mixins`,
  `base`, `utilities`, `models/Config.ts`) and enabling Sass's
  `pkg:` importer as an alternative to configuring `loadPaths`. `loadPaths`
  keeps working unchanged, this is additive. Also formally locks `scripts/`
  from external import, it was never meant to be consumer-facing; if
  anything relied on importing `trimscale-css/scripts/*` directly
  (undocumented, unlikely), that now fails.
  **The `pkg:` importer does not work in Next.js**, under Turbopack or
  webpack: a `NodePackageImporter` instance registered through
  `sassOptions` fails the build either way, with the same error.
  Reproduced against both bundlers. `loadPaths` is unaffected and stays
  the documented approach for Next.js.
- `FontSource.fallback` accepts `{ matched: ... }` (opt-in) alongside a
  generic keyword: generates a metric-matched `@font-face` override
  (`size-adjust`, `ascent-override`, `descent-override`,
  `line-gap-override`) that stands in for the webfont until it loads, to
  reduce layout shift on font swap. Takes a named chain (`'serif'`,
  recommended), a single system family, or your own list.
  The two forms are alternatives, not layers: `{ matched }` emits no generic
  keyword after it, because a generic needs no loading and would therefore
  win the swap window every time, leaving the override to render in the one
  moment it exists for. `next/font` builds its own fallbacks the same way.
  Don't combine `{ matched }` with `next/font`'s own `adjustFontFallback`
  (on by default for both `next/font/local` and `next/font/google`): both
  generate a metric-matched fallback independently, stacking two redundant
  fallback fonts in the same `font-family` list. Not broken, just
  unnecessary, pick one.
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
- A `nextFont`-enabled family's `family` value carries the font's own name as
  the `var()` fallback: `var(--next-font-inter, "Inter"), sans-serif`, was
  `var(--next-font-inter), sans-serif`. An undefined custom property
  invalidates the whole `font-family` at computed-value time, generic fallback
  included, leaving the element on whatever its parent had; the name inside
  `var()` keeps a missing or misnamed `next/font` `variable` from costing you
  the declaration. It resolves for a `next/font/google` family (Next.js writes
  its `@font-face` under the real family name) and not for `next/font/local`
  (a generated name), so a Google font renders correctly even when the variable
  never arrives, which also means a mismatch there is invisible in the browser.
  `generate` prints the exact `variable` name each `nextFont` family expects
  (e.g. `"Inter" expects next/font's \`variable\` to be exactly
  "--next-font-inter"`), and since it never reads `layout.tsx`, that printed
  line is the only check there is.
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
- `trimscale.config.mts` is accepted alongside `trimscale.config.ts`, and
  `init` writes the `.mts` name in a project whose `package.json` declares
  `"type": "commonjs"` (what `npm init -y` writes). Node reads a `.ts` config
  as CommonJS there, where the config's `export default` is a syntax error,
  and an explicit `type` skips the module detection that covers a
  `package.json` with no `type` at all, so the `.ts` name is a dead end in
  that one state. `.mts` is an ES module whatever the project declares, and
  nothing else about the project changes. A `.ts` config already sitting in
  such a project now fails with that explanation instead of Node's
  "Unexpected token 'export'".
- `generate` warns when a color token's `hex` value is one a browser without
  `oklch()` support can't parse (`color()`, `lab()`, `lch()`, `oklch()`,
  `color-mix()`). That tier exists for exactly those browsers, and a base
  token's value reaches it as written, so the mistake is invisible in any
  browser new enough to run a dev server: everything else matches one of the
  `oklch()` tiers below it and never reads the fallback. A hex, `rgb()`,
  `hsl()`, `hwb()` and the named keywords all pass. Only base tokens are
  checked; a `semanticColorAliases` entry with a multiplier derives its own
  fallback, gamut-mapped, and never uses a configured `hex`.
- `output.css` config option: `generate` compiles the same static SCSS the
  bridge file configures (via a Sass compiler installed in the project at
  generate time, `sass-embedded` or `sass`, there's no separate hand-written
  CSS emitter) and writes `trimscale.bundle.css` (and, unless
  `output.css: { minify: false }`, a minified `trimscale.bundle.min.css`)
  into `output.dir`, for consumers who don't want to configure Sass at all. Font
  file URLs are rewritten to `output.css.fontUrlBase` (default `'/fonts'`,
  distinct from `AppFonts.publicDir`: one is where the SCSS build's `src`
  is rebased from, the other is what URL a standalone CSS file requests).
  `output.utilities.typography.trim: false` is a function flag in this
  build, not a size flag, and `generate` warns about it: there's no SCSS
  escape hatch (`font-setup`, the placeholders) left to fall back on, and
  a role's trim metrics only reach the file through `.trim-text-*`.
  `family` needs no such warning, `--font-family-{role}` is emitted either
  way and your own CSS can use it. `generate` also warns per
  `nextFont`-enabled family, whose `var(--next-font-x)` value is never set
  outside Next.js's own runtime. Default `false`, opt-in.
  See [why-scss.md](docs/why-scss.md) for why the file still needs
  `generate` and can't ship pre-built.
- `generate` prints the size of each CSS file it writes, including the
  gzipped size of the one you'd actually ship (`zlib.gzipSync`, no new
  dependency), so what an `output.utilities` flag costs is visible right
  when you change it rather than after a build. Reference figures for four
  configs, and what a spacing step, font role, color token and
  `@font-face` rule each cost, are in
  [getting-started.md](docs/getting-started.md#output-size).

### Changed

- **Breaking:** `appFonts.fallbackDefault` is renamed
  `appFonts.defaultFallback`. It has always been the default *value* of a
  family's `fallback` field rather than a last resort appended to every
  stack, and the old name read the other way round. `generate` fails with a
  message naming the new field if the old one is still there.

- **Breaking:** every `@font-face` trimscale writes now carries
  `ascent-override` and `descent-override`, pinning that font's content area
  to exactly 1em. Leading trim is calculated from a font's typographic
  metrics, but a font declares its vertical size in three tables that often
  disagree, and which one the browser reads is decided by the OS/2
  `USE_TYPO_METRICS` flag and then by the platform: with the flag clear,
  Windows reads `usWin` and macOS reads `hhea`. On such a font the trim was
  calculated against metrics the browser never used, and the text sat low
  inside a correctly sized box, by up to a fifth of an em. Measured across
  3793 Google Fonts files, roughly one family in nine was affected, Roboto
  among them; native `text-box-trim` never was, it reads cap height and
  baseline directly. **Migration:** text in an affected font that isn't
  leading-trimmed also gets the 1em content area, so `line-height: normal`
  resolves to `1` and inline boxes are shorter than before. Metric-matched
  `{ matched }` fallback faces are computed on the same basis, so the two stay
  aligned across a font swap. Where the `@font-face` belongs to someone else
  (`next/font`, `cdn` without `generateFontFace`, `manual`) trimscale can't
  write them, and `generate` warns with the two values and how to apply them,
  staying silent below a hundredth of an em. See
  [adding-a-font.md](docs/adding-a-font.md#font-metric-overrides).
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
  rather than "font". `generate` names the rename if a config still uses the
  old key, the same as it does for the three top-level moves below; without
  that it surfaced as `Cannot convert undefined or null to object`, which
  names neither the field nor the release.
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
- No color token was registered with `@property`. `generate-color-tokens`
  looped over the outer `(prefix:, tokens:)` wrapper instead of the token
  map inside it, so each palette registered exactly two properties named
  after its own wrapper keys (`--color-prefix`, `--color-tokens`) and not
  one real token. Registration is what gives a custom property its type and
  `initial-value`, so every color property was an untyped string as far as
  the browser was concerned.
- A color token with an `opacity` key failed to compile at all.
  `generate-color-tokens` passed `$opacity` to `color.change()` for its two
  `oklch()` tiers, and `opacity` isn't a channel name in the oklch color
  space (`$alpha` is), so Sass stopped with "Color space oklch doesn't have
  a channel with this name". Only the plain-color tier, which builds its
  value through `rgba()`, was unaffected.
- The plain-color fallback tier for `semanticColorAliases` entries wasn't
  plain. `get-color-token` converted to the `srgb` space without
  gamut-mapping first, and Sass serializes that space as `color(srgb ...)`,
  a function with worse browser support than the `oklch()` this tier exists
  to back up. Out-of-gamut channels came through as-is
  (`color(srgb 2.66 2.10 2.25)`) whenever a multiplier pushed the color past
  sRGB. It now maps into gamut (`color.to-gamut`, `local-minde`) and rounds
  to 8-bit `rgb()`/`rgba()`.
- `generate` never removed output it stopped producing. Turning `output.css`
  off left the CSS files behind, still linkable and frozen at whatever the
  config said when they were last written; turning `output.reset` back on
  left a `reset-requirements.md` describing a requirement that no longer
  applied. Each run now removes the files in its own known set that it didn't
  write this time, and nothing else in the folder: `output.dir` belongs to
  the project, not to the generator. Changing `output.dir` still leaves the
  old folder behind, since nothing in the new run knows it existed.
- A font file without the characters the metrics are measured from produced
  fabricated metrics instead of an error. `getAvgAdvanceWidth` drops missing
  characters and renormalizes the rest, which is right for a font missing a
  `q` and wrong for one missing everything: with only a space glyph present
  it returned the width of a space as the average character (0.26 against a
  real 0.465 for Playfair Display). Side bearings were worse, averaging an
  empty list to `0`, a value that reads downstream as "needs no horizontal
  trim" rather than as a failure, so horizontal trim silently turned itself
  off. The `size-adjust` on the metric-matched fallback `@font-face` came out
  at 62.79% instead of 112.3%, which renders as the right font drawn far too
  small. `generate` now refuses a file it can't measure, and names the usual
  cause: a Google Fonts URL for a subset other than `latin`. Same for a
  missing cap height with no `H`/`I`/`E`/`T` to measure one from.
- A family whose every font file failed to parse was skipped silently, with
  `generate` reporting success and simply emitting no metrics, no
  `@font-face` and no `--font-family-*` token for it. One unreadable file
  among several is still survivable and now warns; all of them failing is an
  error.
- A `local` family discovered through `localFontsPath` built its
  `@font-face` `src` from the config key rather than from the folder on
  disk. On a case-insensitive filesystem an `Inter` key opens a folder named
  `inter` without complaint, so the URL came out as `/fonts/Inter/...` for a
  folder that is really `fonts/inter/`: correct in local dev, 404 as soon as
  it's served from a case-sensitive host, and invisible until then. The
  folder's own spelling is what reaches the `src` now, with a warning about
  the mismatch. A missing folder and a folder with no font files in it are
  also separate errors now, rather than one message for both.
- `output.utilities` was documented as accepting `boolean` or an object, but
  its type only accepted the object, so `utilities: false` (every group off
  at once, the shorthand the other three levels already had) didn't
  type-check. The type matches the documentation now, and the generated
  `utility-classes.md` says every group is off rather than printing an empty
  section list.
- `utility-classes.md` listed the accessibility classes whatever
  `output.utilities.a11y` was set to, the one section that never consulted
  its flag. A section whose classes are all turned off now leaves no heading
  behind either, rather than an empty one.
- Anything that stopped `generate` reached the terminal as a Node stack
  trace under an unhandled-rejection banner, with the message it was written
  to carry (a config field that moved, a font family with no `path`, no Sass
  compiler for `output.css`) somewhere in the middle. The message is now the
  whole output, one `❌` line plus the `cause` chain, and the stack is behind
  `TRIMSCALE_DEBUG=1`. A package manager still adds its own "command failed
  with exit code 1" line, which is correct: `generate` exits non-zero.
- A config that exists but won't parse reported the same "Run
  `npx trimscale-css init` first" as one that isn't there, which is wrong
  advice twice over: the file is there, and `init` refuses to overwrite it.
  Missing and unparseable are separate messages now, and the parse error's
  own text (`Expected ',', got '<eof>'`) comes through as the cause.
- A `lightnessMultiplier` that pushed OKLCH lightness past its 0-100%
  definition produced a color Sass can't write as `oklch()`, falling back to
  `color-mix(in oklch, color(xyz ...) 100%, black)` in the output. Lightness
  and chroma are clamped to what the color space holds, and `generate` warns
  which `semanticColorAliases` field overshot and whether it landed on white,
  black, or gray. Derived color channels are rounded to three decimals.
- `.trim-text-*` and the `%*-text` placeholders pinned an absolute
  `font-size: var(--text-base)` instead of following the size they inherit. A
  declared value beats inheritance, so on the `<span>` wrapper the docs
  recommend it overrode the size set on the parent:
  `<p class="font-size-text-lg"><span class="trim-text-body">` rendered the
  span at `--text-base`. The trim itself stays correct at whichever size
  wins, so the only symptom is text quietly rendering at the wrong size. The
  baseline is `font-size: 1em` now, which computes to the parent's size.
  **If you followed the old wrapper example**, which put `.font-size-*` on
  the outer element, that text changes size: it rendered at `--text-base`
  before and renders at the wrapper's size now, which is what the markup
  reads as meaning. Check the wrapper's size is the one you want, and set an
  explicit `.font-size-*` on the trimmed element where it isn't. Nothing
  changes where the two already sit together, `.font-size-*` in `utilities`
  wins there either way.
- No `<length>` custom property was registered with `@property`. Each one
  declared a font-relative `initial-value` (`1rem` for the type scale and
  `--fluid-base`, `0.25rem` for the spacing units and every `--space-*`,
  `8rem` for `--header-height`, `0em` for the trim metrics), and `@property`
  requires an initial-value that is computationally independent, so the
  browser rejected the descriptor and discarded the whole rule. 107 of the
  108 `<length>` registrations were being dropped. Nothing looked broken,
  since every token is also declared on `:root` and an initial-value only
  applies to a token that isn't, but the registrations bought nothing: no
  type checking, no failing safe to the initial value, and no interpolation,
  because only registered custom properties can be transitioned. A
  `transition` on a length token therefore changes from a discrete jump to a
  smooth one. Two sets stay unregistered on purpose. `--avg-char-width-*`
  carries an em ratio that has to resolve against the consuming element, and
  a registered `<length>` computes at its declaration site, which would
  freeze it against the root font-size and throw off character-count line
  lengths. The four trim metrics (`--_top-trim`, `--_bottom-trim`,
  `--_lsb-adjust`, `--_rsb-adjust`) are the only ones set per element rather
  than once on `:root`, so registering them makes every trimmed element
  recompute all four on every resize frame, which is visible as lag while
  dragging a window in an engine on the fallback path. They are private,
  always declared explicitly, and never transitioned, so the registration
  bought nothing to weigh against that.
- `body`'s `font-size: var(--text-base, 1rem)` fell back to a static `1rem`
  when `semanticFontSizes.textBase` was left out of the config, which is
  allowed, every `semanticFontSizes` entry is optional. Body text then
  stopped scaling with the viewport, with no signal beyond looking static.
  The fallback is `var(--fluid-base)` now, the system's own base size, which
  is generated whatever the typography config says.
- The documented effect of a custom `display` on a trimmed element was wrong.
  Both `docs/utility-classes.md` and the doc comment in
  `styles/utilities/_typography-utilities.scss` said a `display` of your own
  breaks the fallback path while leaving native `text-box-trim` untouched.
  That holds for `block`, `inline-block` and `list-item`, which cost the
  fallback only its block formatting context. It does not hold for `flex`,
  `grid` or `table`: the spec is explicit that `text-box-trim` neither
  applies to nor propagates through those formatting contexts, so the trim is
  absent in every engine, native included. **If you put a `display: flex`,
  `grid` or `table` on an element carrying `.trim-text-*`**, that element is
  not trimmed anywhere; move the display to a wrapper and keep the class on
  the span.

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

