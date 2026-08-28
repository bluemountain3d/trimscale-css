# Customizing the Type Scale

This guide explains how to change the fluid typography system: the viewport range it spans, the base font sizes at each end, and the modular scale ratios that control how dramatically headings grow relative to body text.

## Overview

All type scale configuration lives in one file:

| File | What you do there |
|------|-------------------|
| [`src/styles/abstracts/variables/_fluid-scale.scss`](../styles/abstracts/variables/_fluid-scale.scss) | Edit the `$fluid-scale` map |

All CSS custom properties (`--fs-100` through `--fs-900`, `--unit-micro`, `--fluid-base`) are derived from this map at compile time. Changing the map is the only step required. (`--unit-macro` is an independent 4px → 8px clamp keyed only to `min-width`/`max-width`, not to the font-size keys below — see [Base Tokens](../../README.md#base-tokens).)

---

## The `$fluid-scale` map

```scss
$fluid-scale: (
  "min-width":      360,   // px: smallest viewport the scale starts at
  "max-width":      1440,  // px: largest viewport the scale ends at
  "min-font-size":  16,    // px: base font size at min-width
  "max-font-size":  20,    // px: base font size at max-width
  "min-type-scale": 1.2,   // ratio at min-width (Minor Third)
  "max-type-scale": 1.333, // ratio at max-width (Perfect Fourth)
  "precision":      4,     // decimal places in generated clamp() values
) !default;
```

Each key controls a distinct part of the system:

---

## Keys explained

### `min-width` and `max-width`

The viewport range over which fluid interpolation runs. Below `min-width` the type is locked at its minimum size; above `max-width` it is locked at its maximum.

```
min-width (360px) ──── fluid range ──── max-width (1440px)
  base = 16px                             base = 20px
```

**Change when:** you support a narrower minimum (e.g. 320 px watches) or a wider maximum (e.g. 2560 px 4K monitors).

```scss
"min-width":  320,   // extend to 320px
"max-width":  1920,  // extend to 1920px
```

### `min-font-size` and `max-font-size`

The base font size (in pixels) at the two ends of the viewport range. Every scale step is a power of the type scale ratio multiplied by this base. The `--fluid-base` and `--unit-micro` tokens track this value at runtime (`--unit-macro` does not — it's a separate 4px → 8px clamp tied only to the viewport range, not to these font-size values).

```
Viewport 360px → base = 16px → --unit-micro = 4px
Viewport 1440px → base = 20px → --unit-micro = 5px
```

**Change when:** your typeface reads smaller or larger than average and you need to compensate, or your layout grid should start from a different base unit.

```scss
"min-font-size": 15,  // tighter default, e.g. for a dense UI
"max-font-size": 18,  // less expansion on large screens
```

### `min-type-scale` and `max-type-scale`

The modular scale ratio at each end of the viewport range. At `min-width` the scale uses `min-type-scale`; at `max-width` it uses `max-type-scale`. Between those points, each step's min and max sizes are interpolated with `clamp()`.

A higher ratio means more contrast between heading levels. A lower ratio produces a flatter, more compact hierarchy.

**Common ratios:**

| Name | Ratio | Character |
|------|-------|-----------|
| Major Second | 1.125 | Very flat, tight editorial |
| Minor Third | 1.2 | Compact, current mobile default |
| Major Third | 1.25 | Balanced for medium-density UIs |
| Perfect Fourth | 1.333 | Generous, current desktop default |
| Augmented Fourth | 1.414 | Bold, suited for large display contexts |
| Perfect Fifth | 1.5 | Very dramatic, for hero-only typography |

**Example: flatten mobile, keep desktop generous**

```scss
"min-type-scale": 1.125,  // Major Second at small screens
"max-type-scale": 1.333,  // Perfect Fourth at large screens
```

**Example: compact UI throughout**

```scss
"min-type-scale": 1.125,
"max-type-scale": 1.25,
```

### `precision`

Decimal places in the generated `clamp()` values. `4` is a safe default. You can lower it to `2` for shorter output; increase it if you notice rounding artifacts at very small scale steps.

---

## What the scale levels produce

To see the concrete pixel values your configuration generates, apply the formula at each end:

```
size at level N = base-font-size × ratio^N
```

**Example with defaults at desktop (base = 20 px, ratio = 1.333):**

| Token | Level | Calculation | px |
|-------|-------|-------------|----|
| `--fs-100` | −2 | `20 × 1.333^-2` | ~11.2 px |
| `--fs-200` | −1 | `20 × 1.333^-1` | ~15.0 px |
| `--fs-300` | 0 | `20 × 1.333^0` | 20.0 px |
| `--fs-400` | +1 | `20 × 1.333^1` | ~26.7 px |
| `--fs-500` | +2 | `20 × 1.333^2` | ~35.5 px |
| `--fs-600` | +3 | `20 × 1.333^3` | ~47.4 px |
| `--fs-700` | +4 | `20 × 1.333^4` | ~63.1 px |
| `--fs-800` | +5 | `20 × 1.333^5` | ~84.2 px |
| `--fs-900` | +6 | `20 × 1.333^6` | ~112.2 px |

---

## Effect on spacing

The `--unit-micro` token is `--fluid-base / 4`, so it inherits the same base range. Changing `min-font-size` and `max-font-size` proportionally changes the small spacing tokens (`--space-3xs` through `--space-md`, `--space-1` through `--space-6`) too. A base of 15–18 px gives a `--unit-micro` range of 3.75–4.5 px rather than 4–5 px. The large spacing tokens (`--space-lg` and up) use `--unit-macro`, which is unaffected — it's a fixed 4px → 8px clamp tied to `min-width`/`max-width` only.

If you change the base sizes, verify that your spacing scale still feels right in the styleguide.

---

## Quick checklist

- [ ] `min-width` and `max-width` are in pixels (unitless integers)
- [ ] `min-font-size` and `max-font-size` are in pixels (unitless integers)
- [ ] `min-type-scale` ≤ `max-type-scale`
- [ ] Dev server compiles without errors
- [ ] Verify heading sizes in the styleguide at narrow and wide viewport widths
- [ ] Verify spacing tokens still feel proportional after any base font size change
