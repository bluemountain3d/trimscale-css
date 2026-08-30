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

No `@font-face` is generated for a `manual` family, load the font however that CDN normally expects, trimscale only needs the numbers to compute leading-trim and side-bearing adjustments.

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

This extracts (or, for `manual`, takes as-is) five metric values, avg-char-width, top-trim, bottom-trim, lsb-adjust, and rsb-adjust, normalized to em units, and writes them into `styles/abstracts/variables/_font-metrics.scss` alongside each family's resolved `family` value. It writes `@font-face` rules into `styles/base/_fonts.scss` per the table above (omitting the file, and un-forwarding it from `styles/base/_index.scss`, if nothing ended up needing one), and regenerates `styles/abstracts/variables/_typography.scss` from `fontRoles`.

`lsb-adjust`/`rsb-adjust` (side bearing adjustments) remove the optical whitespace font designers build into a typeface's side bearings, so text sits flush against its container without manual negative margins at every use site.

## Verification

After generating, check three things:

1. **Compile without errors.** Run your project's dev server and confirm no SCSS errors. (Working inside this repo itself instead, see [devDocs/styleguide.md](../devDocs/styleguide.md).)
2. **Leading trim is working.** Open a heading in the browser and inspect the element. If your browser supports `text-box-trim` natively (most current ones do), that's applied directly, DevTools' Computed panel should show `text-box-trim: trim-both`, no `::before`/`::after` pseudo-elements are involved and their absence isn't a failure, this path doesn't even depend on trimscale's own metrics, the browser reads the font file itself. Without native support (or with it force-disabled in DevTools), trimscale falls back to `::before`/`::after` instead, those should have negative `margin-bottom` values, if they both show `0`, the role in `fontRoles` doesn't resolve to a family that has metrics, double check the family name matches the key you used in `appFonts.fonts`.
3. **Side bearings look right.** View a large display heading. The first letter's left edge should sit close to flush with the container.

## Quick checklist

- [ ] Family added to `appFonts.fonts` with the right `source` (`local`/`cdn`/`manual`)
- [ ] `local`: font file(s) placed at the configured `path`(s)
- [ ] `cdn`: `url`(s) point at real font files, not a CSS-generating endpoint
- [ ] `manual`: metrics copied from precisionspec.dev's **TrimScale** export
- [ ] Fallback set (or relying on `fallbackDefault`)
- [ ] Family mapped to at least one role in `fontRoles`
- [ ] Ran `npx trimscale-css generate`
- [ ] Dev server compiles without errors
- [ ] Native `text-box-trim` applied (DevTools Computed panel), or, without support, `::before`/`::after` pseudo-elements have non-zero margins
