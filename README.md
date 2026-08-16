# trimscale-css

A framework-agnostic SCSS design system with fluid typography, leading-trim precision, and OKLCH color tokens.

---

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Usage](#usage)
  - [Global Import](#global-import)
  - [Component-Scoped Import](#component-scoped-import)
- [Design Tokens](#design-tokens)
  - [Base Tokens](#base-tokens)
  - [Spacing Tokens](#spacing-tokens)
  - [Typography Tokens](#typography-tokens)
  - [Color Tokens](#color-tokens)
- [Abstracts](#abstracts)
  - [Functions](#functions)
  - [Mixins](#mixins)
  - [Breakpoints](#breakpoints)
- [Utility Classes](#utility-classes)
- [Components](#components)
- [Styleguide](#styleguide)
- [Customization](#customization)

---

## Overview

trimscale-css is built around three core ideas:

1. **Fluid typography:** font sizes and spacing scale continuously across viewports using `clamp()`. No breakpoint jumps.
2. **Leading-trim precision:** removes excess vertical whitespace above and below text using font metrics, giving you true cap-height-to-baseline control.
3. **OKLCH color tokens:** perceptually uniform colors with automatic light/dark mode switching via the CSS `light-dark()` function.

The system is pure SCSS. It generates CSS custom properties, utility classes, and base styles. No JavaScript required for styles.

---

## Features

- Fluid typography using a modular scale — Minor Third (1.2×) at 360 px expanding to Perfect Fourth (1.333×) at 1440 px by default, tunable per project
- Spacing on a fixed `--unit-micro` grid step plus a `--unit-macro` grid that scales 4 px → 8 px with the viewport, both snapped to whole pixels
- Leading-trim via CSS pseudo-elements, with a progressive enhancement to native `text-box-trim` where supported
- OKLCH color system with semantic tokens for surfaces, text, accent, and action states
- Light/dark mode via `prefers-color-scheme`, no JavaScript required
- Modern responsive breakpoints using CSS range syntax (`width <`, `width >=`)
- Semantic (t-shirt sizes) and numeric (1–48) spacing scales
- Framework-agnostic, works with any JS framework or plain HTML

---

## Project Structure

```
trimscale-css/
├── src/styles/
│   ├── trimscale.scss              # Main entry point
│   ├── abstracts/
│   │   ├── variables/              # Breakpoints, colors, font metrics, scale config
│   │   ├── functions/              # Fluid size calc, OKLCH helpers, unit utils
│   │   └── mixins/                 # fontSetup, breakpoints, spacing system
│   ├── tokens/                     # CSS custom properties
│   │   ├── _base-tokens.scss       # --fluid-base, --unit-micro/-macro, --vwx
│   │   ├── _spacing-tokens.scss    # --space-* (t-shirt + 1–48 numeric)
│   │   ├── _typography-tokens.scss # --fs-100 to --fs-900, font families, weights
│   │   ├── _color-tokens.scss      # OKLCH colors with light-dark()
│   │   └── _leading-trim.scss      # %text-properties placeholder selectors
│   ├── base/                       # HTML defaults: reset, fonts, typography, a11y
│   ├── utilities/                  # Spacing, gap, text, and layout utility classes
│   └── components/                 # Global component styles (e.g. text-box)
└── styleguide/                     # Vite dev app for visual testing
```

---

## Getting Started

The system is consumed as SCSS source. Add the `src/styles` directory to your project and configure your SCSS compiler with its load path.

**Vite + sass-embedded:**

```ts
// vite.config.ts
export default {
  css: {
    preprocessorOptions: {
      scss: {
        loadPaths: ['path/to/trimscale-css/src'],
      },
    },
  },
};
```

**Next.js:** see [using-with-nextjs.md](src/docs/using-with-nextjs.md) for the full setup, including `next/font` integration and the required changes to `_font-metrics.scss`.

---

## Usage

### Global Import

Import once at your app's entry point to load all tokens, base styles, and utility classes:

```scss
@use 'styles/trimscale';
```

This single import includes:

- All CSS custom property tokens
- HTML element defaults and reset
- Utility classes (spacing, gap, text, layout)

### Component-Scoped Import

For component styles that need mixins, functions, or token variables without re-emitting global CSS:

```scss
@use 'styles/abstracts/variables' as var;
@use 'styles/abstracts/functions' as fn;
@use 'styles/abstracts/mixins' as mx;
@use 'styles/tokens/leading-trim' as *;

.card {
  @include mx.fontSetup($font: 'body', $font-size: var(--text-md));
  padding: var(--space-md);
  gap: var(--space-lg);

  @media #{var.$bp-tablet-and-up} {
    padding: var(--space-xl);
  }
}
```

---

## Design Tokens

All tokens are CSS custom properties scoped to `:root`.

### Base Tokens

| Token             | Description                                                                                                                                 |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| `--vwx`           | Adaptive viewport unit. `1vw` normally; switches to `2vh` on ultrawide screens (≥ 21:9 ratio + ≥ 944 px height, `$ultrawide-threshold-px`) to prevent runaway scaling |
| `--fluid-base`    | Base font size. Scales from `16px` at 360 px viewport to `20px` at 1440 px using `clamp()`                                                  |
| `--unit-micro`    | Base spacing unit for small steps — fixed at `$base-grid-size` (default `4`), not fluid. Always a whole pixel                               |
| `--unit-macro`    | Base spacing unit for large steps, an independent fluid clamp (`getFluidClamp(4, 8)`), rounded to the nearest pixel. Scales 4 px → 8 px      |
| `--header-height` | Global header height: `2.75rem + var(--space-3xl)`                                                                                          |

There is no single `--unit` token anymore; it was split into `--unit-micro` and `--unit-macro`. See [Spacing Tokens](#spacing-tokens) for which sizes use which.

### Spacing Tokens

Spacing tokens are multiples of `--unit-micro` or `--unit-macro`. `--unit-micro` is fixed, so sizes built from it are fixed too; `--unit-macro` is a fluid clamp, so sizes built from it scale with the viewport. Both units are `4px` at their minimum, so the table below is accurate for all sizes at the low end — only the macro-based sizes grow from there:

- `--space-3xs` through `--space-md` (and `--space-1` through `--space-6`) use `--unit-micro` — fixed at `4px` (`$base-grid-size`), no viewport scaling.
- `--space-lg` through `--space-9xl` (and `--space-7` through `--space-48`) use `--unit-macro`, which grows fluidly and tops out at `8px` — so large spacing grows with the viewport while small spacing stays put, rather than everything scaling off one shared unit.

**T-shirt sizes:**

| Token         | Multiplier | Base value (at 16 px) |
| ------------- | ---------- | --------------------- |
| `--space-3xs` | × 1        | 4 px                  |
| `--space-2xs` | × 2        | 8 px                  |
| `--space-xs`  | × 3        | 12 px                 |
| `--space-sm`  | × 4        | 16 px                 |
| `--space-md`  | × 5        | 20 px                 |
| `--space-lg`  | × 6        | 24 px                 |
| `--space-xl`  | × 8        | 32 px                 |
| `--space-2xl` | × 12       | 48 px                 |
| `--space-3xl` | × 16       | 64 px                 |
| `--space-4xl` | × 20       | 80 px                 |
| `--space-5xl` | × 24       | 96 px                 |
| `--space-6xl` | × 28       | 112 px                |
| `--space-7xl` | × 32       | 128 px                |
| `--space-8xl` | × 40       | 160 px                |
| `--space-9xl` | × 48       | 192 px                |

**Numeric scale:** `--space-1` through `--space-48`. `--space-1` through `--space-6` equal `calc(var(--unit-micro) * N)`; `--space-7` through `--space-48` equal `calc(var(--unit-macro) * N)`.

### Typography Tokens

**Modular scale levels,** all computed with `clamp()` from Minor Third at mobile to Perfect Fourth at desktop by default. Like the color palette, this is a starting configuration in `$fluid-scale` (`_fluid-scale.scss`), not a fixed characteristic of the system — the ratios, base sizes, and viewport range are all meant to be tuned per project. See [customizing-type-scale.md](src/docs/customizing-type-scale.md).

| Token      | Scale step | Role                             |
| ---------- | ---------- | -------------------------------- |
| `--fs-100` | −2         | Smallest (legal, captions)       |
| `--fs-200` | −1         | Small (secondary info, metadata) |
| `--fs-300` | 0          | Base font size                   |
| `--fs-400` | +1         | Emphasized text                  |
| `--fs-500` | +2         | Small heading                    |
| `--fs-600` | +3         | Medium heading                   |
| `--fs-700` | +4         | Large heading                    |
| `--fs-800` | +5         | Extra large heading              |
| `--fs-900` | +6         | Display heading                  |

**Semantic size aliases:**

| Token         | Value                                                               |
| ------------- | ------------------------------------------------------------------- |
| `--display-1` | `--fs-900`                                                          |
| `--display-2` | `--fs-800`                                                          |
| `--heading-1` | `--fs-700`                                                          |
| `--heading-2` | `--fs-600`                                                          |
| `--heading-3` | `--fs-500`                                                          |
| `--heading-4` | `--fs-400`                                                          |
| `--text-lg`   | `--fs-400`                                                          |
| `--text-md`   | `fluidFontSize(0.5)`, a half-step between `--fs-300` and `--fs-400` |
| `--text-base` | `--fs-300`                                                          |
| `--text-sm`   | `--fs-300 × 0.875`                                                  |
| `--text-xs`   | `--fs-300 × 0.75`                                                   |

The `text-*` tokens intentionally do not follow the modular scale below base. Using the scale steps `--fs-200` and `--fs-100` for body text variants would shrink too aggressively — at mobile with the default 1.2 ratio, `--fs-200` is already ~13 px and `--fs-100` ~11 px. Instead, `--text-sm` and `--text-xs` are gentle fractions of `--text-base`, giving you predictable and readable small text. The `--fs-100` and `--fs-200` tokens remain available for cases where that level of size contrast is genuinely needed, such as legal disclaimers or dense data tables.

**Font families:**

| Token                     | Description             |
| ------------------------- | ----------------------- |
| `--font-family-primary`   | Primary brand typeface  |
| `--font-family-secondary` | Secondary typeface      |
| `--font-family-tertiary`  | Tertiary typeface       |
| `--font-family-sans`      | Sans-serif stack        |
| `--font-family-serif`     | Serif stack             |
| `--font-family-mono`      | Monospace stack         |
| `--font-family-display`   | Display / headline font |
| `--font-family-heading`   | Heading font            |
| `--font-family-body`      | Body text font          |
| `--font-family-quote`     | Blockquote font         |
| `--font-family-code`      | Code / pre font         |
| `--font-family-ui`        | UI elements font        |

**Font weights:** `--font-weight-thin` (100) through `--font-weight-black` (900).

**Line heights:** `--line-height-100` through `--line-height-200`, named by value × 100, stored as `<length>` in `em` (e.g. `--line-height-150` = `1.5em`). All steps of 0.05 are defined.

These static tokens are opt-in. By default, text styled through `fontSetup` or any `%*-text` placeholder gets a *dynamic*, self-scaling line-height instead — computed once by the `dynamic-line-height()` Sass function (see [Functions](#functions)) and exposed as the `--line-height-dynamic` token, unless you pass an explicit `$line-height` to `fontSetup` or a `--line-height-*` token.

### Color Tokens

The token *names* below (`surface-base`, `accent`, `text-muted`, etc.) are the stable, semantic part of the system — the actual color values are just a starter palette in `$color-tokens` (`_colors.scss`) and are meant to be replaced per project, not treated as brand colors. See [Mixins](#mixins) for how to swap them.

Colors use `light-dark()` for automatic theme switching driven by `prefers-color-scheme`. You can override the automatic detection by adding a class to `:root`:

```html
<html class="theme-light">
  <!-- force light -->
  <html class="theme-dark">
    <!-- force dark -->
  </html>
</html>
```

| Token                                      | Description                            |
| ------------------------------------------ | -------------------------------------- |
| `--color-surface-base`                     | Page background                        |
| `--color-surface-elevated`                 | Card / modal background                |
| `--color-surface-mid`                      | Subtle container background            |
| `--color-gold-light` / `--color-gold-dark` | Slate in light mode, gold in dark mode |
| `--color-accent`                           | Brand accent                           |
| `--color-action`                           | Interactive / CTA color                |
| `--color-action-hover`                     | Action hover state                     |
| `--color-action-muted`                     | Subtle action fill                     |
| `--color-text-primary`                     | Default body text                      |
| `--color-text-muted`                       | Secondary / subdued text               |
| `--color-text-contrast`                    | Maximum-contrast text (pure black/white) |
| `--color-a11y-focus`                       | Focus ring color                       |
| `--color-scroll-thumb`                     | Scrollbar thumb                        |
| `--color-scroll-thumb-hover`               | Scrollbar thumb hover                  |
| `--color-scroll-thumb-active`              | Scrollbar thumb active                 |
| `--color-scroll-background`                | Scrollbar track                        |

Every token gets a triple-layered fallback (plain hex → static `oklch()` → `light-dark(oklch(), oklch())`) so the palette degrades gracefully on older browsers. See [Mixins](#mixins) for how these are generated and how to extend the palette with your own tokens.

---

## Abstracts

### Functions

Import via `@use 'styles/abstracts/functions' as fn`.

#### `getFluidClamp($min-size, $max-size, $value-key)`

Returns a `clamp()` value that interpolates linearly between two raw pixel sizes across the `$fluid-scale` viewport range — the general-purpose building block the other fluid functions below are built on. Unlike `fluidSpacing`/`fluidSpaceStep`, it isn't pinned to the spacing grid, so it's useful for one-off fluid values (e.g. a component's own min/max size). Falls back to a flat `rem` value when `$min-size == $max-size`, instead of emitting a pointless `clamp()`.

```scss
--custom-size: #{fn.getFluidClamp(4, 8)}; // clamp() between 4px and 8px
--icon-size: #{fn.getFluidClamp(24, 32, 'vw')}; // same, using plain vw
```

This is also what the `--unit-macro` spacing token is built from — see [Base Tokens](#base-tokens).

#### `fluidFontSize($level, $unit-key)`

Returns a `clamp()` value for a type step on the modular scale.

```scss
font-size: fn.fluidFontSize(2); // 2 steps up from base, uses vwx unit
font-size: fn.fluidFontSize(2, 'vw'); // same, using plain vw
```

#### `fluidSpacing($level, $unit-key)`

Returns a `clamp()` value for a spacing multiplier on the base grid (independent of the `--unit-micro`/`--unit-macro` split — it computes its own clamp directly from `min-font-size`/`max-font-size`, not from the CSS custom properties).

```scss
padding: fn.fluidSpacing(6); // grid level × 6
```

#### `fluidSpaceStep($min-level, $max-level, $unit-key)`

Returns a `clamp()` value that spans between two grid levels.

```scss
gap: fn.fluidSpaceStep(4, 8); // between grid level 4 and grid level 8
```

#### `pxToRem($px)`

Converts a pixel value to rem (assumes 16 px root).

```scss
margin: fn.pxToRem(24); // → 1.5rem
```

#### `dynamic-line-height($fs-base, $ratio-base, $fs-ceil, $ratio-ceil, $ratio-cap, $root)`

Returns a self-scaling `clamp()` line-height expressed in `em`, not `rem`/px — so it re-resolves against *any* element's own computed font-size at render time instead of being tied to the modular type scale. It pins an exact ratio (`$ratio-base`, default `1.5`) at one font-size (`$fs-base`, default `16`px), interpolates down to a minimum ratio (`$ratio-ceil`, default `1.05`) at a ceiling font-size (`$fs-ceil`, default `64`px), and caps the ratio at `$ratio-cap` (default `1.6`) for small font-sizes below the natural crossover point. With default arguments, this is computed once and exposed as the `--line-height-dynamic` token (see [Typography Tokens](#typography-tokens)); call the function directly only when you need a custom curve.

```scss
// Default curve — prefer the token instead:
%text-properties { --_line-height: var(--line-height-dynamic); }
// Custom bounds for a display heading — call the function directly:
.display-1 { --_line-height: #{fn.dynamic-line-height($ratio-ceil: 1.05, $fs-ceil: 64)}; }
```

Prefer the static `--line-height-*` tokens (or `fontSetup`'s `$line-height` param) for most component work; reach for `dynamic-line-height` directly only when you need to change the *default* curve itself.

### Mixins

Import via `@use 'styles/abstracts/mixins' as mx`.

#### `fontSetup`

`fontSetup` is the **SCSS component API** for the typography system. Use it when writing component SCSS and you want to apply a font role together with size, weight, and line-height in a single declaration. For HTML-level styling, use `.trim-text-*` and the other [text utility](#text) classes instead — `.trim-text-*` is the class-based equivalent of `fontSetup`'s font-role preset.

```scss
@include mx.fontSetup(
  $font: 'primary',
  // font role (see Font Families table)
  $font-size: var(--heading-1),
  $line-height: 1.1,
  $font-weight: 700,
  $letter-spacing: -0.02em
);
```

Parameters:

| Parameter         | Type   | Default      | Description                                                     |
| ----------------- | ------ | ------------ | --------------------------------------------------------------- |
| `$font`           | string | `'primary'`  | Font role key (see list below)                                  |
| `$font-size`      | value  | `null`       | CSS font-size value                                              |
| `$line-height`    | number \| length | `null` | Line height multiplier; unitless numbers are treated as an em multiplier |
| `$font-weight`    | number | `null`       | Font weight                                                     |
| `$font-style`     | string | `null`       | Font style (`normal`, `italic`, `oblique`)                      |
| `$letter-spacing` | value  | `null`       | Letter spacing                                                  |
| `$text-transform` | string | `null`       | Text transform (`none`, `uppercase`, `lowercase`, `capitalize`) |

Every parameter except `$font` defaults to `null` and is only emitted if you pass it explicitly — omitted parameters simply inherit their value from the font role's placeholder (which includes the dynamic line-height described under [Typography Tokens](#typography-tokens)) rather than being reset to a hardcoded fallback. `$line-height` accepts a bare unitless number (`1.1`) — converted to `em` internally — or an explicit length (`1.1em`); both end up stored as `--_line-height`, which is always a `<length>`.

Valid `$font` roles:

| Category       | Values                                                            |
| -------------- | ----------------------------------------------------------------- |
| Hierarchical   | `primary`, `secondary`, `tertiary`                                |
| Classification | `sans`, `serif`, `mono`                                           |
| Contextual     | `display`, `heading`, `subheading`, `body`, `quote`, `code`, `ui` |

The mixin sets font metrics as CSS custom properties (`--_top-trim`, `--_bottom-trim`, `--_lsb-adjust`, `--_rsb-adjust`) and applies leading-trim via `::before` / `::after` pseudo-elements. When the browser supports `text-box-trim`, native trimming is used instead.

#### `generate-color-tokens($tokens, $defaultScheme, $prefix)`

Emits CSS custom properties for every entry in a color-token map, with a progressive-enhancement fallback chain layered on `:root` / `.app-theme-container`: plain hex first (works everywhere), then static `oklch()` behind an `@supports` check for browsers without `light-dark()`, then full `light-dark(oklch(), oklch())` where supported. Later blocks win the cascade, so support is layered rather than branched.

This is the actual mechanism behind [Color Tokens](#color-tokens), and it's how you replace or extend the shipped example palette — call it again with your own map to add project-specific tokens alongside (or instead of) the defaults:

```scss
$brand-tokens: (
  "brand-primary": (
    light: (oklch: oklch(0.55 0.15 250), hex: #4a5fc1),
    dark: (oklch: oklch(0.7 0.12 250), hex: #8fa0e8),
  ),
);

@include mx.generate-color-tokens($tokens: $brand-tokens, $defaultScheme: dark);
// → --color-brand-primary, with the full hex/oklch/light-dark fallback chain
```

Parameters:

| Parameter        | Type   | Default              | Description                                                        |
| ---------------- | ------ | --------------------- | ------------------------------------------------------------------- |
| `$tokens`        | map    | `var.$color-tokens`   | Map shaped `(name: (light: (oklch:, hex:), dark: (oklch:, hex:)))` |
| `$defaultScheme` | string | `light`               | Which scheme's value backs the plain-hex fallback tier              |
| `$prefix`        | string | `"color"`              | Custom-property prefix, i.e. `--#{$prefix}-#{name}`                 |

Each token also gets a typed `@property --#{$prefix}-#{name} { syntax: "<color>"; }` registration, so invalid overrides fail safe to the fallback color instead of silently breaking the cascade.

### Breakpoints

Import via `@use 'styles/abstracts/variables' as var`.

**Breakpoint values:**

| Name            | Value              |
| --------------- | ------------------ |
| `$bp-mobile`    | `22.5rem` (360 px) |
| `$bp-phablet`   | `30rem` (480 px)   |
| `$bp-tablet`    | `45rem` (720 px)   |
| `$bp-tablet-lg` | `60rem` (960 px)   |
| `$bp-laptop`    | `75rem` (1200 px)  |
| `$bp-desktop`   | `90rem` (1440 px)  |

**Predefined shortcut media query strings:**

Up-to (excludes the breakpoint):

| Variable              | Query             |
| --------------------- | ----------------- |
| `$bp-up-to-phablet`   | `(width < 30rem)` |
| `$bp-up-to-tablet`    | `(width < 45rem)` |
| `$bp-up-to-tablet-lg` | `(width < 60rem)` |
| `$bp-up-to-laptop`    | `(width < 75rem)` |
| `$bp-up-to-desktop`   | `(width < 90rem)` |

And-up (includes the breakpoint and larger):

| Variable               | Query                |
| ---------------------- | -------------------- |
| `$bp-mobile-and-up`    | `(width >= 22.5rem)` |
| `$bp-phablet-and-up`   | `(width >= 30rem)`   |
| `$bp-tablet-and-up`    | `(width >= 45rem)`   |
| `$bp-tablet-lg-and-up` | `(width >= 60rem)`   |
| `$bp-laptop-and-up`    | `(width >= 75rem)`   |
| `$bp-desktop-and-up`   | `(width >= 90rem)`   |

And-down (includes the breakpoint and smaller):

| Variable                 | Query             |
| ------------------------ | ----------------- |
| `$bp-mobile-and-down`    | `(width < 30rem)` |
| `$bp-phablet-and-down`   | `(width < 45rem)` |
| `$bp-tablet-and-down`    | `(width < 60rem)` |
| `$bp-tablet-lg-and-down` | `(width < 75rem)` |
| `$bp-laptop-and-down`    | `(width < 90rem)` |

Only (a specific range):

| Variable             | Query                        |
| -------------------- | ---------------------------- |
| `$bp-mobile-only`    | `(22.5rem <= width < 30rem)` |
| `$bp-phablet-only`   | `(30rem <= width < 45rem)`   |
| `$bp-tablet-only`    | `(45rem <= width < 60rem)`   |
| `$bp-tablet-lg-only` | `(60rem <= width < 75rem)`   |
| `$bp-laptop-only`    | `(75rem <= width < 90rem)`   |

Usage:

```scss
@media #{var.$bp-tablet-and-up} {
  font-size: var(--heading-1);
}
```

---

## Utility Classes

### Spacing

Pattern: `.{property}-{side?}-{size}`

- **Properties:** `m` (margin), `p` (padding)
- **Sides:** `t` (top), `r` (right), `b` (bottom), `l` (left), `x` (horizontal), `y` (vertical)
- **Sizes:** t-shirt (`3xs` → `9xl`) and numeric (`1` → `48`)
- **Special:** `.m-none`, `.p-none`, `.mx-auto`, `.my-auto`, `.ml-auto`, `.mr-auto`

All directional sides map to **logical properties**, not physical ones: `t`/`b` use `margin-block-start`/`-end`, and `l`/`r` use `margin-inline-start`/`-end` (same for padding). In a left-to-right document this behaves like top/right/bottom/left, but `l`/`r` flip automatically in `dir="rtl"` content since they follow inline flow direction rather than a fixed side.

Examples:

```html
<div class="p-md mt-lg mx-auto">…</div>
<div class="pt-3xl pb-xl px-md">…</div>
```

### Gap

Pattern: `.gap-{size}`, using t-shirt and numeric scales.

```html
<div class="flex gap-md">…</div>
```

### Layout

Flex, grid, display, and visibility utilities from `_layout-utilities.scss`.

### Text

Text utility classes from `_text-utilities.scss`. They form the **HTML-level API** for the typography system — compose them in markup to apply font roles, sizes, weights, and alignment without writing any SCSS.

Every property below font-family comes in two families: **`.trim-{property}-*`** sets the `--_{property}` custom property consumed by `%text-properties`, so it only has an effect combined with a Trim Text class. Plain **`.{property}-*`** sets the real CSS property directly and works anywhere, trim system or not.

**Trim text** — applies the full typography preset for a font role: font-family, dynamic line-height, and leading-trim metrics together. Font-size is *not* role-specific — every role shares the `--text-base` default, so pair with a Trim Font Size class for role-appropriate sizing:

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
<h1 class="trim-text-heading trim-font-size-heading-1">Sized heading</h1>
```

**Font family** — sets only `font-family`, nothing else; use this to swap typeface without touching size/line-height/trim:
`.font-family-primary`, `.font-family-secondary`, `.font-family-tertiary`, `.font-family-sans`, `.font-family-serif`, `.font-family-mono`, `.font-family-display`, `.font-family-heading`, `.font-family-subheading`, `.font-family-body`, `.font-family-quote`, `.font-family-code`, `.font-family-ui`

**Font size:**
`.trim-font-size-*` (sets `--_font-size`, pair with a Trim Text class) and plain `.font-size-*` (sets `font-size` directly) — both come in: `display-1`, `display-2`, `heading-1` → `heading-4`, `text-lg`, `text-md`, `text-base`, `text-sm`, `text-xs`

**Font weight:**
`.trim-font-weight-*` and plain `.font-weight-*` — `thin` → `black` (thin, extralight, light, normal, medium, semibold, bold, extrabold, black)

**Line height:**
`.trim-line-height-*` and plain `.line-height-*` — `100` → `200` (steps of 5, e.g. `150` = 1.5), plus `dynamic` (the self-scaling default, e.g. `.trim-line-height-dynamic` resets a component's line-height back to it)

**Font style:**
`.trim-font-style-*` and plain `.font-style-*` — `normal`, `italic`, `oblique`

**Text transform:**
`.trim-text-transform-*` and plain `.text-transform-*` — `capitalize`, `uppercase`, `lowercase`

**Text alignment:** `.text-align-left`, `.text-align-center`, `.text-align-right`

**Text color:** `.text-color-inherit` only — unlike font roles, color token names aren't a contract enforced anywhere else in the system, so fixed `.text-color-*` classes would risk going silently dead the moment a project renames its `$color-tokens` keys. Add your own next to your project's palette.

```html
<h1
  class="trim-text-heading trim-font-size-heading-1 trim-font-weight-bold">
  Page heading
</h1>
<p class="trim-text-body trim-font-size-text-base" style="color: var(--color-text-muted);">
  Body copy in muted tone.
</p>
```

---

## Components

Global component styles live in `src/styles/components/` and ship as part of `@use 'styles/trimscale'` — no separate import needed.

### `text-box`

A typographic prose container: it handles flow spacing between block elements, character-count-based line lengths, and horizontal centering. Uses `em`-based spacing throughout, so rhythm scales with the local font size rather than the viewport.

```html
<div class="text-box text-box--flow text-box-65 text-box--center-content">
  <h2>Heading</h2>
  <p>Paragraph…</p>
  <ul>…</ul>
</div>
```

| Class                       | Effect                                                                                                                                                                          |
| --------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `.text-box`                 | Base container (`width: 100%`)                                                                                                                                                 |
| `.text-box--flow`           | Structured `margin-block` rhythm for **mixed content** (headings + paragraphs/lists/figures), using `:has()` to vary spacing by context (e.g. `2em` before a heading, `0.8em` after one). Mutually exclusive with `--prose`. |
| `.text-box--prose`          | Uniform `margin-block-start` between every direct child, for **continuous prose**. Override the spacing via the `--prose-flow` custom property (default `1.5em`). Mutually exclusive with `--flow`. |
| `.text-box-45` … `-75`      | Caps line length by character count (steps of 5: `45, 50, 55, 60, 65, 70, 75`), computed as `max-width: calc(var(--text-base) * avg-char-width * N)`                          |
| `.text-box--center-content` | `margin-inline: auto`, typically paired with a character-count modifier                                                                                                        |

To add another global component, create a new `_[name].scss` file in `src/styles/components/` and add `@forward './[name]';` to `components/_index.scss`.

---

## Styleguide

A Vite dev app lives in `styleguide/` for visual development and testing.

```bash
cd styleguide
npm install
npm run dev      # start dev server
npm run build    # production build
npm run preview  # preview production build
```

The styleguide sets `loadPaths` to `../src`, so SCSS imports work the same way as in any consuming project:

```scss
@use 'styles/trimscale';
```

---

## Customization

All configuration lives in `src/styles/abstracts/variables/`. Edit the relevant file directly; the system derives everything else from these values at compile time.

Key configuration files:

| File                 | Controls                                              | Guide                                                             |
| -------------------- | ----------------------------------------------------- | ----------------------------------------------------------------- |
| `_breakpoints.scss`  | Viewport breakpoints and shortcut variables           | [customizing-breakpoints.md](src/docs/customizing-breakpoints.md) |
| `_fluid-scale.scss`  | Viewport range, base font sizes, modular scale ratios | [customizing-type-scale.md](src/docs/customizing-type-scale.md)   |
| `_font-metrics.scss` | Per-font cap-height, ascender, descender, trim values | [adding-a-font.md](src/docs/adding-a-font.md)                     |
| `_typography.scss`   | Font role → family mappings                           | [adding-a-font.md](src/docs/adding-a-font.md)                     |
| `_colors.scss`       | `$color-tokens` — the project's color palette (light/dark, oklch + hex per token). Ships with a placeholder palette; replace the values (or add your own tokens and pass them to `mx.generate-color-tokens`) rather than treating them as fixed brand colors | [Color Tokens](#color-tokens), [Mixins](#mixins) |

Use the `_[NAME].scss` template files in each `abstracts/` subdirectory as a starting point for adding your own variables, functions, or mixins.
