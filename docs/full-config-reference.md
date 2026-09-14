# Full Config Reference

A single-page index of every property in [`trimscale.config.ts`](../templates/trimscale.config.ts), in the same order they appear in `const config`. Each section is a quick lookup, not the full explanation, follow the link for rationale, examples, and how a property affects the generated output.

## `output`

Optional. Where and what `trimscale-css generate` writes: the output directory (never `node_modules`), whether the SCSS bridge file and/or a standalone CSS file are written, and which utility-class groups to include (shared by both targets).

| Property            | Type                 | Required | Description                                                                              |
| -------------------- | -------------------- | :------: | ------------------------------------------------------------------------------------------ |
| `output.dir`         | `string`             |    No    | Output directory, relative to `trimscale.config.ts`. Default `'./trimscale-generated'`. |
| `output.scss`        | `boolean`            |    No    | Emit the SCSS bridge file. Default `true`.                                              |
| `output.css`         | `boolean` or object  |    No    | Emit a standalone, pre-compiled `.css` file. Default `false`. See below.                |
| `output.utilities`   | `boolean` or object  |    No    | Which utility-class groups to generate, shared by every output target. See below.       |
| `output.reset`       | `boolean`            |    No    | Emit the package's own `@layer reset` block. Default `true`. Not about size, see [cascade-layers.md](cascade-layers.md#turning-off-the-built-in-reset) for what you take on by turning it off. |

`output.scss` and `output.css` can both be `true` at once (the normal case while migrating from one to the other, or during development of this package itself), but not both `false`, `loadConfig` throws if so, since there would be nothing to generate.

### `output.css`

Optional. A standalone, pre-compiled `.css` file for consumers who don't want to configure Sass at all, an alternative output target alongside (or instead of) the SCSS bridge file. Requires a Sass compiler (`sass-embedded` or `sass`) installed in your project at generate time, the same one your bundler already needs for the SCSS build. See [getting-started.md](getting-started.md#standalone-css-output) for what is and isn't in the file.

| Property                  | Type      | Required | Description                                                                                     |
| --------------------------- | --------- | :------: | --------------------------------------------------------------------------------------------------- |
| `output.css.minify`         | `boolean` |    No    | Also write a minified `trimscale.bundle.min.css` alongside the readable `trimscale.bundle.css`. Default `true`. |
| `output.css.fontUrlBase`    | `string`  |    No    | URL prefix for `@font-face src`, as the browser requests it. Default `'/fonts'`. Distinct from `appFonts.publicDir`, which governs where the SCSS build's `src` is rebased *from*, not what URL a standalone file requests. |

→ Full guide: [getting-started.md](getting-started.md#generate)

### `output.utilities`

Optional. Opt-out toggles for the config-driven utility-class groups in `styles/utilities/`. Every group defaults `true`, omitting this field (or any sub-flag within it) changes nothing. Setting a group to `false` also drops that section's fixed, non-looped classes (e.g. spacing's `.m-none`/`.mx-auto`), not just its scale loops. `utilities: false` turns every group off at once; tokens, the reset and the base element styles are unaffected.

| Property                                | Type      | Required | Description                                                       |
| ----------------------------------------- | --------- | :------: | -------------------------------------------------------------------- |
| `output.utilities.spacing`                | `boolean` or object |    No    | `true`/`false` for the whole group, or an object to toggle sub-groups individually (see below). |
| `output.utilities.spacing.base`           | `boolean` |    No    | `.m-none`, `.p-none`, `.mx-auto`, `.my-auto`, `.ml-auto`, `.mr-auto`. |
| `output.utilities.spacing.tShirt`         | `boolean` |    No    | `.{m\|p}{side?}-{3xs..9xl}`.                                        |
| `output.utilities.spacing.numeric`        | `boolean` |    No    | `.{m\|p}{side?}-{1..numericScaleEnd}`.                               |
| `output.utilities.typography`             | `boolean` or object |    No    | `true`/`false` for the whole group, or an object to toggle sub-groups individually (see below). |
| `output.utilities.typography.trim`        | `boolean` |    No    | `.trim-text-*`.                                                     |
| `output.utilities.typography.family`      | `boolean` |    No    | `.font-family-*`.                                                   |
| `output.utilities.typography.size`        | `boolean` |    No    | `.font-size-*`.                                                     |
| `output.utilities.typography.lineHeight`  | `boolean` |    No    | `.line-height-*`, plus `.line-height-dynamic`.                      |
| `output.utilities.typography.weight`      | `boolean` |    No    | `.font-weight-*`.                                                   |
| `output.utilities.typography.style`       | `boolean` |    No    | `.font-style-*`.                                                    |
| `output.utilities.typography.textTransform` | `boolean` |    No    | `.text-transform-*`.                                                |
| `output.utilities.typography.textAlign`   | `boolean` |    No    | `.text-align-*`.                                                    |
| `output.utilities.typography.numericFigures` | `boolean` |    No    | `.num-*` (figure variants).                                         |
| `output.utilities.a11y`                   | `boolean` |    No    | `.sr-only`, `.sr-only-focusable`, `.focus-*`, `.skip-link`, `.aria-live-*`. Boolean only, not granular (see below). Not about size, see [utility-classes.md](utility-classes.md#accessibility) for why. |

`a11y` isn't nestable like `spacing`/`typography` because `.sr-only-focusable` and `.aria-live-*` `@extend .sr-only`: a partial opt-out (e.g. keeping `.sr-only` but dropping the live-region classes) would leave an `@extend` pointing at a selector that was never emitted, a hard Sass compile error, not a missing class.

→ Full guide: [utility-classes.md](utility-classes.md#opting-out-of-utility-classes)

## `appFonts`

Optional. Font sources (local file, CDN URL, or hand-entered metrics) keyed by family name, plus `next/font` integration settings. Omit the whole field to skip fonts entirely, the fluid type scale, spacing, breakpoints, and color tokens all work without it, you only lose leading trim and `--font-family-*` tokens (both need font metrics). When `appFonts` is present, `families`, `fontRoles`, and `defaultFallback` below are still required.

| Property          | Type                         | Required | Description                                                                                                                                                 |
| ----------------- | ---------------------------- | :------: | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `families`        | `Record<string, FontSource>` |   Yes    | Font sources keyed by family name; `source` picks the shape (`'local'`, `'cdn'`, or `'manual'`), see [adding-a-font.md](adding-a-font.md).                  |
| `fontRoles`       | `FontRoles`                  |   Yes    | Maps semantic roles to a family name from `families`. See table below.                                                                                       |
| `localFontsPath`  | `string`                     |    No    | Base folder, relative to this config file. A `local` family that omits `path` looks for its files under `localFontsPath/<family key>/` instead.             |
| `publicDir`       | `string`                     |    No    | Your bundler's static-passthrough folder (Vite/CRA/Astro: `'public'`, SvelteKit: `'static'`). Stripped as a leading segment from a `local` family's generated `@font-face` `src`. Default `'public'`.  |
| `nextFontDefault` | `boolean`                    |    No    | Whether `family` values build around a `next/font` CSS variable by default. A family's own `nextFont` overrides this for just that family. Default `false`. |
| `nextFontPrefix`  | `string`                     |    No    | Prefix half of the `next/font` CSS variable name (`--{prefix}-{family}`). Default `'next-font'`.                                                            |
| `defaultFallback` | `FontFallbacks`              |   Yes    | Fallback stack used when a family has no `fallback` of its own. One of `'sans-serif'`, `'serif'`, `'monospace'`, `'system-ui'`, or `'cursive'`.             |

→ Full guide: [adding-a-font.md](adding-a-font.md) (sources, `@font-face` rules) · [using-with-nextjs.md](using-with-nextjs.md) (`next/font` integration)

### `appFonts.families[x]` (per-family `FontSource`)

| Property           | Type                                                                            | Required | Applies to | Description                                                                                                        |
| ------------------ | -------------------------------------------------------------------------------- | :------: | ---------- | ------------------------------------------------------------------------------------------------------------------- |
| `source`           | `'local'` \| `'cdn'` \| `'manual'`                                              |   Yes    | All        | Picks the shape below.                                                                                             |
| `fallback`         | `FontFallback`                                                                  |    No    | All        | A generic keyword, or `{ matched: ... }` for a metric-matched `@font-face` override that cuts layout shift (CLS) during font-swap. Alternatives, not layers: `{ matched }` emits no generic. Defaults to `appFonts.defaultFallback`. |
| `nextFont`         | `boolean`                                                                       |    No    | All        | Overrides `appFonts.nextFontDefault` for this family only.                                                        |
| `path`             | `string[]`                                                                      |    No    | `local`    | Font file path(s), relative to this config file. Omit to use the `appFonts.localFontsPath` convention instead.   |
| `url`              | `string[]`                                                                      |   Yes    | `cdn`      | Direct font file URL(s), not a CSS-generating endpoint (e.g. not Google Fonts' `css2?family=...`).                |
| `generateFontFace` | `boolean`                                                                       |    No    | `cdn`      | Write `@font-face` rules pointing at `url` directly (self-hosting). Default `false`.                              |
| `metrics`          | `RawFontMetrics`                                                                |   Yes    | `manual`   | Hand-entered metrics from [precisionspec.dev](https://precisionspec.dev).                                          |

→ Full guide: [adding-a-font.md](adding-a-font.md), metric-matched fallbacks: [adding-a-font.md#metric-matched-fallback-fonts-fallback--matched-](adding-a-font.md#metric-matched-fallback-fonts-fallback--matched-)

### `appFonts.fontRoles`

Maps semantic roles to a family name from `appFonts.families`. A family not mapped to any role still gets metrics generated, but no `--font-family-*` token.

| Property                                                                                    | Type     | Required | Description                               |
| --------------------------------------------------------------------------------------------- | -------- | :------: | ----------------------------------------- |
| `primary`, `body`                                                                              | `string` |   Yes    | The two required roles.                   |
| `secondary`, `tertiary`, `display`, `heading`, `subheading`, `decorative`, `quote`, `code`, `ui`, `mono` | `string` |    No    | Optional built-in roles.                  |
| `[customRole: string]`                                                                         | `string` |    No    | Any other role name, via index signature. |

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

| Property                     | Type     | Required | Description                                                      |
| ---------------------------- | -------- | :------: | ---------------------------------------------------------------- |
| `ultrawideHeightThresholdPx` | `number` |    No    | Height (px) past which `--vwx` switches to `2vh`. Default `944`. |

→ Full guide: [design-tokens.md#base-tokens](design-tokens.md#base-tokens)

## `fluidScale`

The fluid `clamp()` boundaries every fluid font-size and `--unit-macro` interpolates across.

| Property                       | Type                                  | Required | Description                                                                             |
| ------------------------------ | ------------------------------------- | :------: | --------------------------------------------------------------------------------------- |
| `minWidth`, `maxWidth`         | `number`                              |   Yes    | Viewport width range (px) the clamp interpolates across.                                |
| `minFontSize`, `maxFontSize`   | `number`                              |   Yes    | Base font-size range (px) at those widths.                                              |
| `minTypeScale`, `maxTypeScale` | `TypeScaleNames` or `TypeScaleValues` |   Yes    | Modular-scale ratio at each end, a name (`'Minor Third'`) or its numeric value (`1.2`). |
| `precision`                    | integer `1`–`6`                       |   Yes    | Decimal places in generated clamp() values.                                             |

→ Full guide: [customizing-type-scale.md](customizing-type-scale.md)

## `modularTypographicScale`

The base scale (`fs100`..`fs900`), each entry a `--fs-*` fluid clamp() built from `step` and `unit`.

| Property                       | Type        | Required | Description                                                                                                                                                                                                                                                                                                                                                      |
| ------------------------------ | ----------- | :------: | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `fs100`..`fs900` (and `fs350`) | `ScaleStep` |    No    | `{ step: number, unit: string, uncapped?: boolean }`, `unit` is `'vwx'`, `'cqw'`, `'cqi'`, or `'vw'`. `step` is the modular-scale exponent (`0` = `fluidScale`'s base font-size). `uncapped: true` additionally generates a `--fs-*-uncapped` token using `max()` instead of `clamp()`, so it keeps growing past `fluidScale.maxWidth` instead of capping there. |
| `[customRole: string]`         | `ScaleStep` |    No    | Any other scale step name.                                                                                                                                                                                                                                                                                                                                       |

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

| Property    | Type     | Required | Description                                                                                                   |
| ----------- | -------- | :------: | ------------------------------------------------------------------------------------------------------------- |
| `fsBase`    | `number` |    No    | Font-size (px) where `ratioBase` applies exactly. Default `16`.                                               |
| `ratioBase` | `number` |    No    | Line-height ratio at `fsBase`. Default `1.5`.                                                                 |
| `fsCeil`    | `number` |    No    | Font-size (px) at/beyond which the ratio bottoms out at `ratioCeil`. Must differ from `fsBase`. Default `64`. |
| `ratioCeil` | `number` |    No    | Ratio for large font-sizes (at/beyond `fsCeil`). Must not exceed `ratioCap`. Default `1.05`.                  |
| `ratioCap`  | `number` |    No    | Ratio for small font-sizes (below the natural crossover point). Default `1.6`.                                |

→ Full guide: [design-tokens.md#typography-tokens](design-tokens.md#typography-tokens) · function reference: [abstracts.md](abstracts.md)

## `spacingSetup`

How `--space-*` tokens grow across viewport widths. A discriminated union on `approach`, the two shapes aren't combinable.

| Property                                       | Type                                                                                      | Required | Applies to    | Description                                                                     |
| ---------------------------------------------- | ----------------------------------------------------------------------------------------- | :------: | ------------- | ------------------------------------------------------------------------------- |
| `baseGridSize`                                 | `4` or `8`                                                                                |    No    | Both          | The base spacing grid unit (px). Default `4`.                                   |
| `approach`                                     | `'coupled'` or `'independent'`                                                            |   Yes    | Both          | Picks the growth model, see the guide for the full comparison.                  |
| `tShirtScale`                                  | `Partial<Record<TShirtScale, number>>`                                                    |   Yes    | `coupled`     | Tier → multiplier of `--unit`.                                                  |
| `numericScaleEnd`                              | `number`                                                                                  |   Yes    | `coupled`     | Upper bound of the numbered `--space-1`..`N` scale.                             |
| `macroRangeMultiplier`                         | one of `1.25`, `1.5`, `1.75`, `2`, `2.25`, `2.5`, `2.75`, `3`, `3.25`, `3.5`, `3.75`, `4` |    No    | `independent` | Multiplier of `baseGridSize` giving `--unit-macro`'s ceiling (px). Default `2`. |
| `tShirtScaleMicro`, `tShirtScaleMacro`         | `Partial<Record<TShirtScale, number>>`                                                    |   Yes    | `independent` | Tier → multiplier of `--unit-micro`/`--unit-macro` respectively.                |
| `numericScaleMicroEnd`, `numericScaleMacroEnd` | `number`                                                                                  |   Yes    | `independent` | Upper bounds of the micro/macro segments of the numbered scale.                 |

→ Full guide: [customizing-spacing.md](customizing-spacing.md)

## `defaultScheme`

| Property        | Type                  | Required | Description                                                                                            |
| --------------- | --------------------- | :------: | ------------------------------------------------------------------------------------------------------ |
| `defaultScheme` | `'light'` or `'dark'` |   Yes    | Which scheme backs the static hex fallback tier for browsers without `oklch()`/`light-dark()` support. |

→ Full guide: [design-tokens.md#color-tokens](design-tokens.md#color-tokens)

## `baseColorTokens`

The base color palette, generates `--{prefix}-{name}` custom properties.

| Property                  | Type                         | Required | Description                                                                            |
| ------------------------- | ---------------------------- | :------: | -------------------------------------------------------------------------------------- |
| `prefix`                  | `string`                     |   Yes    | Custom-property prefix, e.g. `'color'` → `--color-*`.                                  |
| `tokens`                  | `Record<string, ColorToken>` |   Yes    | Token name → `{ light: ColorDefinition, dark: ColorDefinition, opacity?: number }`.    |
| `tokens[x].light`/`.dark` | `ColorDefinition`            |   Yes    | `{ oklch: string, hex: string }`, `oklch` used directly, `hex` is the static fallback for browsers without `oklch()`, so it takes any legacy sRGB color: a hex, `rgb()`, `hsl()`, or a named keyword. |
| `tokens[x].opacity`       | `number`                     |    No    | Shared opacity (0–1) applied to both modes.                                            |

→ Full guide: [design-tokens.md#color-tokens](design-tokens.md#color-tokens)

## `customColorTokens`

Optional. Any number of extra palettes alongside `baseColorTokens`, keyed by whatever name you like (e.g. `campaign`). Not present in the starter template, add it yourself if you need extra palettes.

| Property            | Type                             | Required | Description                                                                                                |
| ------------------- | -------------------------------- | -------- | ---------------------------------------------------------------------------------------------------------- |
| `customColorTokens` | `Record<string, ColorTokensMap>` | No       | Palette name → `{ prefix: string, tokens: Record<string, ColorToken> }` (same shape as `baseColorTokens`). |

Referenced in `semanticColorAliases` via `tokenMap`, using the same name.

→ Full guide: [design-tokens.md#color-tokens](design-tokens.md#color-tokens)

## `semanticColorAliases`

Optional. Semantic names (e.g. `'text-muted'`) aliasing a token from `baseColorTokens` or a `customColorTokens` palette.

| Property              | Type                                          | Required | Description                                                                                               |
| --------------------- | --------------------------------------------- | :------: | --------------------------------------------------------------------------------------------------------- |
| `token`               | `string`                                      |   Yes    | Token name to alias, looked up in `tokenMap`.                                                             |
| `tokenMap`            | `string`                                      |    No    | `'baseColorTokens'` (default), or a key into `customColorTokens`.                                         |
| `opacity`             | `number`                                      |    No    | Opacity (0–1) applied to all oklch/hex variants.                                                          |
| `lightnessMultiplier` | `number` or `{ light: number, dark: number }` |    No    | Multiplier applied to the token's current lightness, single or per-mode. Not an absolute lightness value. |
| `chromaMultiplier`    | `number` or `{ light: number, dark: number }` |    No    | Multiplier applied to the token's current chroma, single or per-mode. Not an absolute chroma value.       |

→ Full guide: [design-tokens.md#color-tokens](design-tokens.md#color-tokens) · derivation mechanics: [abstracts.md](abstracts.md#fnget-color-tokentoken-tokens-opacity-lightness-multiplier-chroma-multiplier)

