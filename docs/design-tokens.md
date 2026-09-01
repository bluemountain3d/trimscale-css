# Design Tokens

All tokens are CSS custom properties scoped to `:root` inside the `tokens` cascade layer (see [cascade-layers.md](cascade-layers.md)), generated from [`trimscale.config.ts`](../trimscale.config.ts) by `npx trimscale-css generate` (see [getting-started.md](getting-started.md)).

Every specific number in the tables below (px values, ratios, scale steps, tiers) is the shipped _default_ config's value, not a fixed characteristic of the system. Change any of them in `trimscale.config.ts` and re-generate, see the `customizing-*.md` guides linked throughout for how.

## Base Tokens

| Token          | Description                                                                                                                                                                                                                                                                                                        |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `--vwx`        | Adaptive viewport unit. `1vw` normally; switches to `2vh` on ultrawide screens (≥ 21:9 ratio + ≥ 944 px height by default, `ultrawideHeightThresholdPx` in the config) to prevent runaway scaling                                                                                                                                       |
| `--fluid-base` | Base font size. Scales between `fluidScale.minFontSize` and `maxFontSize` (16px to 20px by default) using `clamp()`                                                                                                                                                                                                |
| `--unit-micro` | Base spacing unit for small steps, fixed at `spacingSetup.baseGridSize` (default `4`), not fluid. Always a whole pixel                                                                                                                                                                                                       |
| `--unit-macro` | Base spacing unit for large steps, an independent fluid clamp (`get-fluid-clamp(baseGridSize, baseGridSize × macroRangeMultiplier)`), rounded to the nearest pixel. Scales `baseGridSize` (default `4`) up to `baseGridSize × spacingSetup.macroRangeMultiplier` (multiplier default `2`, so `8` at the default base) across `fluidScale`'s viewport range (`minWidth`–`maxWidth`) |

**Why `--vwx` exists:** plain `vw`-based scaling grows with viewport width forever, on very wide (ultrawide) monitors that makes text and spacing balloon past what's readable. Past a threshold, `--vwx` switches from `1vw` to `2vh`, capping growth against height instead. Every fluid function defaults to the `'vwx'` unit key, so this one custom property fixes ultrawide scaling everywhere at once, no per-function changes needed.

`--unit-micro` and `--unit-macro` only exist under the `'independent'` spacing approach. See [customizing-spacing.md](customizing-spacing.md) for the `'coupled'` alternative, which generates a single `--unit` instead.

## Spacing Tokens

Spacing tokens are multiples of `--unit-micro` or `--unit-macro`. `--unit-micro` is fixed, so sizes built from it are fixed too; `--unit-macro` is a fluid clamp, so sizes built from it scale with the viewport. Both units are `4px` at their minimum, so the table below is accurate for all sizes at the low end, only the macro-based sizes grow from there.

**T-shirt sizes** (default config):

| Token         | Multiplier | Base value (360 px viewport) | Base value (1440 px viewport) |
| ------------- | ---------- | ---------------------------- | ----------------------------- |
| `--space-3xs` | × 1        | 4 px                         | 4 px                          |
| `--space-2xs` | × 2        | 8 px                         | 8 px                          |
| `--space-xs`  | × 3        | 12 px                        | 12 px                         |
| `--space-sm`  | × 4        | 16 px                        | 16 px                         |
| `--space-md`  | × 5        | 20 px                        | 20 px                         |
| `--space-lg`  | × 6        | 24 px (fixed)                | 24 px (fixed)                 |
| `--space-xl`  | × 6        | 24 px                        | 48 px                         |
| `--space-2xl` | × 8        | 32 px                        | 64 px                         |
| `--space-3xl` | × 10       | 40 px                        | 80 px                         |
| `--space-4xl` | × 12       | 48 px                        | 96 px                         |
| `--space-5xl` | × 16       | 64 px                        | 128 px                        |
| `--space-6xl` | × 20       | 80 px                        | 160 px                        |
| `--space-7xl` | × 24       | 96 px                        | 192 px                        |
| `--space-8xl` | × 28       | 112 px                       | 224 px                        |
| `--space-9xl` | × 32       | 128 px                       | 256 px                        |

**Numeric scale:** `--space-1` through `--space-48` by default. `--space-1` through `--space-6` equal `calc(var(--unit-micro) * N)`; `--space-7` through `--space-48` equal `calc(var(--unit-macro) * N)`. All of this is config driven, see [customizing-spacing.md](customizing-spacing.md) to change tiers, the numeric range, or switch growth model entirely.

## Typography Tokens

**Modular scale levels,** all computed with `clamp()` from Minor Third at mobile to Perfect Fourth at desktop by default. Both the ratios and the underlying viewport/font-size range are set in `trimscale.config.ts`'s `fluidScale`, not fixed characteristics of the system. See [customizing-type-scale.md](customizing-type-scale.md).

| Token      | Scale step | Role                             |
| ---------- | ---------- | -------------------------------- |
| `--fs-100` | −2         | Smallest (legal, captions)       |
| `--fs-200` | −1         | Small (secondary info, metadata) |
| `--fs-300` | 0          | Base font size                   |
| `--fs-350` | +0.5       | Slightly emphasized text         |
| `--fs-400` | +1         | Emphasized text                  |
| `--fs-500` | +2         | Small heading                    |
| `--fs-600` | +3         | Medium heading                   |
| `--fs-700` | +4         | Large heading                    |
| `--fs-800` | +5         | Extra large heading              |
| `--fs-900` | +6         | Display heading                  |

`--fs-900` and `--fs-800` also ship an uncapped sibling by default, `--fs-900-uncapped` and `--fs-800-uncapped`, built with `max()` instead of `clamp()` so they keep growing past `fluidScale.maxWidth` rather than settling at a fixed size. Useful for hero/display text on very large viewports; the plain `--fs-900`/`--fs-800` stay capped for everywhere else. Controlled per step via `uncapped: true` in `modularTypographicScale`, see [customizing-type-scale.md](customizing-type-scale.md#uncapped-steps-uncapped).

**Semantic size aliases:**

| Token         | Value                                                    |
| ------------- | -------------------------------------------------------- |
| `--display-1` | `--fs-900`                                               |
| `--display-2` | `--fs-800`                                               |
| `--heading-1` | `--fs-700`                                               |
| `--heading-2` | `--fs-600`                                               |
| `--heading-3` | `--fs-500`                                               |
| `--heading-4` | `--fs-400`                                               |
| `--text-lg`   | `--fs-400`                                               |
| `--text-md`   | `--fs-350` a half-step between `--fs-300` and `--fs-400` |
| `--text-base` | `--fs-300`                                               |
| `--text-sm`   | `--fs-300 × 0.875`                                       |
| `--text-xs`   | `--fs-300 × 0.75`                                        |

The `text-*` tokens intentionally do not follow the modular scale below base. Using the scale steps `--fs-200` and `--fs-100` for body text variants would shrink too aggressively, at mobile with the default 1.2 ratio, `--fs-200` is already ~13 px and `--fs-100` ~11 px. Instead, `--text-sm` and `--text-xs` are gentle fractions of `--text-base`, giving you predictable and readable small text. The `--fs-100` and `--fs-200` tokens remain available for cases where that level of size contrast is genuinely needed, such as legal disclaimers or dense data tables. All of this comes from `semanticFontSizes` in the config, see [customizing-type-scale.md](customizing-type-scale.md).

**Font families:** one `--font-family-{role}` custom property per key in `fontRoles` (`primary`, `secondary`, `tertiary`, `sans`, `serif`, `mono`, `display`, `heading`, `subheading`, `body`, `quote`, `code`, `ui`, plus any custom roles you add). See [adding-a-font.md](adding-a-font.md).

**Font weights:** `--font-weight-thin` (100) through `--font-weight-black` (900) by default, from `fontWeights` in the config.

**Line heights:** `--line-height-100` through `--line-height-200` by default, named by value × 100, stored as a unitless `<number>` (e.g. `--line-height-155` = `1.55`), from `lineHeights` in the config.

These static tokens are opt-in. By default, text styled through `font-setup` or any `%*-text` placeholder gets a _dynamic_, self-scaling line-height instead, computed once by the `dynamic-line-height()` Sass function (see [abstracts.md](abstracts.md)) and exposed as the `--line-height-dynamic` token, unless you pass an explicit `$line-height` to `font-setup` or a `--line-height-*` token. The curve itself (where the ratio is pinned, where it bottoms out, its cap for small sizes) comes from `dynamicLineHeight` in the config, every field optional and independently defaulted, see [full-config-reference.md#dynamiclineheight](full-config-reference.md#dynamiclineheight).

`--text-base` (and every other `semanticFontSizes` entry) is optional in the config type, unlike `fontRoles.primary`/`body` which are required. `body`'s own `font-size: var(--text-base, 1rem)` in `styles/base/_typography.scss` falls back to a plain `1rem` if you never define `semanticFontSizes.textBase`, this is intentional, not a bug, but worth knowing if body text looks unexpectedly static-sized.

## Color Tokens

The token _names_ below (`surface-base`, `accent`, `text-muted`, etc.) come from `baseColorTokens`, `customColorTokens` (an optional field, not present in the starter template, for extra palettes such as a `campaign` palette), and `semanticColorAliases` in `trimscale.config.ts`. The starter palette shipped in the default config is meant to be replaced with your own values, not treated as fixed brand colors.

Each `baseColorTokens`/`customColorTokens` entry is a hand-picked `{ oklch, hex }` pair per light/dark mode, there's no build step deriving them from a single source color. [oklch.com](https://oklch.com/) is a convenient picker for choosing the OKLCH values and reading off the matching hex.

`semanticColorAliases` entries don't need their own hand-picked pair: instead of duplicating oklch math for a near-duplicate color, they reference an existing token by name and can adjust its `opacity` (absolute) and `lightnessMultiplier`/`chromaMultiplier` (multipliers, not absolute values), via the `get-color-token()` function (see [abstracts.md](abstracts.md)) under the hood.

**`body`'s text color reads `--color-text-primary`, with a `#000` fallback** (`styles/base/_typography.scss`), same pattern as `font-size`/`--text-base` above. The default config doesn't ship a `text-primary` entry in `baseColorTokens`/`semanticColorAliases` yet, so out of the box the fallback is what actually applies. Add one to get `body` text properly theme-aware via `light-dark()` instead of a static black.

Colors use `light-dark()` for automatic theme switching driven by `prefers-color-scheme`. You can override the automatic detection by adding a class to `:root`:

```html
<html class="theme-light">
  <!-- force light -->
</html>
<html class="theme-dark">
  <!-- force dark -->
</html>
```

Every token gets a triple-layered fallback (plain hex → static `oklch()` → `light-dark(oklch(), oklch())`) so the palette degrades gracefully on older browsers, plus a typed `@property` registration so invalid overrides fail safe to the fallback color instead of silently breaking the cascade. This is generated by `mx.generate-color-tokens` under the hood, see [abstracts.md](abstracts.md) for the mixin itself and how to add your own token map alongside the config-driven defaults.
