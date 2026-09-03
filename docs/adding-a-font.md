# Adding a Font

Font metrics, `@font-face` declarations, and role assignment are generated from `appFonts.fonts` in [`trimscale.config.ts`](../trimscale.config.ts). Each entry is a family name mapped to a `source`, which decides where its metrics (and, if applicable, its `@font-face` rules) come from.

## Choose a source

| `source` | Metrics come from                                                 | Writes `@font-face`?                               | Use when...                                                                                                                    |
| -------- | ----------------------------------------------------------------- | -------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `local`  | A font file in your project, read by fontkit                      | Yes, unless `nextFont` resolves `true`             | You have the font file (self-hosted)                                                                                           |
| `cdn`    | A font file fetched from a URL, read by fontkit                   | Only if `generateFontFace: true` (default `false`) | You reference a CDN's font file directly, but usually load it some other way (a `<link>` tag, `next/font/google`, a JS loader) |
| `manual` | Hand-entered, from [precisionspec.dev](https://precisionspec.dev) | Never                                              | The font isn't downloadable at all (a CDN that only serves it through its own script/API, no raw file URL)                     |

## `source: 'local'`

```ts
appFonts: {
  fallbackDefault: 'sans-serif',
  fonts: {
    'Roboto': {
      source: 'local',
      path: [
        'path/to/fonts/Roboto-Regular.woff2',
        'path/to/fonts/Roboto-Bold.woff2',
        'path/to/fonts/Roboto-Italic.woff2',
      ], // relative to trimscale.config.ts
      fallback: 'sans-serif', // optional, falls back to fallbackDefault
    },
  },
},
```

`path` accepts one file (a single weight, or a variable font covering a whole `wght` range) or several (separate files per weight/style, each becoming its own `@font-face` rule). If several files are listed, metrics are extracted from whichever one is closest to non-italic weight 400: non-italic always wins over italic, and among files with the same italic-ness, whichever weight is closest to 400/Regular wins. A family with only an Italic file still gets metrics from it.

The family name is always the config key (`'Roboto'` above), not whatever the font file's own internal name table says, that's what makes `manual` families able to have a name at all despite having no file to read one from.

### Auto-discovery via `localFontsPath`

`path` is optional. If `appFonts.localFontsPath` is set (a folder relative to `trimscale.config.ts`), any `local` family that omits `path` looks for its files under `localFontsPath/<the config key>/` instead, non-recursive. Every font file found there (`.ttf`/`.otf`/`.woff`/`.woff2`) is picked up, same as if you'd listed them in `path`:

```ts
appFonts: {
  localFontsPath: './fonts',
  fallbackDefault: 'sans-serif',
  fonts: {
    'Roboto': { source: 'local', fallback: 'sans-serif' }, // reads every font file in ./fonts/Roboto/
  },
},
```

The subfolder must be named exactly like the config key, not the font file's internal name, same rule as above: `Roboto`'s files live in `./fonts/Roboto/` regardless of what the file's own name table says. A family can still set its own `path` to opt out of the convention (e.g. a font that lives outside `localFontsPath`, or under a differently-named folder), `path`, when set, always wins over the convention.

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

The file is fetched once and cached under `.trimscale-cache/fonts/` (gitignored, safe regardless of the font's license since nothing is redistributed, it never leaves your machine and is never committed), subsequent `generate` runs reuse the cached copy instead of re-fetching.

By default no `@font-face` is written, `cdn` only extracts metrics, on the assumption the font is already loaded some other way (a `<link>` tag, `next/font/google`, a CDN's JS loader). Set `generateFontFace: true` if you actually want trimscale to self-host by writing `@font-face` rules pointing at `url` directly.

Same caveat as `manual`: without `generateFontFace: true`, your config key must match that other loader's declared `font-family`, not the font file's own name (see below).

## `source: 'manual'`

For a font whose file trimscale can't read at all, most commonly a CDN that only serves it through its own delivery mechanism with no downloadable file (Adobe Fonts/Typekit is the typical case):

```ts
'Proxima Nova': {
  source: 'manual',
  fallback: 'sans-serif',
  metrics: {
    avgCharWidth: 0.558,
    topTrim: 0.123,
    bottomTrim: 0.21,
    lsbAdjust: -0.061,
    rsbAdjust: -0.06,
  },
},
```

Get these five values from [precisionspec.dev](https://precisionspec.dev): drop the font file in there (even if you can't use that file directly in your project, e.g. a Typekit sync font downloaded just for measurement), open **Export Metrics**, and use the **TrimScale** tab, it outputs exactly this shape, ready to paste into `metrics`.

precisionspec.dev needs an actual font file to read, not just a family name. If you don't have direct download access (e.g. a locked CDN font), check whether the foundry offers a free trial/demo version, that's usually enough for measurement purposes since only the metrics tables matter, not the full character set or license.

No `@font-face` is generated for a `manual` family, load the font however that CDN normally expects, trimscale only needs the numbers to compute leading-trim and side-bearing adjustments.

**The config key must match what's actually loaded, not the font file's own name.** `@font-face`'s `font-family` value is arbitrary, matching is a plain string comparison against whichever `@font-face` rule is actually in effect, never the font file's internal name table. Since `manual` writes no `@font-face` at all, that rule comes entirely from the CDN's own script/stylesheet, trimscale has no say in it. If nothing renders despite metrics looking correct, check DevTools' Computed panel (or the CDN's own injected CSS) for the real `font-family` string in use, and match your config key to that, not to whatever the raw font file calls itself internally.

## Metric-matched fallback fonts (`fallbackFamily`)

When a web font is still loading, the browser renders text in a fallback font first, then swaps once the web font arrives. If the fallback's metrics differ from the web font's, that swap shifts the layout (CLS): lines break in different places, the page jumps.

`fallbackFamily` fixes this by generating a metric-matched `@font-face` override for a real system font, inserted between your web font and the generic `fallback` in the `font-family` stack:

```ts
'Roboto': {
  source: 'local',
  path: ['path/to/fonts/Roboto-Regular.woff2'],
  fallback: 'sans-serif',
  fallbackFamily: 'sans-serif', // a MatchableFallbackChain
},
```

This writes a `"Roboto Fallback"` `@font-face` (`src: local("Segoe UI")`, with `size-adjust`/`ascent-override`/`descent-override`/`line-gap-override` computed from Roboto's own metrics) and produces `font-family: "Roboto", "Roboto Fallback", sans-serif`. Until Roboto loads, the browser substitutes Segoe UI's actual glyphs but scaled and boxed to occupy the same space Roboto would have.

### Single family, chain, or your own array

`fallbackFamily` accepts three shapes:

- **A `MatchableFallbackChain`** (`'sans-serif'`, `'serif'`, or `'monospace'`) — **the recommended default.** Expands to an ordered list of system fonts covering Windows/macOS/Android; trimscale writes one `@font-face` per family in the chain, all sharing the same `font-family` name, and the browser tries each in order until it finds one actually installed on the user's system. No manual curation needed.
- **A single `MatchableFallbackFamily`** (e.g. `'Arial'`) — when you want precise control over exactly one target, or know your audience is on a single platform.
- **Your own `MatchableFallbackFamily[]`** — when you want the multi-platform technique above but a different family list or order than the built-in chains.

The built-in chains:

| Chain | Families (in order) |
| --- | --- |
| `'sans-serif'` | Segoe UI, Arial, Helvetica, Helvetica Neue, Roboto |
| `'serif'` | Times New Roman, Georgia, Noto Serif |
| `'monospace'` | Consolas, Menlo, Courier New |

All 11 concrete families with built-in metrics: Arial, Helvetica, Helvetica Neue, Times New Roman, Georgia, Noto Serif, Courier New, Consolas, Menlo, Segoe UI, Roboto. Generic keywords (`system-ui`, `cursive`, or a `FontFallbacks` value) can't be used here, only `fallback` accepts those, see below.

### `fallbackFamily` vs. plain `fallback`: two different things

Don't confuse the two:

- **`fallbackFamily`** targets *concrete* system fonts with real, known metrics, so trimscale can compute a matching override. It's a metric-matching mechanism.
- **`fallback`** is the plain CSS generic keyword (`sans-serif`, `serif`, etc.) at the very end of the stack. It's just a keyword, the browser resolves it to *whatever* sans-serif font that system has, with **no way to attach a metric override to a generic keyword** — there's no concrete font to point `local()` at.

`fallback` is always the last resort: if `fallbackFamily` is unset, or if none of its `@font-face` entries resolve (e.g. Linux, where none of the 11 built-in families is typically installed by default), the stack silently falls through to the plain, unmatched `fallback` keyword — same CLS exposure as not using `fallbackFamily` at all. That's an acceptable, expected degradation, not a bug: `fallbackFamily` improves the common case (Windows/macOS/Android) without requiring universal coverage.

### Requirements

Extracted `local`/`cdn` metrics always include what's needed automatically. For `manual`, add three extra fields to `metrics` (on top of the five described above) or `fallbackFamily` is ignored with a console warning:

```ts
'Proxima Nova': {
  source: 'manual',
  fallback: 'sans-serif',
  fallbackFamily: 'sans-serif',
  metrics: {
    avgCharWidth: 0.558,
    topTrim: 0.123,
    bottomTrim: 0.21,
    lsbAdjust: -0.061,
    rsbAdjust: -0.06,
    // Required only for fallbackFamily:
    ascender: 0.924,
    descender: 0.287,
    lineGap: 0,
  },
},
```

precisionspec.dev's **TrimScale** export includes these three as an optional block.

## Map to roles

Whatever the source, a family only becomes usable once it's mapped to at least one role in `fontRoles`:

```ts
fontRoles: {
  primary: 'Roboto',
  secondary: 'Roboto Serif',
  tertiary: 'Roboto Mono',
  sans: 'Roboto',
  serif: 'Roboto Serif',
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
```

`primary` and `body` are required, everything else, including custom roles via the index signature, is optional. A family present in `appFonts.fonts` but not mapped to any role still generates metrics but never gets a `--font-family-*` token or shows up in `font-setup`/`.trim-text-*`.

## Generate

```bash
npx trimscale-css generate
```

This extracts (or, for `manual`, takes as-is) five metric values, avg-char-width, top-trim, bottom-trim, lsb-adjust, and rsb-adjust, normalized to em units (plus ascender/descender/line-gap for `local`/`cdn`, or if supplied for `manual`), and writes them into `styles/abstracts/variables/_font-metrics.scss` alongside each family's resolved `family` value. It writes `@font-face` rules into `styles/base/_fonts.scss` per the table above (omitting the file, and un-forwarding it from `styles/base/_index.scss`, if nothing ended up needing one) plus one metric-matched fallback `@font-face` per `fallbackFamily` entry, if any, and regenerates `styles/abstracts/variables/_typography.scss` from `fontRoles`.

`lsb-adjust`/`rsb-adjust` (side bearing adjustments) remove the optical whitespace font designers build into a typeface's side bearings, so text sits flush against its container without manual negative margins at every use site.

## Verification

After generating, check three things:

1. **Compile without errors.** Run your project's dev server and confirm no SCSS errors. (Working inside this repo itself instead, see [devDocs/styleguide.md](../devDocs/styleguide.md).)
2. **Leading trim is working.** Open a heading in the browser and inspect the element. If your browser supports `text-box-trim` natively (most current ones do), that's applied directly, DevTools' Computed panel should show `text-box-trim: trim-both`, no `::before`/`::after` pseudo-elements are involved and their absence isn't a failure, this path doesn't even depend on trimscale's own metrics, the browser reads the font file itself. Without native support (or with it force-disabled in DevTools), trimscale falls back to `::before`/`::after` instead, those should have negative `margin-bottom` values, if they both show `0`, the role in `fontRoles` doesn't resolve to a family that has metrics, double check the family name matches the key you used in `appFonts.fonts`.
3. **Side bearings look right.** View a large display heading. The first letter's left edge should sit close to flush with the container.

## Quick checklist

- [ ] Family added to `appFonts.fonts` with the right `source` (`local`/`cdn`/`manual`)
- [ ] `local`: font file(s) placed at the configured `path`(s), or under `localFontsPath/<family key>/` if `path` is omitted
- [ ] `cdn`: `url`(s) point at real font files, not a CSS-generating endpoint
- [ ] `manual`: metrics copied from precisionspec.dev's **TrimScale** export
- [ ] Fallback set (or relying on `fallbackDefault`)
- [ ] `fallbackFamily` set if you want metric-matched font-swap (optional; `manual` needs `ascender`/`descender`/`lineGap` added to `metrics` for it to take effect)
- [ ] Family mapped to at least one role in `fontRoles`
- [ ] Ran `npx trimscale-css generate`
- [ ] Dev server compiles without errors
- [ ] Native `text-box-trim` applied (DevTools Computed panel), or, without support, `::before`/`::after` pseudo-elements have non-zero margins
