# Changelog

Written for upgrading: what changed, and what it means for a project already on the previous version. Entries that need nothing from you are still listed, so you can tell the difference between "my output changed because of this" and "something is wrong".

## 1.0.0-beta.6

Re-run `generate` after upgrading, as after any version bump: a release can change which config fields exist, and this is what tells you.

```bash
npx trimscale-css generate
```

### Changes worth a look

**`rootFontSize`, for projects whose root font size isn't the browser's 16px.** Every px value in the config is converted to rem against this number: the breakpoint map, `fluidScale`'s font sizes, the spacing grid, and `fn.px-to-rem` / `fn.rem-to-px` when you call them yourself.

What it means: nothing at all unless you set it. The default is `16`, and a config that leaves it alone gets exactly the CSS it got before.

Setting anything else also emits `html { font-size }` in `@layer base`, as the percentage that produces the root you asked for:

```css
/* rootFontSize: 10 */
@layer base {
  html {
    font-size: 62.5%;
  }
}
```

A percentage rather than px, so the root still scales with the reader's own browser text-size setting. If your application already sets the root itself, its rule wins, since `@layer base` loses to unlayered CSS and to every layer above it. Keep the two in agreement: `rootFontSize` is what the px to rem conversion reads.

→ [full-config-reference.md#rootfontsize](full-config-reference.md#rootfontsize)

## 1.0.0-beta.5

Most of the breaking changes are config fields that moved, and `generate` stops with the new name for every one of them. Start by running it.

```bash
npx trimscale-css generate
```

Re-run it after any version bump, even when your config hasn't changed: a release can change which config fields exist, and this is what tells you.

### Fields that moved

| Was                            | Now                             |
| ------------------------------ | ------------------------------- |
| `outDir`                       | `output.dir`                    |
| `utilities`                    | `output.utilities`              |
| `utilities.spacing.tshirt`     | `output.utilities.spacing.tShirt` |
| `fontRoles`                    | `appFonts.fontRoles`            |
| `appFonts.fonts`               | `appFonts.families`             |
| `appFonts.fallbackDefault`     | `appFonts.defaultFallback`      |
| `fallbackFamily` (on a family) | `fallback: { matched: ... }`    |

What they do is unchanged. `generate` names the new path for each, one at a time, so you can work through them without reading this table.

`fallback: { matched }` is the one that also changes shape rather than just spelling. A metric-matched fallback now *replaces* the generic keyword instead of sitting in front of it, so drop that family's generic `fallback` if it has one. See [Metric-matched fallbacks](#metric-matched-fallbacks) below.

### Changes worth a look

**Text in some fonts sits higher than it did.** Every `@font-face` trimscale writes now carries `ascent-override` and `descent-override`, pinning the font's content area to exactly 1em. A font declares its vertical size in three tables that often disagree, and which one the browser reads depends on a flag inside the font and then on the operating system; on those fonts the leading trim was calculated against metrics the browser never used, and text sat low inside a correctly sized box by up to a fifth of an em. Roughly one Google Fonts family in nine was affected, Roboto among them.

What it means: text that *isn't* leading-trimmed also gets the 1em content area, so `line-height: normal` resolves to `1` and inline boxes are shorter than before. Where trimscale doesn't own the `@font-face` (`next/font`, a `cdn` family without `generateFontFace`, `manual`), it can't write the overrides, and `generate` warns with the two values and how to apply them. See [adding-a-font.md](adding-a-font.md#font-metric-overrides).

**The cascade layer order gained a layer.** It is now `reset, tokens, functions, trim-defaults, base, trim, layouts, components, utilities`. The trim system straddles `base` because its two halves need opposite positions relative to it.

What it means: nothing, unless you declare the layer order yourself instead of using `@use 'layer'`. If you do, add `trim-defaults` and move `trim` after `base`. An undeclared layer name is not an error in CSS, it quietly creates a new layer at the end with the highest priority, so a stale declaration fails silently rather than loudly.

**`.trim-text-*` follows the size it inherits.** It pinned an absolute `font-size: var(--text-base)`, which beat the size set on its parent. The baseline is `font-size: 1em` now.

What it means: if you followed the old wrapper example, which put `.font-size-*` on the outer element and `.trim-text-*` on a span inside it, that text changes size. It rendered at `--text-base` before and renders at the wrapper's size now, which is what the markup reads as meaning. Check the wrapper's size is the one you want. Nothing changes where the two classes already sit on the same element.

**Character-width tokens shift for some fonts.** The `avgCharWidth` metric is measured with a frequency-weighted average over lowercase a-z and space, replacing an OS/2 field whose meaning silently changes between table versions.

What it means: `--avg-char-width-*` and the `--text-box-*` widths that build on it move for fonts with an OS/2 version 3 or 4 table. Line lengths set in characters land slightly differently.

**Self-hosted font URLs are built differently, and there is a new field for them.** The `src` in a generated `@font-face` used to be a path relative to `output.dir`, which resolves to the wrong place almost everywhere: Sass never rebases a `url()` to the partial it came from, so the path was resolved against whichever stylesheet pulled the bridge file in, and the browser quietly 404'd the font. It is a root-relative URL now. On top of that, `appFonts.publicDir` (new, default `'public'`, use `'static'` on SvelteKit) names your bundler's static-passthrough folder, whose *contents* get served at the site root: a file at `public/fonts/x.woff2` is served at `/fonts/x.woff2`, so that leading segment is stripped.

What it means: if your fonts live under `public/` (or whatever you set `publicDir` to) this is what makes them load, and there is nothing to do. If they live somewhere else, the URL is still root-relative, which works in dev and isn't guaranteed after a production build. It doesn't change what `path` or `localFontsPath` mean. See [adding-a-font.md](adding-a-font.md).

**`.trim-text-*` belongs on a span inside the sized element, not on the element itself.** In browsers without native `text-box-trim` the fallback occupies that element's `::before` and `::after`, so putting the class on an element that has its own pseudo-elements makes them collide silently. This constraint always existed and was never written down.

A `display` of `flex`, `grid` or `table` on a trimmed element removes the trim in *every* engine, native included, not just on the fallback path. Move the display to a wrapper and keep the class on the span.

### Removed

| Removed                                                    | What to do                                                                    |
| ---------------------------------------------------------- | ----------------------------------------------------------------------------- |
| The eleven `--z-*` tokens (`--z-modal`, `--z-tooltip`, ...) | Copy the values into your own project if you used them. `.skip-link` now reads `var(--z-skip-link, 9999)`. |
| Gap utilities (`.gap-*`, `.row-gap-*`, `.column-gap-*`)     | No opt-back-in. Use `gap` with a `--space-*` token directly.                   |
| `styles/components/` and its `.text-box` component          | The recipe is in [examples.md](examples.md), to copy into your own components. |
| `.text-color-inherit`                                       | Write `color: inherit` yourself. It was the only `.text-color-*` class that shipped; the rest never did, because token names differ from project to project. |

### New

- **A standalone CSS build.** `output.css` makes `generate` compile the package's SCSS itself and write `trimscale.bundle.css`, plus a minified copy, for projects that would rather not configure Sass at all. `generate` prints each file's size, gzipped included, so what a config flag costs is visible when you change it. See [getting-started.md](getting-started.md#output-size).
- **Opt out of what you don't use.** `output.utilities` turns off individual utility-class groups (`spacing`, `typography`, `a11y`), and `output.reset` turns off the package's own reset for a project that has one. With `reset: false`, `generate` also writes a `reset-requirements.md` listing what your own reset has to cover.
- <a id="metric-matched-fallbacks"></a>**Metric-matched fallbacks.** `fallback: { matched: 'serif' }` on a family generates a fallback `@font-face` that takes on the webfont's own metrics, so the swap when the real font loads doesn't shift the layout. Takes a named chain, a single system family, or your own list. Don't combine it with `next/font`'s `adjustFontFallback`, which is on by default and does the same job.
- **Container queries from the breakpoint mixins.** All five (`up-to`, `and-up`, `and-down`, `between`, `only`) take a `$container` argument: a container name, or `true` for the nearest anonymous one. Existing calls are unaffected.
- **`appFonts` is optional.** A config without it still gets the full fluid type scale, spacing, breakpoints and color tokens. It has no leading trim and no `--font-family-*` tokens, both of which need font metrics.
- **A `package.json` `exports` field**, which also enables Sass's `pkg:` importer as an alternative to configuring `loadPaths`. `loadPaths` keeps working and stays the documented approach. The `pkg:` importer does **not** work in Next.js, under either Turbopack or webpack. See [using-with-nextjs.md](using-with-nextjs.md).
- **`trimscale.config.mts` is accepted**, and `init` writes that name in a project whose `package.json` declares `"type": "commonjs"`, where Node cannot load a `.ts` config at all.
- **Node 22.18.0 is enough**, lowered from 23.6.0. That is where flagless TypeScript type stripping, which `generate` needs to read your config, reached the 22.x LTS line.
- **`$type: 'max'` on every fluid function.** `fn.get-fluid-clamp` and `fn.fluid-space-step` take the `$type` argument that `fn.fluid-font-size` and `fn.fluid-spacing` already had, so a value can drop its upper bound and keep growing past `fluidScale.maxWidth`, which is what `uncapped` does for the type scale. `get-fluid-clamp` is the only entry point for arbitrary min/max pairs, so this was previously reachable for type-scale tokens and nothing else. Default `'clamp'`, existing calls are unaffected. See [abstracts.md](abstracts.md).
- **A check on the color fallback tier.** `generate` names every `hex` field that isn't a legacy sRGB color (hex, `rgb()`, `hsl()`, `hwb()`, or a named keyword), with its full config path. That field is the tier serving browsers without `oklch()`, so a `color()` or `oklch()` written there is unparseable in exactly the browsers it exists for. The mistake is invisible locally: anything new enough to run a dev server matches one of the `oklch()` tiers and never reads the fallback. A warning, not an error, since it compiles and targeting only modern engines is a legitimate choice.

### Fixed

- `.line-height-dynamic` collapsed to a single ratio for the whole document instead of tightening as text gets larger. Every element got the ratio meant for the root font size.
- Custom properties were not actually registered with `@property`: 107 of 108 `<length>` registrations were being discarded, and no color token was registered at all. Nothing looked broken, because every token is also declared on `:root`, but the registrations bought nothing. A `transition` on a length or color token now interpolates smoothly instead of jumping.
- A color token with an `opacity` key failed to compile at all.
- The plain-color fallback tier for `semanticColorAliases` emitted `color(srgb ...)`, which has worse browser support than the `oklch()` it exists to back up, and let out-of-gamut channels through as-is.
- A `lightnessMultiplier` past OKLCH's 0-100% produced a color Sass can't write as `oklch()`. Lightness and chroma are clamped now, and `generate` warns which field overshot.
- `next/font` with a multi-word family name (`Roboto Serif`) generated invalid SCSS that failed the build, and built a CSS variable name with a literal space in it.
- A `next/font` family resolved to `font-family: var(--next-font-x), sans-serif`. A `var()` pointing at an undefined custom property is invalid at computed-value time, which takes the whole declaration down, the generic fallback after it included, and leaves the element on whatever its parent had, so that keyword never covered the case it looked like it covered. The family name rides inside the `var()` as its own fallback now. It resolves for a `next/font/google` family, whose `@font-face` Next writes under the real family name, and not for `next/font/local`, whose name is generated, which is why the variable name `generate` prints is the check to trust rather than the rendered page. See [using-with-nextjs.md](using-with-nextjs.md#why-the-css-variable-must-come-first).
- A `local` family found through `localFontsPath` built its `@font-face` URL from the config key rather than the folder on disk. On Windows and macOS an `Inter` key opens a folder named `inter` without complaint, so the URL was correct in local dev and a 404 as soon as it was served from a case-sensitive host.
- A font file without the characters the metrics are measured from produced fabricated metrics rather than an error, which renders as the right font at the wrong size. The usual cause is a Google Fonts URL for a subset other than `latin`. `generate` refuses the file and says so now, and the same goes for a family whose every file fails to parse, which used to be skipped silently while `generate` reported success.
- `body` fell through to the browser's default font and a static `1rem` when `appFonts` or `semanticFontSizes.textBase` was left out, rather than to `sans-serif` and the system's own fluid base size.
- `output.utilities: false` was documented but didn't type-check, and the generated `utility-classes.md` listed the accessibility classes whatever their flag said.
- `generate` reported every failure as a Node stack trace under an unhandled-rejection banner. Failures are one line now, with the stack behind `TRIMSCALE_DEBUG=1`. A config that exists but won't parse no longer tells you to run `init`, which refuses to overwrite it anyway.
- `generate` left behind output it had stopped producing, so turning `output.css` off left linkable CSS frozen at whatever the config last said. Each run removes the files in its own known set that it didn't write this time, and nothing else in the folder.
- A misspelled `$type` on a fluid function (`'Max'`, `'maximum'`) produced no value and no warning. A Sass function that falls through every branch returns `null`, and a declaration with a `null` value is dropped, so the rule was simply missing from the output. An unrecognized `$type` is an error now.

---

Full engineering detail for every entry, including the ones with no consumer impact, is in `devDocs/changelog.md` in the [repository](https://github.com/bluemountain3d/trimscale-css).
