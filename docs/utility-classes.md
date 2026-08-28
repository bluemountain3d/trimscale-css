# Utility Classes

## Spacing

Pattern: `.{property}-{side?}-{size}`

- **Properties:** `m` (margin), `p` (padding)
- **Sides:** `t` (top), `r` (right), `b` (bottom), `l` (left), `x` (horizontal), `y` (vertical)
- **Sizes:** t-shirt (`3xs` to `9xl`) and numeric (`1` to `48`), see [design-tokens.md](design-tokens.md#spacing-tokens)
- **Special:** `.m-none`, `.p-none`, `.mx-auto`, `.my-auto`, `.ml-auto`, `.mr-auto`

All directional sides map to **logical properties**, not physical ones: `t`/`b` use `margin-block-start`/`-end`, and `l`/`r` use `margin-inline-start`/`-end` (same for padding). In a left-to-right document this behaves like top/right/bottom/left, but `l`/`r` flip automatically in `dir="rtl"` content since they follow inline flow direction rather than a fixed side.

```html
<div class="p-md mt-lg mx-auto">…</div>
<div class="pt-3xl pb-xl px-md">…</div>
```

## Gap

Pattern: `.gap-{size}`, using t-shirt and numeric scales.

```html
<div class="flex gap-md">…</div>
```

## Typography

Typography utility classes from `_typography-utilities.scss`. They form the **HTML-level API** for the typography system, compose them in markup to apply font roles, sizes, weights, and alignment without writing any SCSS.

**Trim text**, applies a font-family, leading-trim metrics (margins + pseudo-element formulas), and a bare `font-size`/`line-height` baseline (`--text-base` / `--line-height-dynamic`) for a font role. Weight, style, letter-spacing, and text-transform are left unset, pair it with the plain `.{property}-*` classes below (or use `fontSetup` when authoring components) for role-specific sizing or anything beyond the baseline:

| Class                  | Role                   |
| ---------------------- | ---------------------- |
| `.trim-text-primary`   | Primary brand typeface |
| `.trim-text-secondary` | Secondary typeface     |
| `.trim-text-tertiary`  | Tertiary typeface      |
| `.trim-text-sans`      | Sans-serif category    |
| `.trim-text-serif`     | Serif category         |
| `.trim-text-mono`      | Monospace category     |
| `.trim-text-display`   | Display / hero context |
| `.trim-text-heading`   | Heading context        |
| `.trim-text-subheading`| Subheading context     |
| `.trim-text-body`      | Body text context      |
| `.trim-text-quote`     | Blockquote context     |
| `.trim-text-code`      | Code / pre context     |
| `.trim-text-ui`        | UI elements context    |

```html
<h1 class="trim-text-heading font-size-heading-1">Sized heading</h1>
```

**Font family**, sets only `font-family`, nothing else; use this to swap typeface without touching size/line-height/trim:
`.font-family-primary`, `.font-family-secondary`, `.font-family-tertiary`, `.font-family-sans`, `.font-family-serif`, `.font-family-mono`, `.font-family-display`, `.font-family-heading`, `.font-family-subheading`, `.font-family-body`, `.font-family-quote`, `.font-family-code`, `.font-family-ui`

**Font size:**
`.font-size-*`, `display-1`, `display-2`, `heading-1` through `heading-4`, `text-lg`, `text-md`, `text-base`, `text-sm`, `text-xs`

**Font weight:**
`.font-weight-*`, `thin` through `black` (thin, extralight, light, normal, medium, semibold, bold, extrabold, black)

**Line height:**
`.line-height-*`, `100` through `200` (steps of 5, e.g. `150` = 1.5), plus `.line-height-dynamic` (the self-scaling default)

**Font style:**
`.font-style-*`, `normal`, `italic`, `oblique`

**Text transform:**
`.text-transform-*`, `capitalize`, `uppercase`, `lowercase`

**Text alignment:** `.text-align-left`, `.text-align-center`, `.text-align-right`

**Text color:** `.text-color-inherit` only, unlike font roles, color token names aren't a contract enforced anywhere else in the system, so fixed `.text-color-*` classes would risk going silently dead the moment a project renames its color tokens. Add your own next to your project's palette.

```html
<h1
  class="trim-text-heading font-size-heading-1 font-weight-bold">
  Page heading
</h1>
<p class="trim-text-body font-size-text-base" style="color: var(--color-text-muted);">
  Body copy in muted tone.
</p>
```
