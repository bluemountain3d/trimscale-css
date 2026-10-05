# Changelog

Written for upgrading: what changed, and what it means for a project already on the previous version. Entries that need nothing from you are still listed, so you can tell the difference between "my output changed because of this" and "something is wrong".

## 1.0.0-beta.6

Re-run `generate` after upgrading, as after any version bump: a release can change which config fields exist, and this is what tells you.

```bash
npx trimscale-css generate
```

### Fields that moved

| Was                    | Now                               |
| ---------------------- | --------------------------------- |
| `defaultScheme`        | `colorSetup.defaultScheme`        |
| `baseColorTokens`      | `colorSetup.baseColorTokens`      |
| `customColorTokens`    | `colorSetup.customColorTokens`    |
| `semanticColorAliases` | `colorSetup.semanticColorAliases` |

Four keys moving one level in, nothing else about them changes. Color was the last axis still spread across the top level while every other one (`appFonts`, `fluidScale`, `spacingSetup`, `output`) was grouped. `generate` stops and names the new path for each, one at a time, so you can work through it without this table:

```ts
colorSetup: {
  defaultScheme: 'light',
  baseColorTokens: {
    /* unchanged */
  },
},
```

### Changes worth a look

**`--space-*` is always fluid, and the fixed steps are `--space-fixed-*`.** Under the default `'independent'` approach, every spacing step used to be either fixed or fluid, never both: `tShirtScaleMicro` and `--space-1` up to `numericScaleMicroEnd` sat on the static `--unit-micro`, the rest on the fluid `--unit-macro`, all under `--space-*`. A value like 16px → 32px had no name when `sm` was a fixed tier. Now `--space-*` is the fluid scale throughout (`tShirtScaleMacro`, and `--space-1` up to `numericScaleMacroEnd`), the same meaning it has under `'coupled'`, and the fixed steps get their own namespace: `--space-fixed-{tier}` from `tShirtScaleMicro` and `--space-fixed-1` up to `numericScaleMicroEnd`. The two maps may share keys, `sm` in both gives a fluid `--space-sm` and a fixed `--space-fixed-sm`. Each fixed step has utility classes too, `.p-fixed-sm`, `.mt-fixed-4` and so on, and `output.utilities.spacing.fixed` turns them off.

What it means for a config you don't change. Its `tShirtScaleMicro` tiers move to the new names, and nothing fails to compile:

- `--space-3xs` to `--space-lg` (the old default micro tiers) no longer exist, and neither do `.p-sm` and the other classes built on them. A `var()` pointing at one resolves to nothing, so look for padding and margins that collapsed to zero.
- `--space-1` to `--space-6` exist still, but grow with the viewport where they were fixed: the same size at `fluidScale.minWidth`, up to twice it at `maxWidth`. This is the one change you can't see in the output's token list.
- Your `tShirtScaleMacro` tiers and the numeric steps above `numericScaleMicroEnd` are unchanged.

To keep exactly what you had, rename: `--space-sm` → `--space-fixed-sm`, `--space-4` → `--space-fixed-4`, `.p-sm` → `.p-fixed-sm`. To adopt the new defaults instead, where every tier exists in both forms, copy `spacingSetup` from the template:

```ts
tShirtScaleMicro: {
  '3xs': 1, '2xs': 2, xs: 3, sm: 4, md: 5, lg: 6, xl: 8,
},
tShirtScaleMacro: {
  '3xs': 1, '2xs': 2, xs: 3, sm: 4, md: 5, lg: 6, xl: 8,
  '2xl': 10, '3xl': 12, '4xl': 14, '5xl': 16, '6xl': 20,
  '7xl': 24, '8xl': 28, '9xl': 32,
},
numericScaleMicroEnd: 8,
numericScaleMacroEnd: 32,
```

Note that this also changes `--space-xl` to `--space-4xl` (new multipliers 8, 10, 12, 14 where they were 6, 8, 10, 12) and drops `--space-33` to `--space-48`. The default numeric scale ends at 32, since steps past it are rarely needed and `calc()` covers them.

`'coupled'` configs keep their names: `tShirtScale` was already fluid `--space-*`, and there is no fixed scale. What changes is that each `--space-*` rounds to the nearest whole pixel, `round(nearest, calc(var(--unit) * N), 1px)`, the way `'independent'` steps already did through `--unit-macro`. A step moves by less than a pixel at most, so expect no visible change beyond sharper alignment where horizontal padding used to land between pixels. The template's commented-out coupled example uses the same 15 multipliers and end of 32 as the new independent fluid scale. In SCSS, `$space-values` holds only the fluid map (it was the merge of both), and `$space-fixed-values`, `$space-numeric-end` and `$space-fixed-numeric-end` are new.

→ [customizing-spacing.md](customizing-spacing.md#independent-default)

**Colors are optional now.** Omit `colorSetup` entirely and the output holds nothing color-related: no `--{prefix}-*` custom properties, no `color-scheme` declaration, and no `.theme-light`/`.theme-dark` rules. For a project whose colors come from somewhere else, that was previously a palette you had to fill in to get `generate` to run at all, and then had to ignore.

Two things become yours when you leave it out. Declare `color-scheme` on `:root` yourself, matching the palette you do ship: it governs how the browser renders form controls, scrollbars and the canvas, so a `light dark` left behind over a light-only palette renders dark controls on light surfaces. And the theme switch goes with it, since `.theme-light`/`.theme-dark` only ever forced `color-scheme` for trimscale's own `light-dark()` tokens.

The rest of the system is unchanged either way: type scale, spacing, breakpoints, leading trim and every utility class work without a single color token.

→ [design-tokens.md#turning-colors-off](design-tokens.md#turning-colors-off)

**`.skip-link` is black on white, in literal values.** It read `var(--color-surface-base, #fff)` and `var(--color-text-primary, #000)`, which only ever resolved for a config that happened to use those two token names, and a project is free to name its tokens anything. If your palette does use them and you want the link themed, restyle the class in your own CSS:

```css
.skip-link {
  background: var(--color-surface-base);
  color: var(--color-text-primary);
}
```

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

**The one-off fluid function is called `fn.fluid-value`.**

| Was                           | Now              |
| ----------------------------- | ---------------- |
| `fn.get-fluid-clamp`          | `fn.fluid-value` |
| `$value-key` (third argument) | `$unit-key`      |

Neither half of the old name describes it. `get-` reads as a lookup in Sass, and `fn.get-fluid-clamp(8, 16, 'vwx', 'max')` emits `max()`, not `clamp()`. The new name matches the other three fluid functions, which carry no prefix and take `$unit-key`.

What it means: rename the calls. The arguments, their order and the output are unchanged, so a call that passed the unit positionally needs nothing else. The three scale-aware functions are wrappers around it, which is what makes all four round identically: `fn.fluid-value` rounds its rem values where `fn.get-fluid-clamp` left them at full precision. In trimscale's own output that moves one number, `--unit-macro`'s `0.1666666667rem` to `0.1667rem`, which the token's `round(…, 1px)` absorbs. In your own code it shortens the result by a few characters and shifts nothing visible.

→ [abstracts.md](abstracts.md)

**`fn.fluid-spacing` is gone, and a token replaces it.** It returned a fluid multiple of `fluidScale`'s base font-size, which is what `spacingSetup`'s `'coupled'` approach builds `--space-*` from. Under `'independent'`, the default, the tokens come from `--unit-micro` and `--unit-macro` instead, so the function's result matched no token in your output: `fn.fluid-spacing(4)` ran 16px to 20px, where `--space-4` runs 16px to 32px and `--space-fixed-4` is a static 16px.

What it means: write the multiple in CSS instead. `--fluid-base` is a token, so this needs no Sass and works the same in a project consuming the compiled CSS:

```css
/* was: padding: fn.fluid-spacing(12); */
padding: calc(var(--fluid-base) * 3);
```

The divisor is `spacingSetup.baseGridSize`, so a level of 12 on the default grid of 4 is three times the base. For a value that isn't a multiple of the base, use `fn.fluid-value` with the two pixel sizes you want.

`fn.fluid-space-step` stays. It reads its levels the same way, so under `'independent'` its result matches no `--space-*` token either, and [abstracts.md](abstracts.md) now says so. It is kept because a named, scale-anchored range is coming to the config and needs exactly that function, rewritten against the token model your config actually uses.

**Fluid tokens are no longer registered with `@property`.** That covers `--vwx`, `--fluid-base`, `--unit`, `--unit-macro`, every `--fs-*` and every fluid `--space-*`. A registered length is computed where it is declared, on `:root`, and a `vw` there doesn't match the `vw` the rest of the page sees: the spec exempts the root from the scrollbar adjustment every other element gets. In Chromium 145 to 152 with classic scrollbars (the Windows default) the scrollbar was subtracted twice instead, so every fluid token came out 1-2 % small in its fluid part. Left unregistered, a token resolves on the element that uses it. See [design-tokens.md](design-tokens.md#registered-and-unregistered-tokens) for which tokens are registered and why. Static tokens (`--unit-micro`, every `--space-fixed-*`, `--header-height`, font weights, line heights) stay registered.

What it means, in two places:

- A `transition` on a fluid token jumps instead of animating, since only registered properties interpolate.
- Reading a fluid token from `:root` in JavaScript returns its expression, not px: `getComputedStyle(document.documentElement).getPropertyValue('--fs-600')` gives `clamp(...)`. Read a real property off an element that uses the token instead, for example its `font-size`.

**`--vwx` caps smoothly on wide screens.** On a viewport at least `ultrawideHeightThresholdPx` tall (default `944`), `--vwx` is `min(1vw, 2vh)`. It used to switch from `1vw` to `2vh` at a 21:9 aspect ratio, and because the two differ by 14 % at that ratio, fluid sizes dropped in one step when a window was dragged across it.

What it means: nothing at 2:1 and narrower, and nothing at 21:9 and wider, where the output is the same as before. Between the two, fluid sizes are capped where they weren't, by up to 14 % just below 21:9. In a default config only the uncapped tokens (`--fs-800-uncapped`, `--fs-900-uncapped`) are affected, since everything clamped has already reached its max at those widths. The ratio is the new `ultrawideAspectRatio` key (default `2`, must be greater than 1).

→ [design-tokens.md#base-tokens](design-tokens.md#base-tokens)

### New

- **Opt out of the leading-trim fallback.** `leadingTrimFallback: false` on a family trims it in browsers with native `text-box-trim` only, and leaves normal leading in the rest, for a family whose `@font-face` isn't trimscale's to write and whose fallback trim therefore lands off. `appFonts.leadingTrimFallbackDefault` sets it for every family, and a family's own `leadingTrimFallback` wins. Default `true`, so a config that sets neither gets the same trim as before. See [adding-a-font.md](adding-a-font.md#opting-out-of-the-leading-trim-fallback).

### Fixed

- A numeric spacing scale ending at `0` generated two steps instead of none. Sass's `@for` counts down when its end is below its start, so `numericScaleMicroEnd: 0` emitted `--space-1` and `--space-0`, plus their utility classes. An end of `0` now generates nothing for that scale.
- `fluidScale.precision` had no effect on anything. It is required in the config, documented as the decimal places in generated `clamp()` values and written into the bridge file, but nothing read it: every fluid function rounded to a hardcoded 4. It governs all four now, so a config that set anything other than `4` gets different decimals after upgrading, and `--fs-*`, `--space-*` and `--unit-macro` move with it. `4` stays the default and the value to keep: rem at four decimals is already 0.0016px, and fewer decimals round the clamp endpoints rather than just the slope.

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
