# Customizing the Type Scale

## Overview

The fluid type scale is config-driven, not hand-edited SCSS:

| File                                                      | What you do there                                                     |
| --------------------------------------------------------- | --------------------------------------------------------------------- |
| [`trimscale.config.ts`](../trimscale.config.ts)           | Edit `fluidScale`, `modularTypographicScale`, and `semanticFontSizes` |
| `scripts/generateFluidScale.ts` / `generateTypography.ts` | Regenerated automatically, never edit the output by hand              |

After changing any of these fields, run:

```bash
npx trimscale-css generate
```

This rewrites `styles/abstracts/variables/_fluid-scale.scss` and `styles/abstracts/variables/_typography.scss`, which together produce every `--fs-*` and semantic size token (see [design-tokens.md](design-tokens.md#typography-tokens)).

## The viewport range: `fluidScale`

Sets the two endpoints every fluid clamp() interpolates between:

```ts
fluidScale: {
  minWidth: 360,
  maxWidth: 1440,
  minFontSize: 16,
  maxFontSize: 20,
  minTypeScale: 1.2,    // scale name (e.g. "Minor Third") or a raw ratio
  maxTypeScale: 1.333,  // scale name (e.g. "Perfect Fourth") or a raw ratio
  precision: 4,         // decimal precision, 1-6
},
```

`minTypeScale`/`maxTypeScale` accept either a named ratio (`'Minor Second'`, `'Major Second'`, `'Minor Third'`, `'Major Third'`, `'Perfect Fourth'`, `'Augmented Fourth'`, `'Perfect Fifth'`, `'Golden Ratio'`) or the numeric ratio directly. At `minWidth`, text uses `minFontSize` and grows by `minTypeScale` per step; at `maxWidth`, it uses `maxFontSize` and `maxTypeScale`. Between the two, every step interpolates continuously via `clamp()`, not just the endpoints.

## The scale steps: `modularTypographicScale`

Each entry becomes one `--fs-*` custom property:

```ts
modularTypographicScale: {
  fs900: { step: 6, unit: 'vwx', uncapped: true },
  fs800: { step: 5, unit: 'vwx', uncapped: true },
  fs700: { step: 4, unit: 'vwx' },
  fs600: { step: 3, unit: 'vwx' },
  fs500: { step: 2, unit: 'vwx' },
  fs400: { step: 1, unit: 'vwx' },
  fs350: { step: 0.5, unit: 'vwx' },
  fs300: { step: 0, unit: 'vwx' },   // 0 = fluidScale's base font size
  fs200: { step: -1, unit: 'vwx' },
  fs100: { step: -2, unit: 'vwx' },
},
```

`step` is the exponent in the modular-scale formula (fractional steps like `0.5` are valid, that's how `fs350` sits halfway between `fs300` and `fs400`). `unit` picks which viewport unit drives the interpolation, `'vwx'` (the adaptive custom viewport unit, see [design-tokens.md](design-tokens.md#base-tokens)) is the default; `'vw'`, `'cqw'`, and `'cqi'` are also valid for container-relative or plain-viewport variants. Add or remove keys freely, `fs900`..`fs100` is just the default naming.

### Uncapped steps: `uncapped`

Every scale step normally resolves to a `clamp()`, so growth stops at `fluidScale.maxWidth`. Setting `uncapped: true` on a step additionally generates a second token, `--fs-*-uncapped`, built with `max()` instead: it keeps growing past `maxWidth` rather than being capped there. Use it for display/hero text that should keep scaling up on very large viewports; leave it off (the default) for anything where you want the size to settle at a fixed maximum, which is most of the scale.

The default config sets `uncapped: true` on `fs900` and `fs800` only, giving you `--fs-900`/`--fs-900-uncapped` and `--fs-800`/`--fs-800-uncapped` side by side, so you pick whichever fits a given use of that step.

## Semantic aliases: `semanticFontSizes`

Named roles (`display1`, `heading1`, `textBase`, ...) that generate the friendlier custom properties (`--display-1`, `--heading-1`, `--text-base`, ...) components actually use:

```ts
semanticFontSizes: {
  display1: { type: 'scale', from: 'fs900' },
  heading1: { type: 'scale', from: 'fs700' },
  textBase: { type: 'scale', from: 'fs300' },
  textSm: { type: 'linear', from: 'textBase', multiplier: 0.875 },
  textXs: { type: 'linear', from: 'textBase', multiplier: 0.75 },
},
```

Two entry shapes:

- `{ type: 'scale', from: '...' }` aliases directly to a `modularTypographicScale` key, e.g. `display1: { type: 'scale', from: 'fs900' }` makes `--display-1` resolve to `var(--fs-900)`.
- `{ type: 'linear', from: 'roleKey', multiplier: N }` multiplies another `semanticFontSizes` role via `calc()` instead of getting its own fluid clamp, use this for sizes that should track a role proportionally (like `textSm`/`textXs` tracking `textBase`) rather than scale independently.

## Quick checklist

- [ ] `minFontSize`/`maxFontSize` and `minTypeScale`/`maxTypeScale` chosen deliberately, these compound: a small ratio change swings the largest scale steps a lot more than the smallest
- [ ] Every `from` in `modularTypographicScale`/`semanticFontSizes` points at a key that actually exists
- [ ] Ran `npx trimscale-css generate` after any change
- [ ] Dev server compiles without errors
- [ ] Checked the scale at both ends of the viewport range in the styleguide, a ratio that looks right at 1440px can look cramped or excessive at 360px
