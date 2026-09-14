# Adding a Font

`appFonts` is optional, a config with none of it still gets the full fluid type scale, spacing, breakpoints, and color tokens, see [getting-started.md](getting-started.md#initialize). This guide covers adding a font to a config that has none yet, which works the same as adding an additional one to a config that already has some.

Font metrics, `@font-face` declarations, and role assignment are generated from `appFonts.families` in [`trimscale.config.ts`](../templates/trimscale.config.ts). Each entry is a family name mapped to a `source`, which decides where its metrics (and, if applicable, its `@font-face` rules) come from.

**Scope: metric extraction and leading trim assume alphabetic scripts.** The metrics are read from Latin glyphs. `avgCharWidth` is a frequency-weighted average over lowercase a-z and space, the side-bearing adjustments sample `aehilmnors` (`BDEHILNORS` on an all-caps font), and the trim values come from cap height against the typographic ascender and descender. A file without enough of those characters is refused with an error, but a family that bundles a Latin subset alongside another script, as many CJK families do, passes and gets metrics describing only that subset. Use [`source: 'manual'`](#source-manual) for a script these measurements don't fit.

## Choose a source

| `source` | Metrics come from                                                 | Writes `@font-face`?                               | Use when...                                                                                                                    |
| -------- | ----------------------------------------------------------------- | -------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `local`  | A font file in your project, read by fontkit                      | Yes, unless `nextFont` resolves `true`             | You have the font file (self-hosted)                                                                                           |
| `cdn`    | A font file fetched from a URL, read by fontkit                   | Only if `generateFontFace: true` (default `false`) | You reference a CDN's font file directly, but usually load it some other way (a `<link>` tag, `next/font/google`, a JS loader) |
| `manual` | Hand-entered, from [precisionspec.dev](https://precisionspec.dev) | Never                                              | The font isn't downloadable at all (a CDN that only serves it through its own script/API, no raw file URL)                     |

## `source: 'local'`

```ts
appFonts: {
  defaultFallback: 'sans-serif',
  families: {
    'Roboto': {
      source: 'local',
      path: [
        'path/to/fonts/Roboto-Regular.woff2',
        'path/to/fonts/Roboto-Bold.woff2',
        'path/to/fonts/Roboto-Italic.woff2',
      ], // relative to trimscale.config.ts
      fallback: 'sans-serif', // optional, falls back to defaultFallback
    },
  },
},
```

`path` accepts one file (a single weight, or a variable font covering a whole `wght` range) or several (separate files per weight/style, each becoming its own `@font-face` rule). If several files are listed, metrics are extracted from whichever one is closest to non-italic weight 400: non-italic always wins over italic, and among files with the same italic-ness, whichever weight is closest to 400/Regular wins. A family with only an Italic file still gets metrics from it.

The family name is always the config key (`'Roboto'` above), not whatever the font file's own internal name table says, that's what makes `manual` families able to have a name at all despite having no file to read one from.

**The generated `@font-face` `src: url(...)` is root-relative** (relative to `process.cwd()`, i.e. wherever `trimscale.config.ts` lives), never relative to `output.dir` or to whichever stylesheet actually `@use`s the generated bridge file. Sass doesn't rebase `url()` values to the partial they came from, so a root-relative path is the only form that resolves the same regardless of where in your SCSS tree it ends up.

That's enough for **dev**, where Vite serves the whole project root. For a **production build** to also work, the font file needs to exist at that exact path in the built output, which only happens automatically for files under your bundler's static-passthrough folder (Vite/CRA/Astro: `public/`, SvelteKit: `static/`), copied verbatim to the site root, folder name stripped. trimscale knows this via `appFonts.publicDir` (default `'public'`, only change it if your bundler uses a different name): when a font file's `path` starts with that folder, trimscale strips it from the generated `src` too, matching what your bundler actually does:

```ts
appFonts: {
  // publicDir: 'public', // default, only set if your bundler's folder is named differently
  families: {
    'Roboto': {
      source: 'local',
      path: ['./public/fonts/Roboto-Regular.woff2'], // → src: url("/fonts/Roboto-Regular.woff2")
      fallback: 'sans-serif',
    },
  },
},
```

`path`/`localFontsPath` are the location trimscale reads the file from (for metrics extraction), relative to `trimscale.config.ts`. `publicDir` only affects the generated `src`, stripping that leading segment when present. A font file that lives outside `publicDir` still gets a root-relative `src`, which resolves correctly in dev but isn't guaranteed to after a production build. Move it under `publicDir` for that.

### Auto-discovery via `localFontsPath`

`path` is optional. If `appFonts.localFontsPath` is set (a folder relative to `trimscale.config.ts`), any `local` family that omits `path` looks for its files under `localFontsPath/<the config key>/` instead, non-recursive. Every font file found there (`.ttf`/`.otf`/`.woff`/`.woff2`) is picked up, same as if you'd listed them in `path`:

```ts
appFonts: {
  localFontsPath: './fonts',
  defaultFallback: 'sans-serif',
  families: {
    'Roboto': { source: 'local', fallback: 'sans-serif' }, // reads every font file in ./fonts/Roboto/
  },
},
```

The subfolder must be named exactly like the config key, not the font file's internal name, same rule as above: `Roboto`'s files live in `./fonts/Roboto/` regardless of what the file's own name table says. Case counts, even though your filesystem may not: Windows and macOS open `./fonts/roboto/` for a `Roboto` key without complaint, and the `src` in the generated `@font-face` would then 404 the moment it's served from a case-sensitive host. `generate` follows the folder's own spelling and warns, so the URL is right on both, but rename one of the two to match and the warning goes away. A family can still set its own `path` to opt out of the convention (e.g. a font that lives outside `localFontsPath`, or under a differently-named folder), `path`, when set, always wins over the convention.

If neither `path` nor a matching `localFontsPath` subfolder turns up any files, `generate` fails with an error naming the family and the folder it looked in, rather than silently skipping it.

## `source: 'cdn'`

```ts
'Open Sans': {
  source: 'cdn',
  url: ['https://fonts.gstatic.com/s/opensans/v40/....woff2'],
  fallback: 'sans-serif',
  // generateFontFace: true,  // only if you want trimscale to self-host via this URL directly
},
```

`url` must point at the actual font file, not a CSS-generating endpoint. Google Fonts' `fonts.googleapis.com/css2?family=...` URL, for example, isn't a font file, it's a stylesheet that in turn lists several real file URLs (one per weight, sometimes per subset), and which files it returns depends on the request's `User-Agent`. Open it in a browser, or check the developer tools' Network tab, and copy the actual `fonts.gstatic.com/...` URL(s) from inside it.

### Picking the right Google Fonts URL

That stylesheet holds one `@font-face` block per subset, and **you want the one commented `/* latin */`**. Take any other and you get a file with no basic lowercase in it at all: `latin-ext` covers Ā-ž, `cyrillic` covers а-я, and so on. Google's own CSS keeps them apart with `unicode-range`, so the browser only reaches for each file when a page actually uses those characters.

1. Open the CSS URL in a browser:

   ```
   https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400..900;1,400..900&display=swap
   ```

2. The browser shows the CSS itself. Find the `@font-face` that is under `/* latin */` **and** has `font-style: normal`. Asking for `ital,wght` gives you an italic block and an upright one per subset, both commented `/* latin */`. Google groups every italic block first and then repeats the subsets upright, so the one you want is the last block in the whole response:

   ```css
   /* latin */
   @font-face {
     font-family: 'Playfair Display';
     font-style: normal;
     font-weight: 400 900;
     font-display: swap;
     src: url(https://fonts.gstatic.com/s/playfairdisplay/v40/nuFiD-vYSZviVYUb_rj3ij__anPXDTzYgA.woff2) format('woff2');
     unicode-range: U+0000-00FF, U+0131, U+0152-0153, /* … */;
   }
   ```

3. Copy what's **between the parentheses** of that block's `src: url(...)`, the bare address and nothing else. Not the `url(` and `)` around it, and not the ` format('woff2')` after it:

   ```ts
   url: ['https://fonts.gstatic.com/s/playfairdisplay/v40/nuFiD-vYSZviVYUb_rj3ij__anPXDTzYgA.woff2'],
   ```

   Want the italic file too? Add it as a second entry in the same `url` array. `generate` reads every file listed, keeps the upright one for metrics (italic side bearings would skew the trim) and writes an `@font-face` per file when `generateFontFace` is on.

Two things make the wrong pick easy to miss. `latin-ext` sits directly above `latin` in each group and looks equally plausible. And trimscale writes no `unicode-range` of its own, so the browser tries your file for every character on the page, finds nothing, and falls back per character: the text still renders, in the metric-matched fallback font at its `size-adjust`, which looks like the right font drawn slightly too small rather than like an error.

`generate` refuses a file it can't read the basic Latin characters out of, naming this as the likely cause, so you'll hear about it either way. If you'd rather not think about subsets at all, download the family from [fonts.google.com](https://fonts.google.com), keep the files in your own project and use `source: 'local'`: those files are complete.

The file is fetched once and cached under `.trimscale-cache/fonts/` (gitignored, safe regardless of the font's license since nothing is redistributed, it never leaves your machine and is never committed), subsequent `generate` runs reuse the cached copy instead of re-fetching.

By default no `@font-face` is written, `cdn` only extracts metrics, on the assumption the font is already loaded some other way (a `<link>` tag, `next/font/google`, a CDN's JS loader). Set `generateFontFace: true` if you actually want trimscale to self-host by writing `@font-face` rules pointing at `url` directly.

Same caveat as `manual`: without `generateFontFace: true`, your config key must match that other loader's declared `font-family`, not the font file's own name (see below).

## `source: 'manual'`

For a font whose file trimscale can't read at all, most commonly a CDN that only serves it through its own delivery mechanism with no downloadable file (Adobe Fonts/Typekit is the typical case):

```ts
'proxima-nova': {
  source: 'manual',
  fallback: 'sans-serif',
  metrics: {
    // Required: what leading trim and side-bearing correction read
    avgCharWidth: 0.452,
    topTrim: 0.123,
    bottomTrim: 0.21,
    lsbAdjust: -0.061,
    rsbAdjust: -0.06,
    // Required for a { matched } fallback, optional otherwise:
    ascender: 0.79,
    descender: 0.21,
    lineGap: 0,
  },
},
```

Get these values from [precisionspec.dev](https://precisionspec.dev): drop the font file in there (even if you can't use that file directly in your project, e.g. a Typekit sync font downloaded just for measurement), open **Export Metrics**, and use the **TrimScale** tab, it outputs exactly this shape, ready to paste into `metrics`.

precisionspec.dev needs an actual font file to read, not just a family name. If you don't have direct download access (e.g. a locked CDN font), check whether the foundry offers a free trial/demo version, that's usually enough for measurement purposes since only the metrics tables matter, not the full character set or license.

No `@font-face` is generated for a `manual` family, load the font however that CDN normally expects, trimscale only needs the numbers to compute leading-trim and side-bearing adjustments.

**The config key must match what's actually loaded, not the font file's own name.** `@font-face`'s `font-family` value is arbitrary, matching is a plain string comparison against whichever `@font-face` rule is actually in effect, never the font file's internal name table. Since `manual` writes no `@font-face` at all, that rule comes entirely from the CDN's own script/stylesheet, trimscale has no say in it. If nothing renders despite metrics looking correct, check DevTools' Computed panel (or the CDN's own injected CSS) for the real `font-family` string in use, and match your config key to that, not to whatever the raw font file calls itself internally.

### When trimmed text sits low in one browser but not another

**A `manual` family can render its trimmed text low inside a box that is nonetheless the right height, in browsers without native `text-box-trim`.** The fallback path removes `(1lh - 1em) / 2` from each end, which assumes the content area is exactly 1em, and the `ascent-override`/`descent-override` pair that guarantees that only exists in an `@font-face` rule trimscale writes. A `manual` family has none, so the browser uses whatever ascender and descender the loaded font declares. Where those overflow the em, the total amount trimmed stays correct, which is why the box height still looks right, and only the split between top and bottom goes wrong.

The check takes a few seconds: open the same page in a browser with native `text-box-trim`. That path reads cap height and baseline straight out of the font and ignores `topTrim`/`bottomTrim` entirely, so text sitting correctly there tells you your metrics describe the loaded font accurately and the difference lies in the fallback's assumption, not in your config.

This is the one case `generate` can't warn about, for the reason in the table below: the ascender and descender a browser reads come from the font's `usWin` and `hhea` tables, and a `manual` family exists precisely because that file isn't there to read them from. Measure it in the browser instead, in the one showing the problem, since the numbers are whatever that engine reads:

```js
const family = 'proxima-nova' // the font family name
const configAscender = 0.79 // this family's `ascender`, as precisionspec reported it
const size = 1000

await document.fonts.load(`400 ${size}px "${family}"`, 'H')
const ctx = document.createElement('canvas').getContext('2d')
ctx.font = `400 ${size}px "${family}"`

const { fontBoundingBoxAscent, fontBoundingBoxDescent } = ctx.measureText('H')
const A = fontBoundingBoxAscent / size
const D = fontBoundingBoxDescent / size

;(1 - (A + D)) / 2 + (A - configAscender) // the offset, in em
```

Adding that offset to `topTrim` and subtracting it from `bottomTrim` puts the split back where it belongs. The sum is unchanged, so the box height is too, and the native path never reads either value, so browsers that have it are unaffected. Keep both results positive: a negative trim value is silently flipped rather than rejected.

Whether that edit is worth making depends on your traffic. The two tables it corrects for are read per platform, Windows engines taking one and macOS the other, so one pair of numbers can only ever be right for one of them, and the edit that squares a font on Windows can introduce the same offset on macOS. Weigh it against how much of your audience is still on the fallback path at all.

## Font metric overrides

Every `@font-face` trimscale writes carries `ascent-override` and `descent-override`, pinning that font's content area to exactly 1em. This is automatic and has no config option: it's what makes leading trim land where it should.

A font file declares its vertical size three separate times, in three tables, and the values often disagree. Which one a browser reads isn't up to the font: with the OS/2 `USE_TYPO_METRICS` flag set it reads the typographic metrics everywhere, and with the flag clear Windows reads `usWin` while macOS reads `hhea`. Leading trim is calculated from the typographic metrics, so on a font that leaves the flag clear and whose tables disagree, the browser and the trim measure the same font differently and the text sits low inside a correctly sized box. Measured across 3793 Google Fonts files, roughly one family in nine is affected, Roboto among them, by up to a fifth of an em. The overrides settle the question so the platform can't answer it differently.

Two consequences worth knowing:

- Text in that font that isn't leading-trimmed also gets the 1em content area. `line-height: normal` resolves to `1`, and inline boxes are shorter than they would otherwise be.
- Native `text-box-trim` never needed this. It reads cap height and baseline straight from the font, so it was always correct. The overrides matter for the fallback path, in browsers without native support.

### When trimscale can't write them

The overrides can only go in an `@font-face` rule trimscale writes itself, which means `local` families and `cdn` families with `generateFontFace: true`. For every other family the rule belongs to someone else, and `generate` warns when that costs enough to see, naming the two values and the edit that applies them:

| Family | Way out |
| ------ | ------- |
| `cdn`, loaded via your own `<link>` | Set `generateFontFace: true` and let trimscale write the rule |
| `next/font/local` | Pass the values through `localFont()`'s `declarations` option, see [using-with-nextjs.md](using-with-nextjs.md#step-5-metric-overrides-if-generate-asked-for-them) |
| `next/font/google` | No hook exists. Load the family's files yourself instead, see [using-with-nextjs.md](using-with-nextjs.md#nextfontgoogle) |
| `manual` | Not detectable, the file trimscale would have read isn't there. Add the overrides to whatever rule does load the font, or see [when trimmed text sits low in one browser but not another](#when-trimmed-text-sits-low-in-one-browser-but-not-another) if that rule isn't yours to edit |

The warning stays silent below a hundredth of an em, which covers the large majority of fonts. It fires on the measured error, not on the flag: two thirds of the fonts that leave `USE_TYPO_METRICS` clear have tables that agree closely enough to cost nothing.

## Metric-matched fallback fonts (`fallback: { matched }`)

When a web font is still loading, the browser renders text in a fallback font first, then swaps once the web font arrives. If the fallback's metrics differ from the web font's, that swap shifts the layout (CLS): lines break in different places, the page jumps.

The `{ matched }` form of `fallback` fixes this by generating a metric-matched `@font-face` override for a real system font, which stands in for your web font until it loads:

```ts
'Roboto': {
  source: 'local',
  path: ['path/to/fonts/Roboto-Regular.woff2'],
  fallback: { matched: 'sans-serif' }, // a MatchableFallbackChain
},
```

This writes a `"Roboto Fallback"` `@font-face` (`src: local("Segoe UI")`, with `size-adjust`/`ascent-override`/`descent-override`/`line-gap-override` computed from Roboto's own metrics) and produces `font-family: "Roboto", "Roboto Fallback"`. Until Roboto loads, the browser substitutes Segoe UI's actual glyphs but scaled and boxed to occupy the same space Roboto would have.

**Note what the stack does not contain: a generic keyword.** A generic needs no loading, so it is available the instant the real font isn't, which means a generic standing behind `"Roboto Fallback"` wins the swap window every time and the metric matching renders in the one moment it exists for, which is to say never. That is why the two forms of `fallback` are alternatives rather than layers, and why `next/font` builds its own fallbacks the same way. What covers the platforms instead is the chain, see below.

### Single family, chain, or your own array

`matched` accepts three shapes:

- **A `MatchableFallbackChain`** (`'sans-serif'`, `'serif'`, or `'monospace'`), **the recommended default.** Expands to an ordered list of system fonts covering Windows/macOS/Android; trimscale writes one `@font-face` per family in the chain, all sharing the same `font-family` name, and the browser tries each in order until it finds one actually installed on the user's system. No manual curation needed.
- **A single `MatchableFallbackFamily`** (e.g. `'Arial'`), when you want precise control over exactly one target, or know your audience is on a single platform.
- **Your own `MatchableFallbackFamily[]`**, when you want the multi-platform technique above but a different family list or order than the built-in chains.

The built-in chains:

| Chain | Families (in order) |
| --- | --- |
| `'sans-serif'` | Segoe UI, Arial, Helvetica, Helvetica Neue, Roboto |
| `'serif'` | Times New Roman, Georgia, Noto Serif |
| `'monospace'` | Consolas, Menlo, Courier New |

All 11 concrete families with built-in metrics: Arial, Helvetica, Helvetica Neue, Times New Roman, Georgia, Noto Serif, Courier New, Consolas, Menlo, Segoe UI, Roboto. Generic keywords (`system-ui`, `cursive`, or any `FontFallbacks` value) can't be used inside `matched`, they have no metrics to match against; write them as a plain `fallback` instead.

### The two forms of `fallback`

They solve the same problem at different levels of precision, and you pick one:

| | `fallback: 'sans-serif'` | `fallback: { matched: 'sans-serif' }` |
| --- | --- | --- |
| What it names | A CSS generic keyword | Concrete system fonts with known metrics |
| Generated stack | `"Roboto", sans-serif` | `"Roboto", "Roboto Fallback"` |
| During font-swap | Whatever sans-serif the system has, unmatched, so the swap shifts the layout | Glyphs scaled and boxed to occupy Roboto's space, so the swap is close to invisible |

A generic keyword can't carry a metric override, there's no concrete font to point `local()` at, which is the whole reason the two forms exist.

**Where `{ matched }` degrades:** if none of its `@font-face` entries resolve, e.g. Linux, where none of the 11 built-in families is typically installed, the browser falls through to its own default font rather than to the generic category you would otherwise have named. Prefer a chain over a single family for this reason: a chain gives the browser three chances instead of one. If that last-resort category matters more to you than matching the metrics, use the plain form.

**Where the two get confused:** setting `fallback: 'serif'` on a family expecting it to sit behind a metric-matched override is exactly what the union prevents. There is one field, so only one of the two can be expressed at a time.

### Requirements

Extracted `local`/`cdn` metrics always include what's needed automatically. For `manual`, add three extra fields to `metrics` (on top of the five described above) or `{ matched }` is ignored with a console warning, and the family falls back to `defaultFallback`:

```ts
'proxima-nova': {
  source: 'manual',
  fallback: { matched: 'sans-serif' },
  metrics: {
    avgCharWidth: 0.452,
    topTrim: 0.123,
    bottomTrim: 0.21,
    lsbAdjust: -0.061,
    rsbAdjust: -0.06,
    // Required only for a { matched } fallback:
    ascender: 0.79,
    descender: 0.21,
    lineGap: 0,
  },
},
```

precisionspec.dev's **TrimScale** export includes these three as an optional block.

## Map to roles

Whatever the source, a family only becomes usable once it's mapped to at least one role in `appFonts.fontRoles`:

```ts
appFonts: {
  // ...families, etc.
  fontRoles: {
    primary: 'Roboto',
    secondary: 'Roboto Serif',
    tertiary: 'Roboto Mono',
    mono: 'Roboto Mono',
    display: 'Roboto Serif',
    heading: 'Roboto',
    subheading: 'Roboto',
    body: 'Roboto',
    quote: 'Roboto Serif',
    code: 'Roboto Mono',
    ui: 'Roboto',
    // Custom roles work too:
    // ink: 'Some Font Family Name',
  },
},
```

`primary` and `body` are required, everything else, including custom roles via the index signature, is optional. A family present in `appFonts.families` but not mapped to any role still generates metrics but never gets a `--font-family-*` token or shows up in `font-setup`/`.trim-text-*`.

## Generate

```bash
npx trimscale-css generate
```

This extracts (or, for `manual`, takes as-is) five metric values, avg-char-width, top-trim, bottom-trim, lsb-adjust, and rsb-adjust, normalized to em units (plus ascender/descender/line-gap for `local`/`cdn`, or if supplied for `manual`), plus one metric-matched fallback `@font-face` per `{ matched }` entry, if any, and passes all of it, along with each family's resolved `family` value, `@font-face` rules per the table above, and role assignments from `appFonts.fontRoles`, as SCSS values into the generated bridge file at `<output.dir>/_index.scss`. Nothing is written into the package's own `styles/` folder in `node_modules`.

`lsb-adjust`/`rsb-adjust` (side bearing adjustments) remove the optical whitespace font designers build into a typeface's side bearings, so text sits flush against its container without manual negative margins at every use site.

## Verification

After generating, check three things:

1. **Compile without errors.** Run your project's dev server and confirm no SCSS errors.
2. **Leading trim is working.** Open a heading in the browser and inspect the element. If your browser supports `text-box-trim` natively (Baseline since August 2026, so any current browser does, though a real visitor on an older version may not), that's applied directly, DevTools' Computed panel should show `text-box-trim: trim-both`, no `::before`/`::after` pseudo-elements are involved and their absence isn't a failure, this path doesn't even depend on trimscale's own metrics, the browser reads the font file itself. Without native support (or with it force-disabled in DevTools), trimscale falls back to `::before`/`::after` instead, those should have negative `margin-bottom` values, if they both show `0`, the role in `appFonts.fontRoles` doesn't resolve to a family that has metrics, double check the family name matches the key you used in `appFonts.families`.
3. **Side bearings look right.** View a large display heading. The first letter's left edge should sit close to flush with the container.

## Quick checklist

- [ ] Family added to `appFonts.families` with the right `source` (`local`/`cdn`/`manual`)
- [ ] `local`: font file(s) placed at the configured `path`(s), or under `localFontsPath/<family key>/` if `path` is omitted, and, for a production build, under `appFonts.publicDir` (default `'public'`), not just `src/`
- [ ] `cdn`: `url`(s) point at real font files, not a CSS-generating endpoint
- [ ] `manual`: metrics copied from precisionspec.dev's **TrimScale** export
- [ ] Fallback set (or relying on `defaultFallback`)
- [ ] `fallback: { matched }` used if you want metric-matched font-swap (optional; `manual` needs `ascender`/`descender`/`lineGap` added to `metrics` for it to take effect)
- [ ] Family mapped to at least one role in `appFonts.fontRoles`
- [ ] Ran `npx trimscale-css generate`
- [ ] Dev server compiles without errors
- [ ] Native `text-box-trim` applied (DevTools Computed panel), or, without support, `::before`/`::after` pseudo-elements have non-zero margins
