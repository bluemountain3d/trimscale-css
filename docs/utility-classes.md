# Utility Classes

This page documents the *shape* of each utility class using the example config's names. For the exact classes **your own** `trimscale.config.ts` produces, generate writes a resolved reference to `<output.dir>/utility-classes.md`, see [getting-started.md](getting-started.md#generate).

## Opting out of utility classes

Every group documented below is on by default. If you write component SCSS
and never reach for `.p-md`/`.trim-text-body`/etc. in markup, or you
already have your own a11y classes, turn a group off in
`trimscale.config.ts`'s `output.utilities` field so `generate` stops
emitting it:

```ts
output: {
  utilities: {
    spacing: { numeric: false }, // keep t-shirt sizes, drop the 1-48 numeric scale
    typography: false,           // drop every typography utility class
    a11y: false,                 // you have your own sr-only/skip-link/etc.
  },
}
```

`utilities: false` is the shorthand for wanting none of them at all, the
same result as turning all three sections off by hand. Tokens, the reset and
the base element styles are unaffected.

`spacing`/`typography` each accept `true`/`false` for the whole section, or
an object turning off individual groups (`base`, `tShirt`, `numeric` for
spacing; `trim`, `family`, `size`, `lineHeight`, `weight`, `style`,
`textTransform`, `textAlign`, `numericFigures` for typography). Turning off
a section's top level also drops its small fixed classes, e.g.
`spacing: false` removes `.m-none`/`.mx-auto`/etc. too, not just the scale
loops. `a11y` is `true`/`false` only, not nestable, see
[Accessibility](#accessibility) below for why. See `models/Config.ts`'s
`UtilitiesConfig` for the exact shape.

These flags are about what you want in the file, not primarily about
size: at typical gzip ratios the utility classes are a small fraction of
the total, the real reasons are that component SCSS using the custom
properties directly never touches the classes at all (dead weight
regardless of size), and that a project with its own reset or a11y
classes doesn't want two competing sets in the cascade.

## Spacing

Pattern: `.{property}-{side?}-{size}`

- **Properties:** `m` (margin), `p` (padding)
- **Sides:** `t` (top), `r` (right), `b` (bottom), `l` (left), `x` (horizontal), `y` (vertical)
- **Sizes:** t-shirt (`3xs` to `9xl`) and numeric (`1` to `numericScaleEnd`/`numericScaleMacroEnd`, `48` by default), see [design-tokens.md](design-tokens.md#spacing-tokens)
- **Special:** `.m-none`, `.p-none`, `.mx-auto`, `.my-auto`, `.ml-auto`, `.mr-auto`

All directional sides map to **logical properties**, not physical ones: `t`/`b` use `margin-block-start`/`-end`, and `l`/`r` use `margin-inline-start`/`-end` (same for padding). In a left-to-right document this behaves like top/right/bottom/left, but `l`/`r` flip automatically in `dir="rtl"` content since they follow inline flow direction rather than a fixed side.

```html
<div class="p-md mt-lg mx-auto">…</div>
<div class="pt-3xl pb-xl px-md">…</div>
```

## Typography

Typography utility classes from `_typography-utilities.scss`. They form the **HTML-level API** for the typography system, compose them in markup to apply font roles, sizes, weights, and alignment without writing any SCSS.

`.trim-text-*` and `.font-family-*` both require `appFonts` to be configured, they're generated per font role, so a config with none produces neither class, regardless of the `output.utilities.typography.trim`/`family` flags (see [adding-a-font.md](adding-a-font.md)). Everything else on this page works with or without fonts.

### One class per role you define

**These classes exist per key in `appFonts.fontRoles`, not as a fixed set.** The table below lists the roles `FontRoles` in [`models/Config.ts`](../models/Config.ts) knows by name, but you only get a class for a role you actually assign a family to. `primary` and `body` are required, the other ten are optional, and the config `init` copies into your project starts with `primary` and `body` filled in and the rest commented out. So a fresh install produces two `.trim-text-*` classes, not twelve, until you uncomment the roles you want.

Custom role names work too: any key you add beyond this list gets the same treatment, so `brand: 'Some Family'` produces `.trim-text-brand` and `--font-family-brand`.

For the exact classes _your_ config produces, read `<output.dir>/utility-classes.md` rather than this table, `generate` writes it against your real config.

**Trim text**, applies a font-family, leading-trim metrics (margins + pseudo-element formulas), and a bare `font-size`/`line-height` baseline (`1em`, the inherited size, / `--line-height-dynamic`) for a font role. Weight, style, letter-spacing, and text-transform are left unset, pair it with the plain `.{property}-*` classes below (or use `font-setup` when authoring components) for role-specific sizing or anything beyond the baseline:

| Class                   | Role                   | In the config     |
| ----------------------- | ---------------------- | ----------------- |
| `.trim-text-primary`    | Primary brand typeface | Required          |
| `.trim-text-body`       | Body text context      | Required          |
| `.trim-text-secondary`  | Secondary typeface     | Optional          |
| `.trim-text-tertiary`   | Tertiary typeface      | Optional          |
| `.trim-text-display`    | Display / hero context | Optional          |
| `.trim-text-heading`    | Heading context        | Optional          |
| `.trim-text-subheading` | Subheading context     | Optional          |
| `.trim-text-decorative` | Decorative context     | Optional          |
| `.trim-text-quote`      | Blockquote context     | Optional          |
| `.trim-text-code`       | Code / pre context     | Optional          |
| `.trim-text-ui`         | UI elements context    | Optional          |
| `.trim-text-mono`       | Monospace category     | Optional          |

Apply `.trim-text-*` to a `<span>` nested inside the element you are styling,
not to that element itself, and put the size class on the same span. Two
separate things sit behind that rule.

First, pseudo-elements. The fallback path (browsers without native
`text-box-trim`) uses the element's own `::before`/`::after`. `@layer trim`
sits before `layouts`, `components` and `utilities` in the layer order, so
anything you write in those layers, or outside layers entirely, wins over the
trim's declarations. That ordering is deliberate, your CSS is supposed to beat
the design system's, and the trim's pseudo-elements are not an exception to
it. Your declarations replace the trim's on every property you set, while the
trim's remaining declarations (`display: table`, the negative margin) still
apply to your content, so neither your pseudo-element nor the trim survives
intact.

That collision is invisible in a browser with native `text-box-trim`. There
the trim uses no pseudo-elements at all, yours behave exactly as they would if
the trim system were absent, and the page looks right. Check the trim in an
engine without native support before shipping.

`display` works the same way. The fallback spacers need the trim's own
`display: flow-root` box, so a `display: block`, `flex` or `grid` of your own
on the trimmed element breaks the trim on the fallback path while leaving the
native path untouched.

Second, size. `.trim-text-*` carries `font-size: 1em`, so it renders at
whatever size it inherits. A size class on an ancestor does not reach it,
which is why `.font-size-*` belongs on the same element as `.trim-text-*`
rather than on the wrapper. The same holds when authoring components:
`font-setup`'s `$font-size`, and any `font-size` you write by hand, land in
your rule's own layer and override the baseline there.

`%text-geometry` sets `display: flow-root`, so the span stops
being inline, intentional, but worth knowing if you're expecting inline flow.

`.trim-text-*` is emitted into `@layer trim`, not `@layer utilities`, so its
font-size baseline loses to `.font-size-*` and to element defaults like
`small { font-size: 0.875em }`, while its font-family and trim metrics beat
element defaults and stay paired with each other. See
[cascade-layers.md](cascade-layers.md#why-the-trim-system-straddles-base).

Combining `.trim-text-*` with `.font-family-*` is the one case where the two
come apart: `.font-family-*` sets only `font-family` and sits in `utilities`,
above both trim layers, so `class="trim-text-body font-family-mono"` renders
in the mono typeface while still trimmed by the body typeface's metrics. That
is the documented purpose of `.font-family-*`, but it means the pair is worth
reaching for deliberately rather than by habit. If you want the mono face
trimmed correctly, use `.trim-text-mono`.

```html
<h1>
  <span class="trim-text-heading font-size-heading-1">Sized heading</span>
</h1>
```

**Font family**, sets only `font-family`, nothing else; use this to swap typeface without touching size/line-height/trim. Same one-per-defined-role rule as `.trim-text-*` above:
`.font-family-primary`, `.font-family-body`, `.font-family-secondary`, `.font-family-tertiary`, `.font-family-display`, `.font-family-heading`, `.font-family-subheading`, `.font-family-decorative`, `.font-family-quote`, `.font-family-code`, `.font-family-ui`, `.font-family-mono`

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

**Numeric figures:**
`.num-{lining|oldstyle|ordinal}-{tabular|proportional}` (six classes total, e.g. `.num-oldstyle-proportional`). Sets `font-variant-numeric`. `lining` figures sit on the baseline at a uniform height, the default in most fonts and generally the better fit for UI/tabular data; `oldstyle` figures vary in height (some descend below the baseline), often preferred in running prose; `ordinal` enables ordinal-indicator glyph variants (1st, 2nd). `tabular`/`proportional` picks whether digits share one fixed width (so they align in columns) or keep their natural proportional widths.

```html
<h1 class="font-size-heading-1 font-weight-bold">
  <span class="trim-text-heading">Page heading</span>
</h1>
<p class="font-size-text-base">
  <span class="trim-text-body">Body copy.</span>
</p>
```

## Accessibility

Screen-reader and focus utilities from `_a11y-utilities.scss`. Toggled as a whole via `output.utilities.a11y`, `true`/`false` only, not nestable like `spacing`/`typography`: `.sr-only-focusable` and `.aria-live-*` both `@extend .sr-only`, so turning off just `.sr-only` while keeping the others would leave an `@extend` pointing at a class the compile never emitted, a hard Sass error rather than a missing utility. Turning it off is for a project that already has its own screen-reader/focus/live-region classes and doesn't want two competing sets in the cascade, not primarily a size decision.

| Class                                        | Effect                                                                                                                                      |
| --------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| `.sr-only`                                    | Visually hides an element while keeping it in the accessibility tree (the standard clip-based screen-reader-only pattern).                  |
| `.sr-only-focusable`                          | Same as `.sr-only`, but becomes visible once focused. For skip links and similar "hidden until you tab to it" content.                      |
| `.focus-none`                                 | Removes the focus outline. Use with caution, only when pairing it with your own visible focus indicator.                                    |
| `.focus-visible`                              | Adds a visible outline on `:focus-visible` (keyboard/programmatic focus, not a mouse click).                                                 |
| `.skip-link`                                  | Positions an element off-screen until it receives focus, then slides it into view at the top-left. Pair with `.sr-only-focusable`'s pattern. |
| `.aria-live-polite`, `.aria-live-assertive`   | Visually hidden live-region containers (same styling as `.sr-only`). Pair with a matching `aria-live` attribute for announcements screen readers pick up without moving focus. |

```html
<a href="#main" class="skip-link">Skip to main content</a>
<div class="aria-live-polite" aria-live="polite">Saved.</div>
```

`.skip-link` uses `z-index: var(--z-skip-link, 9999)`, no z-index scale is shipped for anything else, layering is a design-system decision outside this package's scope. Set `--z-skip-link` yourself if `9999` ever collides with something in your own stacking context.
