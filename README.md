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
- [Styleguide](#styleguide)
- [Customization](#customization)

---

## Overview

trimscale-css is built around three core ideas:

1. **Fluid typography** — font sizes and spacing scale continuously across viewports using `clamp()`. No breakpoint jumps.
2. **Leading-trim precision** — removes excess vertical whitespace above and below text using font metrics, giving you true cap-height-to-baseline control.
3. **OKLCH color tokens** — perceptually uniform colors with automatic light/dark mode switching via the CSS `light-dark()` function.

The system is pure SCSS. It generates CSS custom properties, utility classes, and base styles. No JavaScript required for styles.

---

## Features

- Fluid typography using a modular scale that expands from Minor Third (1.2×) at 360 px to Perfect Fourth (1.333×) at 1440 px
- Fluid spacing on a `--unit` grid that scales 4 px → 5 px across the same range
- Leading-trim via CSS pseudo-elements, with a progressive enhancement to native `text-box-trim` where supported
- OKLCH color system with semantic tokens for surfaces, text, accent, and action states
- Light/dark mode via `prefers-color-scheme` — zero JavaScript
- Modern responsive breakpoints using CSS range syntax (`width <`, `width >=`)
- Semantic (t-shirt sizes) and numeric (1–48) spacing scales
- Framework-agnostic — works with any JS framework or plain HTML

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
│   │   ├── _base-tokens.scss       # --fluid-base, --unit, --vwx
│   │   ├── _spacing-tokens.scss    # --space-* (t-shirt + 1–48 numeric)
│   │   ├── _typography-tokens.scss # --fs-100 to --fs-900, font families, weights
│   │   ├── _color-tokens.scss      # OKLCH colors with light-dark()
│   │   └── _leading-trim.scss      # %text-properties placeholder selectors
│   ├── base/                       # HTML defaults: reset, fonts, typography, a11y
│   └── utilities/                  # Spacing, gap, text, and layout utility classes
└── styleguide/                     # Vite dev app for visual testing
```

---

## Getting Started

The system is consumed as SCSS source. Add the `src/styles` directory to your project and configure your SCSS compiler with its load path.

**Vite + sass-embedded example:**

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

| Token | Description |
|-------|-------------|
| `--vwx` | Adaptive viewport unit. `1vw` normally; switches to `2vh` on ultrawide screens (≥ 21:9 ratio + ≥ 2048 px height) to prevent runaway scaling |
| `--fluid-base` | Base font size. Scales from `16px` at 360 px viewport to `20px` at 1440 px using `clamp()` |
| `--unit` | Base spacing unit = `--fluid-base / 4`. Scales 4 px → 5 px fluidly |
| `--header-height` | Global header height: `2.75rem + var(--space-3xl)` |

### Spacing Tokens

Spacing tokens are multiples of `--unit`, so they scale fluidly with the viewport.

**T-shirt sizes:**

| Token | Multiplier | Base value (at 16 px) |
|-------|------------|-----------------------|
| `--space-3xs` | × 1 | 4 px |
| `--space-2xs` | × 2 | 8 px |
| `--space-xs` | × 3 | 12 px |
| `--space-sm` | × 4 | 16 px |
| `--space-md` | × 5 | 20 px |
| `--space-lg` | × 6 | 24 px |
| `--space-xl` | × 8 | 32 px |
| `--space-2xl` | × 12 | 48 px |
| `--space-3xl` | × 16 | 64 px |
| `--space-4xl` | × 20 | 80 px |
| `--space-5xl` | × 24 | 96 px |
| `--space-6xl` | × 28 | 112 px |
| `--space-7xl` | × 32 | 128 px |
| `--space-8xl` | × 40 | 160 px |
| `--space-9xl` | × 48 | 192 px |

**Numeric scale:** `--space-1` through `--space-48`, each equal to `calc(var(--unit) * N)`.

### Typography Tokens

**Modular scale levels** — all computed with `clamp()` from Minor Third at mobile to Perfect Fourth at desktop:

| Token | Scale step | Role |
|-------|------------|------|
| `--fs-100` | −2 | Smallest (legal, captions) |
| `--fs-200` | −1 | Small (secondary info, metadata) |
| `--fs-300` | 0 | Base font size |
| `--fs-400` | +1 | Emphasized text |
| `--fs-500` | +2 | Small heading |
| `--fs-600` | +3 | Medium heading |
| `--fs-700` | +4 | Large heading |
| `--fs-800` | +5 | Extra large heading |
| `--fs-900` | +6 | Display heading |

**Semantic size aliases:**

| Token | Value |
|-------|-------|
| `--display-1` | `--fs-900` |
| `--display-2` | `--fs-800` |
| `--heading-1` | `--fs-700` |
| `--heading-2` | `--fs-600` |
| `--heading-3` | `--fs-500` |
| `--heading-4` | `--fs-400` |
| `--text-lg` | `--fs-400` |
| `--text-md` | `fluidFontSize(0.5)` — half-step between `--fs-300` and `--fs-400` |
| `--text-base` | `--fs-300` |
| `--text-sm` | `--fs-300 × 0.875` |
| `--text-xs` | `--fs-300 × 0.75` |

**Font families:**

| Token | Description |
|-------|-------------|
| `--font-family-primary` | Primary brand typeface |
| `--font-family-secondary` | Secondary typeface |
| `--font-family-tertiary` | Tertiary typeface |
| `--font-family-sans` | Sans-serif stack |
| `--font-family-serif` | Serif stack |
| `--font-family-mono` | Monospace stack |
| `--font-family-display` | Display / headline font |
| `--font-family-heading` | Heading font |
| `--font-family-body` | Body text font |
| `--font-family-quote` | Blockquote font |
| `--font-family-code` | Code / pre font |
| `--font-family-ui` | UI elements font |

**Font weights:** `--font-weight-thin` (100) through `--font-weight-black` (900).

**Line heights:** `--line-height-100` through `--line-height-200` — named by value × 100. Examples: `--line-height-100` = 1.0, `--line-height-115` = 1.15, `--line-height-150` = 1.5, `--line-height-200` = 2.0. All steps of 0.05 are defined.

### Color Tokens

Colors use `light-dark()` for automatic theme switching driven by `prefers-color-scheme`. You can override the automatic detection by adding a class to `:root`:

```html
<html class="theme-light">  <!-- force light -->
<html class="theme-dark">   <!-- force dark -->
```

| Token | Description |
|-------|-------------|
| `--color-surface-base` | Page background |
| `--color-surface-elevated` | Card / modal background |
| `--color-surface-mid` | Subtle container background |
| `--color-gold-light` / `--color-gold-dark` | Slate in light mode, gold in dark mode |
| `--color-accent` | Brand accent |
| `--color-accent-hover` | Accent hover state |
| `--color-accent-muted` | Subtle accent fill |
| `--color-action` | Interactive / CTA color |
| `--color-action-hover` | Action hover state |
| `--color-action-muted` | Subtle action fill |
| `--color-text-primary` | Default body text |
| `--color-text-muted` | Secondary / subdued text |
| `--color-text-bright` | High-contrast text |
| `--color-scroll-thumb` | Scrollbar thumb |
| `--color-scroll-thumb-hover` | Scrollbar thumb hover |
| `--color-scroll-thumb-active` | Scrollbar thumb active |
| `--color-scroll-background` | Scrollbar track |

---

## Abstracts

### Functions

Import via `@use 'styles/abstracts/functions' as fn`.

#### `fluidFontSize($level, $unit-key)`

Returns a `clamp()` value for a type step on the modular scale.

```scss
font-size: fn.fluidFontSize(2);       // 2 steps up from base, uses vwx unit
font-size: fn.fluidFontSize(2, 'vw'); // same, using plain vw
```

#### `fluidSpacing($level, $unit-key)`

Returns a `clamp()` value for a spacing multiplier on the grid.

```scss
padding: fn.fluidSpacing(6);  // --unit × 6
```

#### `fluidSpaceStep($min-level, $max-level, $unit-key)`

Returns a `clamp()` value that spans between two grid levels.

```scss
gap: fn.fluidSpaceStep(4, 8); // between --unit × 4 and --unit × 8
```

#### `pxToRem($px)`

Converts a pixel value to rem (assumes 16 px root).

```scss
margin: fn.pxToRem(24); // → 1.5rem
```

### Mixins

Import via `@use 'styles/abstracts/mixins' as mx`.

#### `fontSetup`

Applies a font role with leading-trim metrics and full typographic config:

```scss
@include mx.fontSetup(
  $font: 'primary',          // font role (see Font Families table)
  $font-size: var(--heading-1),
  $line-height: 1.1,
  $font-weight: 700,
  $letter-spacing: -0.02em
);
```

Parameters:

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `$font` | string | `'primary'` | Font role key (see list below) |
| `$font-size` | value | `var(--text-base)` | CSS font-size value |
| `$line-height` | number | `1.5` | Line height (unitless) |
| `$font-weight` | number | `400` | Font weight |
| `$font-style` | string | `normal` | Font style (`normal`, `italic`, `oblique`) |
| `$letter-spacing` | value | `normal` | Letter spacing |
| `$text-transform` | string | `none` | Text transform (`none`, `uppercase`, `lowercase`, `capitalize`) |

Valid `$font` roles:

| Category | Values |
|----------|--------|
| Hierarchical | `primary`, `secondary`, `tertiary` |
| Classification | `sans`, `serif`, `mono` |
| Contextual | `display`, `heading`, `subheading`, `body`, `quote`, `code`, `ui` |

The mixin sets font metrics as CSS custom properties (`--_top-trim`, `--_bottom-trim`, `--_lsb-adjust`, `--_rsb-adjust`) and applies leading-trim via `::before` / `::after` pseudo-elements. When the browser supports `text-box-trim`, native trimming is used instead.

### Breakpoints

Import via `@use 'styles/abstracts/variables' as var`.

**Breakpoint values:**

| Name | Value |
|------|-------|
| `$bp-mobile` | `22.5rem` (360 px) |
| `$bp-phablet` | `30rem` (480 px) |
| `$bp-tablet` | `45rem` (720 px) |
| `$bp-tablet-lg` | `60rem` (960 px) |
| `$bp-laptop` | `75rem` (1200 px) |
| `$bp-desktop` | `90rem` (1440 px) |

**Predefined shortcut media query strings:**

Up-to (excludes the breakpoint):

| Variable | Query |
|----------|-------|
| `$bp-up-to-phablet` | `(width < 30rem)` |
| `$bp-up-to-tablet` | `(width < 45rem)` |
| `$bp-up-to-tablet-lg` | `(width < 60rem)` |
| `$bp-up-to-laptop` | `(width < 75rem)` |
| `$bp-up-to-desktop` | `(width < 90rem)` |

And-up (includes the breakpoint and larger):

| Variable | Query |
|----------|-------|
| `$bp-mobile-and-up` | `(width >= 22.5rem)` |
| `$bp-phablet-and-up` | `(width >= 30rem)` |
| `$bp-tablet-and-up` | `(width >= 45rem)` |
| `$bp-tablet-lg-and-up` | `(width >= 60rem)` |
| `$bp-laptop-and-up` | `(width >= 75rem)` |
| `$bp-desktop-and-up` | `(width >= 90rem)` |

And-down (includes the breakpoint and smaller):

| Variable | Query |
|----------|-------|
| `$bp-mobile-and-down` | `(width < 30rem)` |
| `$bp-phablet-and-down` | `(width < 45rem)` |
| `$bp-tablet-and-down` | `(width < 60rem)` |
| `$bp-tablet-lg-and-down` | `(width < 75rem)` |
| `$bp-laptop-and-down` | `(width < 90rem)` |

Only (a specific range):

| Variable | Query |
|----------|-------|
| `$bp-mobile-only` | `(22.5rem <= width < 30rem)` |
| `$bp-phablet-only` | `(30rem <= width < 45rem)` |
| `$bp-tablet-only` | `(45rem <= width < 60rem)` |
| `$bp-tablet-lg-only` | `(60rem <= width < 75rem)` |
| `$bp-laptop-only` | `(75rem <= width < 90rem)` |

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

Examples:

```html
<div class="p-md mt-lg mx-auto">…</div>
<div class="pt-3xl pb-xl px-md">…</div>
```

### Gap

Pattern: `.gap-{size}` — t-shirt and numeric scales.

```html
<div class="flex gap-md">…</div>
```

### Layout

Flex, grid, display, and visibility utilities from `_layout-utilities.scss`.

### Text

Text alignment, decoration, color, and shadow utilities from `_text-utilities.scss`.

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

The styleguide uses a Vite alias `@trimscale` → `../src/styles`, so imports look like:

```scss
@use '@trimscale/trimscale';
```

---

## Customization

All configuration lives in `src/styles/abstracts/variables/`. Each file uses `!default` flags, so you can override values by setting them before the `@use` call.

Key configuration files:

| File | Controls |
|------|----------|
| `_breakpoints.scss` | Viewport breakpoints |
| `_fluid-scale.scss` | Min/max viewport, base font size, modular scale ratios |
| `_font-metrics.scss` | Per-font cap-height, ascender, descender, trim values |
| `_typography.scss` | Font role → family mappings |
| `_colors.scss` | Raw hex/OKLCH color values for light and dark themes |

Use the `_[NAME].scss` template files in each `abstracts/` subdirectory as a starting point for adding your own variables, functions, or mixins.
