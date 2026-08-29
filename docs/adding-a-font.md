# Adding a Font

Font metrics, `@font-face` declarations, and role assignment are all generated automatically from your actual font files, there's no metrics database to hand-edit. This guide covers the three things you still do yourself: place the font file, configure it, and assign it to roles.

## Overview

| Step | File                                                                                          | What you do there                                                           |
| ---- | --------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| 1    | Your fonts directory (`appFonts.fontPath` in [`trimscale.config.ts`](../trimscale.config.ts)) | Add the font file                                                           |
| 2    | Set fallback (`appFonts.fallbacks` in [`trimscale.config.ts`](../trimscale.config.ts))        | Add a fallback (optional) and map it to one or more `fontRoles`             |
| 3    | Run `npx trimscale-css generate`                                                              | Extracts metrics via fontkit, writes `_font-metrics.scss` and `_fonts.scss` |

## Step 1: Add the font file

Drop the font file (TTF, OTF, WOFF, or WOFF2) into the directory configured as `appFonts.fontPath`:

```ts
appFonts: {
  fontPath: 'path/to/fonts/', // relative to trimscale config file, e.g. ./fonts/ or ../assets/fonts/
  // ...
},
```

For a family with multiple weights or an italic variant, add all the files, the generator scans the whole directory. If several files resolve to the same family name (e.g. separate Regular/Italic, or a variable font's upright + italic pair), it automatically picks one to extract metrics from: non-italic always wins over italic, and among files with the same italic-ness, whichever weight is closest to 400/Regular wins. A family with only an Italic file still gets metrics from it.

## Step 2: Configure the family

Add a fallback stack entry if the font's generic category isn't covered by `defaultFallback`:

```ts
appFonts: {
  fontPath: 'path/to/fonts/',
  fallbacks: {
    'Roboto': 'sans-serif',
    'Roboto Serif': 'serif',
    'Roboto Mono': 'monospace',
  },
  defaultFallback: 'sans-serif',
},
```

The key must match the font's family name exactly as embedded in the file (what a browser or font inspector would show you). Valid fallback values: `'sans-serif'`, `'serif'`, `'monospace'`, `'system-ui'`, `'cursive'`.

Then map the family to one or more roles in `fontRoles`:

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

`primary` and `body` are required, everything else, including custom roles via the index signature, is optional. This step is what makes a font usable, a font that's in your fonts directory but not mapped to any role generates metrics but never gets a `--font-family-*` token or shows up in `fontSetup`/`.trim-text-*`.

## Step 3: Generate

```bash
npx trimscale-css generate
```

This extracts five metric values (avg-char-width, top-trim, bottom-trim, lsb-adjust, and rsb-adjust) directly from the font file via fontkit and writes them, normalized to em units, into `styles/abstracts/variables/_font-metrics.scss`, alongside the `family` value. Cap-height, ascender, and descender are read from the font too, but only as intermediate values used to compute `top-trim`/`bottom-trim`, they aren't stored in the output themselves. It also writes `@font-face` rules into `styles/base/_fonts.scss` (unless `appFonts.nextFont` is true, see [using-with-nextjs.md](using-with-nextjs.md)) and regenerates `styles/abstracts/variables/_typography.scss` from `fontRoles`.

`lsb-adjust`/`rsb-adjust` (side bearing adjustments) remove the optical whitespace font designers build into a typeface's side bearings, so text sits flush against its container without manual negative margins at every use site. These are computed automatically as an average of commonly used lowercase letters, no manual tuning needed.

## Verification

After generating, check three things:

1. **Compile without errors.** Run your project's dev server and confirm no SCSS errors. (Working inside this repo itself instead, see [devDocs/styleguide.md](../devDocs/styleguide.md).)
2. **Leading trim is working.** Open a heading in the browser and inspect the element. The `::before`/`::after` pseudo-elements should have negative `margin-bottom` values. If they both show `0`, the role in `fontRoles` doesn't resolve to a family that has metrics, double check the family name matches exactly what's in the font file.
3. **Side bearings look right.** View a large display heading. The first letter's left edge should sit flush with the container.

## Quick checklist

- [ ] Font file placed in the directory set by `appFonts.fontPath`
- [ ] Fallback added to `appFonts.fallbacks` if the family's category isn't covered by `defaultFallback`
- [ ] Family mapped to at least one role in `fontRoles` (required if it should actually be usable)
- [ ] Ran `npx trimscale-css generate`
- [ ] Dev server compiles without errors
- [ ] `::before`/`::after` pseudo-elements have non-zero margins at runtime
