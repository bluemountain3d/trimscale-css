# Customizing Spacing

This guide explains the two spacing growth models trimscale-css supports, and how to switch between them or tune either one.

## Overview

Spacing is config-driven, not hand-edited SCSS:

| File | What you do there |
|------|-------------------|
| [`trimscale.config.ts`](../trimscale.config.ts) | Edit the `spacingSetup` field |
| `scripts/generateSpacing.ts` | Regenerated automatically — never edit the output by hand |

After changing `spacingSetup`, run:

```bash
node scripts/generateSpacing.ts
```

This rewrites `styles/tokens/_base-tokens.scss` (the `--unit*` custom properties) and `styles/tokens/_spacing-tokens.scss` (every `--space-*` token). Both t-shirt sizes (`3xs` → `9xl`) and the numeric scale (`1` → `48`) are generated from the same config.

---

## The two approaches

`spacingSetup.approach` picks which growth model generates the `--space-*` scale. They aren't combinable — the shape of the rest of `spacingSetup` changes depending on which one you pick.

### `'independent'` (default)

Spacing has its own two-unit system, decoupled from the type scale:

- `--unit-micro` — a static grid unit (`$base-grid-size`, `4px` by default). Never scales with the viewport.
- `--unit-macro` — its own fluid clamp, `4px → 8px` across the viewport width range set in `fluidScale` (`minWidth`/`maxWidth`). The `4px`/`8px` endpoints themselves are fixed in `generateSpacing.ts`, not a `fluidScale` field, only the viewport range they interpolate across is shared with the type scale.

Small tiers (`3xs`–`lg`) multiply `--unit-micro`; large tiers (`xl`–`9xl`) multiply `--unit-macro`. This is why `--space-lg` stays fixed while `--space-xl` and up grow with the viewport — the split is deliberate, not an artifact.

```ts
spacingSetup: {
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
}
```

**Use this when** you want to tune how aggressively text grows (`fluidScale`'s type-scale ratio) without spacing following along at the same rate — the two systems can be adjusted independently.

### `'coupled'`

Spacing and text scale in lockstep. A single `--unit` (`fluidScale`'s base font-size ÷ `$base-grid-size`) drives every tier — the Utopia.fyi-style model.

```ts
spacingSetup: {
  approach: 'coupled',
  tShirtScale: {
    '3xs': 1, '2xs': 2, 'xs': 3, 'sm': 4, 'md': 5, 'lg': 6,
    'xl': 8, '2xl': 12, '3xl': 16, '4xl': 20,
    '5xl': 24, '6xl': 28, '7xl': 32, '8xl': 40, '9xl': 48,
  },
  numericScaleEnd: 48,  // --space-1 .. --space-48 all use --unit
}
```

Note the multipliers are different from the independent example above — `--unit` is a much narrower range (`4px` at 360px viewport → `5px` at 1440px, since it's `fluidScale.minFontSize / 4` to `fluidScale.maxFontSize / 4`) than `--unit-macro`'s `4px → 8px`, so a tier needs a larger multiplier to land on a similar target pixel value.

**Use this when** you want spacing to visually "breathe" with text at the same rate everywhere — a simpler mental model, at the cost of not being able to tune one without the other.

---

## Tiers and numeric range

Both approaches share the same shape for their scale maps:

- **T-shirt tiers**: a map from tier name to a multiplier of the relevant unit. Tier names are `'xs' | 'sm' | 'md' | 'lg' | 'xl'` or `` `${number}xs` ``/`` `${number}xl` `` for extra tiers beyond those (e.g. `'2xs'`, `'10xl'`) — add or remove keys freely, there's no fixed list you must match.
- **Numeric range**: `numericScaleEnd` (coupled) or `numericScaleMicroEnd`/`numericScaleMacroEnd` (independent) set how far the numbered `--space-1`..`--space-N` scale goes. Lower it if you don't need the full range — it directly controls how many `--space-*` custom properties get generated.

---

## Quick checklist

- [ ] Picked `approach` deliberately, `'coupled'` and `'independent'` aren't interchangeable field-for-field
- [ ] Ran `node scripts/generateSpacing.ts` after any change
- [ ] Dev server compiles without errors
- [ ] Verify spacing still feels proportional at both ends of the viewport range in the styleguide
