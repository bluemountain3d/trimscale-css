# Customizing Breakpoints

This guide explains how to change the viewport breakpoints in trimscale-css, covering both the raw values and how the auto-generated shortcut variables work.

## Overview

All breakpoint values live in one file:

| File | What you do there |
|------|-------------------|
| [`src/styles/abstracts/variables/_breakpoints.scss`](../styles/abstracts/variables/_breakpoints.scss) | Edit the `$breakpoints` map |

The shortcut variables (`$bp-tablet-and-up`, `$bp-mobile-only`, etc.) are generated automatically from the map; you never edit them by hand.

---

## The `$breakpoints` map

Open `_breakpoints.scss` and find the map:

```scss
$breakpoints: (
  "mobile":    22.5rem,  // 360px
  "phablet":   30rem,    // 480px
  "tablet":    45rem,    // 720px
  "tablet-lg": 60rem,    // 960px
  "laptop":    75rem,    // 1200px
  "desktop":   90rem,    // 1440px
  "ultrawide": 59rem,    // viewport height
) !default;
```

Change any `rem` value to move that breakpoint. All values are in `rem`; divide the target pixel value by 16 to convert.

**Example: push tablet to 768 px**

```scss
$breakpoints: (
  "mobile":    22.5rem,
  "phablet":   30rem,
  "tablet":    48rem,    // was 45rem (720px), now 768px
  "tablet-lg": 60rem,
  "laptop":    75rem,
  "desktop":   90rem,
  "ultrawide": 59rem,
) !default;
```

After saving, all shortcut variables that reference `"tablet"`, such as `$bp-tablet-and-up`, `$bp-tablet-only`, and `$bp-up-to-tablet`, update automatically.

---

## Breakpoint naming

The map keys are arbitrary strings. If you add a project-specific breakpoint, add both the key and the shortcut variables it needs.

**Example: add a `"widescreen"` breakpoint at 1600 px**

Step 1: add to the map

```scss
$breakpoints: (
  // ... existing keys ...
  "widescreen": 100rem,  // 1600px
) !default;
```

Step 2: add the shortcut variables you need below the existing ones

```scss
$bp-widescreen-and-up: "(width >= #{map.get($breakpoints, 'widescreen')})";
$bp-up-to-widescreen:  "(width < #{map.get($breakpoints, 'widescreen')})";
```

Then use them like any other shortcut:

```scss
@media #{var.$bp-widescreen-and-up} {
  // styles for 1600px and wider
}
```

---

## Fluid scale viewport range

The `$fluid-scale` map in `_fluid-scale.scss` has its own `min-width` and `max-width` values that control where the fluid typography and spacing system begins and ends its interpolation. These are independent of `$breakpoints`, but they should stay consistent with your design decisions.

If you widen the design range significantly (e.g. supporting 320 px to 2560 px), update `_fluid-scale.scss` to match. See [customizing-type-scale.md](./customizing-type-scale.md) for details.

---

## Quick checklist

- [ ] Values in `$breakpoints` are in `rem` (px ÷ 16)
- [ ] Map keys match exactly when referenced in shortcut variables (`map.get($breakpoints, 'key')`)
- [ ] Any new breakpoint has corresponding shortcut variables added below the map
- [ ] Dev server compiles without errors after the change
