# Customizing Spacing

This guide explains the two spacing growth models trimscale-css supports, and how to switch between them or tune either one.

## Overview

Spacing is config-driven, not hand-edited SCSS, but `styles/tokens/_base-tokens.scss` and `styles/tokens/_spacing-tokens.scss` themselves are static files (they branch on `var.$spacing-approach` etc. via `@if`), not regenerated per project:

| File | What you do there |
|------|-------------------|
| [`trimscale.config.ts`](../trimscale.config.ts) | Edit the `spacingSetup` field |
| `styles/tokens/_base-tokens.scss` / `_spacing-tokens.scss` | Static — never edit by hand, they read `var.$spacing-approach`/`$t-shirt-scale-*`/etc. |

After changing `spacingSetup`, run:

```bash
npx trimscale-css generate
```

This writes your project's generated bridge file (see [getting-started.md](getting-started.md#generate)), which configures `$base-grid-size`, `$spacing-approach`, `$t-shirt-scale`/`$t-shirt-scale-micro`/`$t-shirt-scale-macro`, `$macro-range-max` (computed as `baseGridSize × macroRangeMultiplier`), and the numeric-scale bounds via `@use ... with (...)`. `_base-tokens.scss` (the `--unit*` custom properties) and `_spacing-tokens.scss` (every `--space-*` token) then pick those values up at your own compile time. Both t-shirt sizes (`3xs` → `9xl`) and the numeric scale are driven by the same config.

---

## The two approaches

`spacingSetup.approach` picks which growth model generates the `--space-*` scale. They aren't combinable: the shape of the rest of `spacingSetup` changes depending on which one you pick. `spacingSetup.baseGridSize` sits outside that split, it applies to both approaches: `4` (default) or `8`, the base spacing grid unit in px.

### `'independent'` (default)

Spacing has its own two-unit system, decoupled from the type scale:

- `--unit-micro`: a static grid unit (`baseGridSize`). Never scales with the viewport.
- `--unit-macro`: its own fluid clamp from `baseGridSize` up to `baseGridSize × spacingSetup.macroRangeMultiplier` (optional, defaults to `2`, so `8px` at the default `baseGridSize: 4`), across the viewport width range set in `fluidScale` (`minWidth`/`maxWidth`), only the viewport range is shared with the type scale. `macroRangeMultiplier` must be greater than `1` (so the macro ceiling always exceeds `baseGridSize`), the generator throws if it isn't. If you narrow `fluidScale`'s viewport range significantly (e.g. `minWidth`/`maxWidth` of `360`/`800` instead of the default `360`/`1440`), reconsider `macroRangeMultiplier` too: the resulting ceiling is a fixed target value, not derived from the range, so a much narrower range reaches it over a much shorter distance and can make the large tiers (which multiply `--unit-macro`) feel disproportionately large relative to the viewport at `maxWidth`.

Small tiers (`3xs`–`lg`) multiply `--unit-micro`; large tiers (`xl`–`9xl`) multiply `--unit-macro`. This is why `--space-lg` stays fixed while `--space-xl` and up grow with the viewport: the split is deliberate, not an artifact.

```ts
spacingSetup: {
  baseGridSize: 4,
  approach: 'independent',
  tShirtScaleMicro: {
    '3xs': 1, '2xs': 2, 'xs': 3, 'sm': 4, 'md': 5, 'lg': 6,
  },
  tShirtScaleMacro: {
    'xl': 6, '2xl': 8, '3xl': 10, '4xl': 12,
    '5xl': 16, '6xl': 20, '7xl': 24, '8xl': 28, '9xl': 32,
  },
  numericScaleMicroEnd: 6,   // --space-1 .. --space-6 use --unit-micro
  numericScaleMacroEnd: 48,  // --space-7 .. --space-48 use --unit-macro
  // macroRangeMultiplier: 2, // optional, defaults to 2, must be > 1
}
```

With the example values above, the split lands here:

| Tier                          | Multiplier of | Unit           |
| ------------------------------ | :-------------: | ---------------- |
| `3xs`, `2xs`, `xs`, `sm`, `md`, `lg` | 1–6            | `--unit-micro` (static) |
| `xl`, `2xl`, `3xl`, `4xl`, `5xl`, `6xl`, `7xl`, `8xl`, `9xl` | 6–32 | `--unit-macro` (fluid) |

`lg` is the last micro tier, `xl` is the first macro one, that boundary is a config choice (whichever key you last put in `tShirtScaleMicro` vs. first in `tShirtScaleMacro`), not a fixed rule, rename or move tiers between the two maps freely.

**Use this when** you want to tune how aggressively text grows (`fluidScale`'s type-scale ratio) without spacing following along at the same rate, the two systems can be adjusted independently.

### `'coupled'`

Spacing and text scale in lockstep. A single `--unit` (`fluidScale`'s base font-size ÷ `baseGridSize`) drives every tier: the Utopia.fyi-style model.

```ts
spacingSetup: {
  baseGridSize: 4,
  approach: 'coupled',
  tShirtScale: {
    '3xs': 1, '2xs': 2, 'xs': 3, 'sm': 4, 'md': 5, 'lg': 6,
    'xl': 8, '2xl': 12, '3xl': 16, '4xl': 20,
    '5xl': 24, '6xl': 28, '7xl': 32, '8xl': 40, '9xl': 48,
  },
  numericScaleEnd: 48,  // --space-1 .. --space-48 all use --unit
}
```

Note the multipliers are different from the independent example above: `--unit` is a much narrower range (`4px` at 360px viewport → `5px` at 1440px, since it's `fluidScale.minFontSize / 4` to `fluidScale.maxFontSize / 4` at the default `baseGridSize: 4`) than `--unit-macro`'s `4px → 8px` (its default `macroRangeMultiplier` of `2`), so a tier needs a larger multiplier to land on a similar target pixel value.

**Use this when** you want spacing to visually "breathe" with text at the same rate everywhere: a simpler mental model, at the cost of not being able to tune one without the other.

---

## Tiers and numeric range

Both approaches share the same shape for their scale maps:

- **T-shirt tiers**: a map from tier name to a multiplier of the relevant unit. Tier names are `'xs' | 'sm' | 'md' | 'lg' | 'xl'` or `` `${number}xs` ``/`` `${number}xl` `` for extra tiers beyond those (e.g. `'2xs'`, `'10xl'`): add or remove keys freely, there's no fixed list you must match.
- **Numeric range**: `numericScaleEnd` (coupled) or `numericScaleMicroEnd`/`numericScaleMacroEnd` (independent) set how far the numbered `--space-1`..`--space-N` scale goes. Lower it if you don't need the full range: it directly controls how many `--space-*` custom properties get generated.

---

## Quick checklist

- [ ] Picked `approach` deliberately, `'coupled'` and `'independent'` aren't interchangeable field-for-field
- [ ] Ran `npx trimscale-css generate` after any change
- [ ] Dev server compiles without errors
- [ ] Verify spacing still feels proportional at both ends of the viewport range in the styleguide
