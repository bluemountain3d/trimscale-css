# Full Config Reference

A single-page index of every property in [`trimscale.config.ts`](../trimscale.config.ts), in the same order they appear in `const config`. Each section is a quick lookup, not the full explanation, follow the link for rationale, examples, and how a property affects the generated output.

## `outDir`

Where `trimscale-css generate` writes this project's generated bridge file (and, if any font sources need `@font-face` rules, `_fonts.scss`'s data), relative to this config file. Never `node_modules`.

| Property | Type     | Required | Description                                                                             |
| -------- | -------- | :------: | --------------------------------------------------------------------------------------- |
| `outDir` | `string` |    No    | Output directory, relative to `trimscale.config.ts`. Default `'./trimscale-generated'`. |

→ Full guide: [getting-started.md](getting-started.md#generate)

## `appFonts`

Font sources (local file, CDN URL, or hand-entered metrics) keyed by family name, plus `next/font` integration settings.

| Property          | Type                         | Required | Description                                                                                                                                                 |
| ----------------- | ---------------------------- | :------: | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `fonts`           | `Record<string, FontSource>` |   Yes    | Font sources keyed by family name. `FontSource` is a discriminated union on `source`: `'local'`, `'cdn'`, or `'manual'`, shape depends on which.             |
| `nextFontDefault` | `boolean`                    |    No    | Whether `family` values build around a `next/font` CSS variable by default. A family's own `nextFont` overrides this for just that family. Default `false`. |
| `nextFontPrefix`  | `string`                     |    No    | Prefix half of the `next/font` CSS variable name (`--{prefix}-{family}`). Default `'next-font'`.                                                            |
| `fallbackDefault` | `FontFallbacks`              |   Yes    | Fallback stack used when a family has no `fallback` of its own. One of `'sans-serif'`, `'serif'`, `'monospace'`, `'system-ui'`, or `'cursive'`.              |

→ Full guide: [adding-a-font.md](adding-a-font.md) (sources, `@font-face` rules) · [using-with-nextjs.md](using-with-nextjs.md) (`next/font` integration)

## `fontRoles`

Maps semantic roles to a family name from `appFonts.fonts`. A family not mapped to any role still gets metrics generated, but no `--font-family-*` token.

| Property                                                                                                                  | Type     | Required | Description                               |
| ------------------------------------------------------------------------------------------------------------------------- | -------- | :------: | ----------------------------------------- |
| `primary`, `body`                                                                                                         | `string` |   Yes    | The two required roles.                   |
| `secondary`, `tertiary`, `sans`, `serif`, `mono`, `display`, `heading`, `subheading`, `decorative`, `quote`, `code`, `ui` | `string` |    No    | Optional built-in roles.                  |
| `[customRole: string]`                                                                                                    | `string` |    No    | Any other role name, via index signature. |

→ Full guide: [adding-a-font.md](adding-a-font.md#map-to-roles)

## `breakpoints`

Named viewport breakpoints (px), converted to rem for the `$breakpoints` SCSS map. Must be added smallest to largest.

| Property                                                       | Type     | Required | Description                    |
| -------------------------------------------------------------- | -------- | :------: | ------------------------------ |
| `mobile`, `phablet`, `tablet`, `tabletLg`, `laptop`, `desktop` | `number` |    No    | Built-in breakpoints, px.      |
| `[customBreakpoint: string]`                                   | `number` |    No    | Any other breakpoint name, px. |

→ Full guide: [customizing-breakpoints.md](customizing-breakpoints.md)

## `ultrawideHeightThresholdPx`

Viewport height (px) threshold for the `--vwx` ultrawide switch-over, paired with a fixed ≥ 21:9 aspect-ratio check.

| Property                    | Type     | Required | Description                                             |
| ---------------------------- | -------- | :------: | -------------------------------------------------------- |
| `ultrawideHeightThresholdPx` | `number` |    No    | Height (px) past which `--vwx` switches to `2vh`. Default `944`. |

→ Full guide: [design-tokens.md#base-tokens](design-tokens.md#base-tokens)

## `fluidScale`

The fluid `clamp()` boundaries every fluid font-size and `--unit-macro` interpolates across.

| Property                       | Type                                | Required | Description                                                                             |
| ------------------------------ | ----------------------------------- | :------: | --------------------------------------------------------------------------------------- |
| `minWidth`, `maxWidth`         | `number`                            |   Yes    | Viewport width range (px) the clamp interpolates across.                                |
| `minFontSize`, `maxFontSize`   | `number`                            |   Yes    | Base font-size range (px) at those widths.                                              |
| `minTypeScale`, `maxTypeScale` | `TypeScaleNames` or `TypeScaleValues` |   Yes    | Modular-scale ratio at each end, a name (`'Minor Third'`) or its numeric value (`1.2`). |
| `precision`                    | integer `1`–`6`        |   Yes    | Decimal places in generated clamp() values.                                             |

→ Full guide: [customizing-type-scale.md](customizing-type-scale.md)

## `modularTypographicScale`

The base scale (`fs100`..`fs900`), each entry a `--fs-*` fluid clamp() built from `step` and `unit`.

| Property                       | Type        | Required | Description                                                                                                                                                                                                                                                                                                                               |
| ------------------------------ | ----------- | :------: | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `fs100`..`fs900` (and `fs350`) | `ScaleStep` |    No    | `{ step: number, unit: string, uncapped?: boolean }`, `unit` is `'vwx'`, `'cqw'`, `'cqi'`, or `'vw'`. `step` is the modular-scale exponent (`0` = `fluidScale`'s base font-size). `uncapped: true` additionally generates a `--fs-*-uncapped` token using `max()` instead of `clamp()`, so it keeps growing past `fluidScale.maxWidth` instead of capping there. |
| `[customRole: string]`         | `ScaleStep` |    No    | Any other scale step name.                                                                                                                                                                                                                                                                                                                |

→ Full guide: [customizing-type-scale.md](customizing-type-scale.md)

## `semanticFontSizes`

Named roles (`display1`, `heading1`, `textBase`, etc.) generating `--display-1`, `--text-base`, etc.

| Property                                                                                          | Type       | Required | Description                                                                                                                                                                                    |
| ------------------------------------------------------------------------------------------------- | ---------- | :------: | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `display1`, `display2`, `heading1`-`heading4`, `textLg`, `textMd`, `textBase`, `textSm`, `textXs` | `SizeStep` |    No    | `{ type: 'scale', from: string }` aliases a `modularTypographicScale` key, or `{ type: 'linear', from: string, multiplier: number }` multiplies another `semanticFontSizes` role via `calc()`. |
| `[customRole: string]`                                                                            | `SizeStep` |    No    | Any other size role name.                                                                                                                                                                      |

→ Full guide: [customizing-type-scale.md](customizing-type-scale.md)

## `fontWeights`

Named weight scale generating `--font-weight-*` custom properties.

| Property                                                                                    | Type     | Required | Description                     |
| ------------------------------------------------------------------------------------------- | -------- | :------: | ------------------------------- |
| `thin`, `extralight`, `light`, `normal`, `medium`, `semibold`, `bold`, `extrabold`, `black` | `number` |    No    | Built-in weight names, 100–900. |
| `[customRole: string]`                                                                      | `number` |    No    | Any other weight name.          |

→ Full guide: [design-tokens.md#typography-tokens](design-tokens.md#typography-tokens)

## `lineHeights`

Named line-height scale generating `--line-height-*` custom properties.

| Property        | Type     | Required | Description                                                                                           |
| --------------- | -------- | :------: | ----------------------------------------------------------------------------------------------------- |
| `[key: string]` | `number` |    No    | Key is a percent-based label (e.g. `'125'`), value is the unitless ratio it represents (e.g. `1.25`). |

→ Full guide: [design-tokens.md#typography-tokens](design-tokens.md#typography-tokens)

## `dynamicLineHeight`

Optional. Curve for the self-scaling `--line-height-dynamic` token. Every field falls back to its own default independently.

| Property     | Type     | Required | Description                                                                    |
| ------------ | -------- | :------: | ------------------------------------------------------------------------------- |
| `fsBase`     | `number` |    No    | Font-size (px) where `ratioBase` applies exactly. Default `16`.                 |
| `ratioBase`  | `number` |    No    | Line-height ratio at `fsBase`. Default `1.5`.                                   |
| `fsCeil`     | `number` |    No    | Font-size (px) at/beyond which the ratio bottoms out at `ratioCeil`. Must differ from `fsBase`. Default `64`. |
| `ratioCeil`  | `number` |    No    | Ratio for large font-sizes (at/beyond `fsCeil`). Must not exceed `ratioCap`. Default `1.05`. |
| `ratioCap`   | `number` |    No    | Ratio for small font-sizes (below the natural crossover point). Default `1.6`.  |

→ Full guide: [design-tokens.md#typography-tokens](design-tokens.md#typography-tokens) · function reference: [abstracts.md](abstracts.md)

## `spacingSetup`

How `--space-*` tokens grow across viewport widths. A discriminated union on `approach`, the two shapes aren't combinable.

| Property                                       | Type                                   | Required | Applies to    | Description                                                      |
| ---------------------------------------------- | -------------------------------------- | :------: | ------------- | ---------------------------------------------------------------- |
| `baseGridSize`                                 | `4` or `8`                              |    No    | Both          | The base spacing grid unit (px). Default `4`.                    |
| `approach`                                     | `'coupled'` or `'independent'`           |   Yes    | Both          | Picks the growth model, see the guide for the full comparison.   |
| `tShirtScale`                                  | `Partial<Record<TShirtScale, number>>` |   Yes    | `coupled`     | Tier → multiplier of `--unit`.                                   |
| `numericScaleEnd`                              | `number`                               |   Yes    | `coupled`     | Upper bound of the numbered `--space-1`..`N` scale.              |
| `macroRangeMultiplier`                         | one of `1.25`, `1.5`, `1.75`, `2`, `2.25`, `2.5`, `2.75`, `3`, `3.25`, `3.5`, `3.75`, `4` |    No    | `independent` | Multiplier of `baseGridSize` giving `--unit-macro`'s ceiling (px). Default `2`. |
| `tShirtScaleMicro`, `tShirtScaleMacro`         | `Partial<Record<TShirtScale, number>>` |   Yes    | `independent` | Tier → multiplier of `--unit-micro`/`--unit-macro` respectively. |
| `numericScaleMicroEnd`, `numericScaleMacroEnd` | `number`                               |   Yes    | `independent` | Upper bounds of the micro/macro segments of the numbered scale.  |

→ Full guide: [customizing-spacing.md](customizing-spacing.md)

## `defaultScheme`

| Property        | Type                | Required | Description                                                                                            |
| --------------- | ------------------- | :------: | ------------------------------------------------------------------------------------------------------ |
| `defaultScheme` | `'light'` or `'dark'` |   Yes    | Which scheme backs the static hex fallback tier for browsers without `oklch()`/`light-dark()` support. |

→ Full guide: [design-tokens.md#color-tokens](design-tokens.md#color-tokens)

## `baseColorTokens`

The base color palette, generates `--{prefix}-{name}` custom properties.

| Property                  | Type                         | Required | Description                                                                            |
| ------------------------- | ---------------------------- | :------: | -------------------------------------------------------------------------------------- |
| `prefix`                  | `string`                     |   Yes    | Custom-property prefix, e.g. `'color'` → `--color-*`.                                  |
| `tokens`                  | `Record<string, ColorToken>` |   Yes    | Token name → `{ light: ColorDefinition, dark: ColorDefinition, opacity?: number }`.    |
| `tokens[x].light`/`.dark` | `ColorDefinition`            |   Yes    | `{ oklch: string, hex: string }`, `oklch` used directly, `hex` is the static fallback. |
| `tokens[x].opacity`       | `number`                     |    No    | Shared opacity (0–1) applied to both modes.                                            |

→ Full guide: [design-tokens.md#color-tokens](design-tokens.md#color-tokens)

## `customColorTokens`

Optional. Any number of extra palettes alongside `baseColorTokens`, keyed by whatever name you like (the shipped example config includes `campaign`).

| Property            | Type                             | Required | Description                                                                                                |
| ------------------- | -------------------------------- | -------- | ---------------------------------------------------------------------------------------------------------- |
| `customColorTokens` | `Record<string, ColorTokensMap>` | No       | Palette name → `{ prefix: string, tokens: Record<string, ColorToken> }` (same shape as `baseColorTokens`). |

Referenced in `semanticColorAliases` via `tokenMap`, using the same name.

→ Full guide: [design-tokens.md#color-tokens](design-tokens.md#color-tokens)

## `semanticColorAliases`

Optional. Semantic names (e.g. `'text-muted'`) aliasing a token from `baseColorTokens` or a `customColorTokens` palette.

| Property    | Type                                        | Required | Description                                                       |
| ----------- | ------------------------------------------- | :------: | ----------------------------------------------------------------- |
| `token`     | `string`                                    |   Yes    | Token name to alias, looked up in `tokenMap`.                     |
| `tokenMap`  | `string`        |    No    | `'baseColorTokens'` (default), or a key into `customColorTokens`. |
| `opacity`   | `number`                                    |    No    | Opacity (0–1) applied to all oklch/hex variants.                  |
| `lightnessMultiplier` | `number` or `{ light: number, dark: number }` |    No    | Multiplier applied to the token's current lightness, single or per-mode. Not an absolute lightness value.           |
| `chromaMultiplier`    | `number` or `{ light: number, dark: number }` |    No    | Multiplier applied to the token's current chroma, single or per-mode. Not an absolute chroma value.           |

→ Full guide: [design-tokens.md#color-tokens](design-tokens.md#color-tokens) · derivation mechanics: [abstracts.md](abstracts.md#fnget-color-tokentoken-tokens-opacity-lightness-multiplier-chroma-multiplier)
