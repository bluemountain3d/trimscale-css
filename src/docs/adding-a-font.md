# Adding a Font

This guide covers every step needed to integrate a new typeface into trimscale-css — from extracting font metrics to assigning the font to roles in the system.

## Overview

Four files are always involved. A fifth is optional if you want to swap an existing role:

| File                                                                                                    | What you do there                                 |
| ------------------------------------------------------------------------------------------------------- | ------------------------------------------------- |
| [`src/styles/abstracts/variables/_font-metrics.scss`](../styles/abstracts/variables/_font-metrics.scss) | Add the raw metrics entry                         |
| [`src/styles/base/_fonts.scss`](../styles/base/_fonts.scss)                                             | Add `@font-face` declarations                     |
| [`src/styles/abstracts/variables/_typography.scss`](../styles/abstracts/variables/_typography.scss)     | Assign the font to one or more roles |

---

## Step 1 — Extract the font metrics

The metrics database requires nine values per font. Use [precisionspec.dev](https://precisionspec.dev) to extract them:

1. Drag and drop your font file (TTF, OTF, WOFF, or WOFF2) onto the interface drop-zone.
   > Note! It is often best to get metrics from the regular font.
2. Inspect the metric tables and SVG diagrams to verify the values look correct.
3. Export as **SCSS Map** and copy the values directly into `$font-metrics`.

The SCSS Map export includes all nine required normalized values: cap-height, x-height, ascender, descender, avg-char-width, top-trim, bottom-trim, lsb-adjust, and rsb-adjust.

### Side bearing adjustments

`lsb-adjust` and `rsb-adjust` remove the optical whitespace that font designers build into a typeface's side bearings. They let text sit flush against its container without manual negative margins at every use site.

precisionspec.dev calculates these from the font's glyph data directly as an average of the most commonly used small letters. If you need to adjust them by eye after import, they are typically small negative values (`−0.04em` to `−0.09em`) and matter most at large display sizes.

Existing fonts in the system for reference:

| Font         | `lsb-adjust` | `rsb-adjust` |
| ------------ | ------------ | ------------ |
| Roboto       | −0.061       | −0.0547      |
| Roboto Serif | −0.046       | −0.032       |
| Roboto Mono  | −0.0859      | −0.0669      |
| Inter        | −0.0645      | −0.0615      |

---

## Step 2 — Add the metrics entry

Open [`_font-metrics.scss`](../styles/abstracts/variables/_font-metrics.scss) and add a new entry to the `$font-metrics` map. The key must exactly match the font family name you'll use in `@font-face`.

```scss
$font-metrics: (
  // ... existing fonts ...
  'Source Sans 3': (
      'family': '"Source Sans 3", "Source Sans 3 Variable", sans-serif',
      'category': 'sans-serif',
      'cap-height': 0.66,
      'x-height': 0.486,
      'ascender': 0.984,
      'descender': 0.273,
      'avg-char-width': 0.558,
      'top-trim': 0.324,
      'bottom-trim': 0.273,
      'lsb-adjust': -0.052,
      'rsb-adjust': -0.041,
    )
) !default;
```

**Rules:**

- The map key (`"Source Sans 3"`) is the canonical name used internally — it must match exactly what `_typography.scss` will reference.
- The `"family"` value is the CSS `font-family` stack — quote the font name and add a generic fallback.
- All metric values are unitless ratios (em fractions). Do not add units here; the leading-trim system appends `em` where needed.

---

## Step 3 — Add `@font-face` declarations

Open [`_fonts.scss`](../styles/base/_fonts.scss) and add one declaration per style variant you're loading. For a variable font (covers all weights in one file):

```scss
// Source Sans 3
@font-face {
  font-family: 'Source Sans 3';
  src: url('/fonts/SourceSans3-VariableFont_wght.woff2') format('woff2');
  font-weight: 100 900;
  font-display: swap;
}

@font-face {
  font-family: 'Source Sans 3';
  src: url('/fonts/SourceSans3-Italic-VariableFont_wght.woff2') format('woff2');
  font-weight: 100 900;
  font-style: italic;
  font-display: swap;
}
```

For a static font with separate weight files, add one block per weight:

```scss
@font-face {
  font-family: 'Source Sans 3';
  src: url('/fonts/SourceSans3-Regular.woff2') format('woff2');
  font-weight: 400;
  font-display: swap;
}
```

The `font-family` string must be identical to the map key in `_font-metrics.scss`.

Place font files in your project's public fonts directory. The path in `src:` should match wherever your build tool serves static assets from.

---

## Step 4 — Assign the font to a role

Open [`_typography.scss`](../styles/abstracts/variables/_typography.scss) and update the `$fonts` map. This step is required — `tokens/_leading-trim.scss` looks up font metrics by role name, so a font that isn't mapped to at least one role will have no trim values applied.

```scss
$fonts: (
  // Hierarchical
  'primary': 'Roboto',
  'secondary': 'Source Sans 3',
  // changed from Roboto Serif
  'tertiary': 'Roboto Mono',

  // Contextual
  'body': 'Source Sans 3',
  // changed
  'heading': 'Source Sans 3',
  // changed
   // ... rest unchanged
) !default;
```

The map value must match the key in `$font-metrics` exactly. After this change, any call to `fontSetup($font: 'secondary')` or `fontSetup($font: 'body')` will automatically use the new font with its correct metrics.

You do not need to touch `_leading-trim.scss` or `_mx_font-setup.scss` — the system reads the metrics from the map at compile time.

---

## Verification

After all changes, check three things:

1. **Compile without errors** — run the dev server (`cd styleguide && npm run dev`) and confirm no SCSS errors.
2. **Leading trim is working** — open a heading in the browser and inspect the element. The `::before` and `::after` pseudo-elements should have negative `margin-bottom` values. If they both show `0`, the font key in `$fonts` doesn't match the key in `$font-metrics`.
3. **Side bearings look right** — view a large display heading. The first letter's left edge should sit flush with the container. If there's a visible gap, decrease `lsb-adjust` (make it more negative) by increments of `0.005`.

---

## Quick checklist

- [ ] Metrics entry added to `$font-metrics` with the correct map key
- [ ] `"family"` string includes a generic fallback (`sans-serif`, `serif`, or `monospace`)
- [ ] `top-trim` = `ascender − cap-height`
- [ ] `bottom-trim` = `descender`
- [ ] `@font-face` added in `_fonts.scss` with a matching `font-family` string
- [ ] Font files are present in the public fonts directory
- [ ] Role mapped in `$fonts` (required — leading-trim depends on it)
- [ ] Dev server compiles without errors
- [ ] `::before`/`::after` pseudo-elements have non-zero margins at runtime
