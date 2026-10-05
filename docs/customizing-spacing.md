# Customizing Spacing

This guide explains the two spacing growth models trimscale-css supports, and how to switch between them or tune either one.

## Overview

Spacing is config-driven, not hand-edited SCSS, but `styles/tokens/_base-tokens.scss` and `styles/tokens/_spacing-tokens.scss` themselves are static files (they branch on `var.$spacing-approach` etc. via `@if`), not regenerated per project:

| File | What you do there |
|------|-------------------|
| [`trimscale.config.ts`](../templates/trimscale.config.ts) | Edit the `spacingSetup` field |
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

The two units give two token namespaces:

- `--space-*` is the fluid scale, multiples of `--unit-macro`, from `tShirtScaleMacro` and `numericScaleMacroEnd`. It covers the whole range, from `3xs` to `9xl`.
- `--space-fixed-*` is the static scale, multiples of `--unit-micro`, from `tShirtScaleMicro` and `numericScaleMicroEnd`. It is a separate set for the places where a value must not grow with the viewport.

The two maps may share keys, and do by default: `sm` in both gives a fluid `--space-sm` (16px → 32px) and a fixed `--space-fixed-sm` (16px everywhere). Both start at the same value at `fluidScale.minWidth`, since both units equal `baseGridSize` there.

```ts
spacingSetup: {
  baseGridSize: 4,
  approach: 'independent',
  tShirtScaleMicro: { // --space-fixed-*
    '3xs': 1, '2xs': 2, xs: 3, sm: 4, md: 5, lg: 6, xl: 8,
  },
  tShirtScaleMacro: { // --space-*
    '3xs': 1, '2xs': 2, xs: 3, sm: 4, md: 5, lg: 6, xl: 8,
    '2xl': 10, '3xl': 12, '4xl': 14, '5xl': 16, '6xl': 20,
    '7xl': 24, '8xl': 28, '9xl': 32,
  },
  numericScaleMicroEnd: 8,   // --space-fixed-1 .. --space-fixed-8
  numericScaleMacroEnd: 32,  // --space-1 .. --space-32
  // macroRangeMultiplier: 2, // optional, defaults to 2, must be > 1
}
```

| Tokens                                         | From                   | Unit                    |
| ---------------------------------------------- | ---------------------- | ----------------------- |
| `--space-3xs` … `--space-9xl`                  | `tShirtScaleMacro`     | `--unit-macro` (fluid)  |
| `--space-1` … `--space-32`                     | `numericScaleMacroEnd` | `--unit-macro` (fluid)  |
| `--space-fixed-3xs` … `--space-fixed-xl`       | `tShirtScaleMicro`     | `--unit-micro` (static) |
| `--space-fixed-1` … `--space-fixed-8`          | `numericScaleMicroEnd` | `--unit-micro` (static) |

Both maps are free to hold any tiers: the fixed scale doesn't have to stop at `xl`, and the fluid one doesn't have to start at `3xs`. Each also gets utility classes, `.p-sm` for the fluid step and `.p-fixed-sm` for the fixed one, see [utility-classes.md](utility-classes.md#spacing).

**Use this when** you want to tune how aggressively text grows (`fluidScale`'s type-scale ratio) without spacing following along at the same rate, the two systems can be adjusted independently.

### `'coupled'`

Spacing and text scale in lockstep. A single `--unit` (`fluidScale`'s base font-size ÷ `baseGridSize`) drives every tier: the Utopia.fyi-style model.

`--unit` itself isn't rounded, each `--space-*` rounds its own product to the nearest whole pixel instead: `round(nearest, calc(var(--unit) * 4), 1px)`. Rounding `--unit` would move every tier in the same single jump (it only spans 4px → 5px by default), while rounding per tier lets `--space-sm` climb 16, 17, 18, 19, 20. Whole pixels matter most for horizontal spacing, where a fractional `padding-inline` shifts where text starts.

```ts
spacingSetup: {
  baseGridSize: 4,
  approach: 'coupled',
  tShirtScale: {
    '3xs': 1, '2xs': 2, xs: 3, sm: 4, md: 5, lg: 6, xl: 8,
    '2xl': 10, '3xl': 12, '4xl': 14, '5xl': 16, '6xl': 20,
    '7xl': 24, '8xl': 28, '9xl': 32,
  },
  numericScaleEnd: 32,  // --space-1 .. --space-32 all use --unit
}
```

The multipliers match the fluid scale in the independent example above, only the unit differs. `--unit` is a much narrower range (`4px` at 360px viewport → `5px` at 1440px, since it's `fluidScale.minFontSize / 4` to `fluidScale.maxFontSize / 4` at the default `baseGridSize: 4`) than `--unit-macro`'s `4px → 8px` (its default `macroRangeMultiplier` of `2`), so the same tier grows less: `--space-9xl` ends at `160px` here and at `256px` under `'independent'`. Raise the multipliers if you want coupled tiers to reach similar pixel values. There is no `--space-fixed-*` under `'coupled'`.

Switching from `'coupled'` to `'independent'` keeps every `--space-*` name and its fluid behavior, and adds the `--space-fixed-*` scale on top.

**Use this when** you want spacing to visually "breathe" with text at the same rate everywhere: a simpler mental model, at the cost of not being able to tune one without the other.

---

## Tiers and numeric range

Both approaches share the same shape for their scale maps:

- **T-shirt tiers**: a map from tier name to a multiplier of the relevant unit. Tier names are `'xs' | 'sm' | 'md' | 'lg' | 'xl'` or `` `${number}xs` ``/`` `${number}xl` `` for extra tiers beyond those (e.g. `'2xs'`, `'10xl'`): add or remove keys freely, there's no fixed list you must match.
- **Numeric range**: `numericScaleEnd` (coupled) or `numericScaleMacroEnd` (independent) sets how far the numbered `--space-1`..`--space-N` scale goes, and `numericScaleMicroEnd` (independent) how far `--space-fixed-1`..`--space-fixed-N` goes. Both start at `1`. Lower them if you don't need the full range: they directly control how many custom properties and utility classes get generated, and `0` generates none.

---

## Quick checklist

- [ ] Picked `approach` deliberately, `'coupled'` and `'independent'` aren't interchangeable field-for-field
- [ ] Ran `npx trimscale-css generate` after any change
- [ ] Dev server compiles without errors
- [ ] Verify spacing still feels proportional at both ends of the viewport range in the browser
