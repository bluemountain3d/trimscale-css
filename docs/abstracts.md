# Abstracts

Functions, mixins, and breakpoints: the SCSS-level API for building components on top of trimscale-css. For the generated CSS custom properties themselves, see [design-tokens.md](design-tokens.md).

## Functions

Import via:

```scss
@use 'abstracts/functions' as fn;
```

### `fn.get-fluid-clamp($min-size, $max-size, $value-key, $type)`

Returns a `clamp()` value that interpolates linearly between two raw pixel sizes across the `$fluid-scale` viewport range, the general-purpose building block the other fluid functions below are built on. Unlike `fluid-spacing`/`fluid-space-step`, it isn't pinned to the spacing grid, so it's useful for one-off fluid values (e.g. a component's own min/max size). Falls back to a flat `rem` value when `$min-size == $max-size`, instead of emitting a pointless `clamp()`.

Takes the same `$type` as `fn.fluid-font-size` below: `'max'` drops the upper bound, so a one-off value can keep growing past `fluidScale.maxWidth` the way an uncapped type step does.

```scss
--custom-size: #{fn.get-fluid-clamp(4, 8)}; // clamp() between 4px and 8px
--icon-size: #{fn.get-fluid-clamp(24, 32, 'vw')}; // same, using plain vw
--gutter: #{fn.get-fluid-clamp(8, 16, 'vwx', 'max')}; // max(), no upper bound
```

This is also what the `--unit-macro` spacing token is built from, see [design-tokens.md](design-tokens.md).

### `fn.fluid-font-size($level, $unit-key, $type)`

Returns a `clamp()` value for a type step on the modular scale. Pass `$type: 'max'` to drop the upper bound instead, so the value keeps growing linearly past `fluidScale.maxWidth` rather than capping there (used for the `uncapped` option in `modularTypographicScale`, see [customizing-type-scale.md](customizing-type-scale.md)). `'clamp'` and `'max'` are the only accepted values, and all four fluid functions stop the build on anything else rather than returning an empty value.

```scss
font-size: fn.fluid-font-size(2); // 2 steps up from base, uses vwx unit
font-size: fn.fluid-font-size(2, 'vw'); // same, using plain vw
font-size: fn.fluid-font-size(
  2,
  'vwx',
  'max'
); // max() instead of clamp(), no upper bound
```

### `fn.fluid-spacing($level, $unit-key, $type)`

Returns a `clamp()` value for a spacing multiplier on the base grid (independent of the `--unit-micro`/`--unit-macro` split, it computes its own clamp directly from `min-font-size`/`max-font-size`, not from the CSS custom properties). Same `$type: 'max'` option as `fluid-font-size` above.

```scss
padding: fn.fluid-spacing(6); // grid level × 6
```

### `fn.fluid-space-step($min-level, $max-level, $unit-key, $type)`

Returns a `clamp()` value that spans between two grid levels. Same `$type: 'max'` option as `fluid-font-size` above.

```scss
gap: fn.fluid-space-step(4, 8); // between grid level 4 and grid level 8
```

### `fn.px-to-rem($px, $base)`

Converts a pixel value to rem. `$base` defaults to `16px`. Unitless input is treated as px.

```scss
margin: fn.px-to-rem(24); // → 1.5rem
```

### Number and unit helpers

Small utilities the fluid functions above are built on. They're forwarded from `abstracts/functions` like everything else on this page, so they're part of the public surface, but most component work never needs them directly.

| Function                              | Returns                                                                                              |
| ------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| `fn.rem-to-px($rem, $base)`           | The inverse of `px-to-rem`. `$base` defaults to `16px`; unitless input is treated as rem             |
| `fn.strip-unit($value)`               | The number without its unit (`16px` → `16`). Already-unitless input passes through                   |
| `fn.round($number, $decimals)`        | `$number` rounded to `$decimals` places, default `4`. Sass-side rounding, unrelated to CSS `round()` |
| `fn.precision($number, $decimals)`    | Alias of `fn.round`, same signature and behavior                                                     |
| `fn.clamp-number($value, $min, $max)` | `$value` constrained to the range. Named to avoid colliding with the CSS `clamp()` function          |
| `fn.to-percent($value, $total)`       | `$value / $total` as a percentage (`to-percent(3, 4)` → `75%`). `$total` defaults to `1`             |

**Import these under a namespace, not with `as *`.** `fn.round` is a Sass function named `round`, so `@use 'abstracts/functions' as *` makes it shadow the CSS `round()` function for that whole file. `width: round(calc(100px + 1em), 1px)` then fails to compile (`Undefined operation "calc(100px + 1em) * 10"`) instead of emitting CSS rounding. Under `as fn` the CSS function passes through untouched, which is why every example on this page uses the namespace.

### `fn.dynamic-line-height($fs-base, $ratio-base, $fs-ceil, $ratio-ceil, $ratio-cap)`

Returns a self-scaling, unitless `clamp()` line-height ratio that re-resolves against _any_ element's own computed font-size, instead of being tied to the modular type scale, so a component with its own font-size override still gets a correctly-scaled line-height without recomputing anything itself. It pins an exact ratio (`$ratio-base`, default `1.5`) at one font-size (`$fs-base`, default `16`px), interpolates down to a minimum ratio (`$ratio-ceil`, default `1.05`) at a ceiling font-size (`$fs-ceil`, default `64`px), and caps the ratio at `$ratio-cap` (default `1.6`) for small font-sizes below the natural crossover point. Called with no arguments, this is computed once (from `dynamicLineHeight` in the config, see [full-config-reference.md#dynamiclineheight](full-config-reference.md#dynamiclineheight)) and exposed as the `--line-height-dynamic` token (see [design-tokens.md](design-tokens.md)); call the function directly with explicit arguments only when one specific component needs its own curve instead of the site-wide default.

```scss
// Default curve, prefer the token instead:
.my-element {
  line-height: var(--line-height-dynamic);
}
// Custom bounds for a display heading, call the function directly:
.display-1 {
  line-height: #{fn.dynamic-line-height($ratio-ceil: 1.05, $fs-ceil: 64)};
}
```

There are three ways to land on a line-height, and only the last one involves calling this function. **Do nothing** and you get the dynamic curve: `body` sets `line-height: var(--line-height-dynamic)`, and every font-role placeholder carries the same value, so component work is on the site-wide curve by default. **Pass a static value** (a `--line-height-*` token, or `font-setup`'s `$line-height` param) when one component needs a fixed ratio that doesn't move with its font-size; the static tokens are the opt-in, see [design-tokens.md](design-tokens.md#typography-tokens). **Call `dynamic-line-height` with explicit arguments** only when a component needs a curve of its own shape. To change the site-wide curve, set `dynamicLineHeight` in `trimscale.config.ts` instead, no SCSS required.

### `fn.get-color-token($token, $tokens, $opacity, $lightness-multiplier, $chroma-multiplier)`

Looks up a color token by name and returns its `(light: (oklch:, hex:), dark: (oklch:, hex:))` structure, optionally adjusted via `color.change()` without mutating the original entry in `$tokens`. This is what `semanticColorAliases` in `trimscale.config.ts` uses under the hood: deriving a near-duplicate color (e.g. a muted text variant) from an existing token instead of hand-picking a whole new OKLCH value (see [Color Tokens](design-tokens.md#color-tokens)).

```scss
fn.get-color-token('bg-canvas', $tokens: var.$base-color-tokens, $opacity: 0.5);
fn.get-color-token('ink', $tokens: var.$base-color-tokens, $chroma-multiplier: (light: 0.8, dark: 1.2));
```

Parameters:

| Parameter               | Type                 | Default    | Description                                                                                                                                    |
| ----------------------- | -------------------- | ---------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| `$token`                | string               | (required) | Token name to look up, e.g. `'bg-canvas'`                                                                                                      |
| `$tokens`               | map                  | (required) | Source map to look up `$token` in, same shape `mx.generate-color-tokens` takes                                                                 |
| `$opacity`              | number or null       | `null`     | Absolute opacity (0–1) applied to all oklch/hex variants                                                                                       |
| `$lightness-multiplier` | number, map, or null | `null`     | Multiplier applied to the token's current lightness (NOT an absolute value): a single number for both modes, or `(light:, dark:)` for per-mode |
| `$chroma-multiplier`    | number, map, or null | `null`     | Multiplier applied to the token's current chroma (NOT an absolute value): a single number for both modes, or `(light:, dark:)` for per-mode    |

`$lightness-multiplier`/`$chroma-multiplier` multiply the token's _existing_ channel value, they don't set an absolute target (unlike `$opacity`), and accept a `(light:, dark:)` map because the light/dark base values aren't perceptual mirrors of each other, a flat multiplier can land differently in each mode. The return value is shaped like a single `$tokens` entry, so it feeds straight into `semanticColorAliases` or your own `mx.generate-color-tokens` call.

Both multipliers are clamped to what OKLCH can hold: lightness to 0-100%, chroma to 0 and up. A multiplier that overshoots lands on white, black, or gray rather than on an unrepresentable color, and `generate` warns which `semanticColorAliases` field caused it. The returned `hex` entry is the plain-color tier, gamut-mapped into sRGB and rounded to 8-bit channels so it works in browsers with no `oklch()` support; the `oklch` entry keeps the full precision and the wide-gamut value.

## Mixins

Import via:

```scss
@use 'abstracts/mixins' as mx;
```

### `mx.font-setup`

`font-setup` is the **SCSS component API** for the typography system. Use it when writing component SCSS and you want to apply a font role together with size, weight, and line-height in a single declaration. For HTML-level styling, use `.trim-text-*` and the other [typography utility](utility-classes.md) classes instead, `.trim-text-*` is the class-based equivalent of `font-setup`'s font-role preset.

Requires `appFonts` to be configured (see [adding-a-font.md](adding-a-font.md)). With no font roles, `$font` has nothing valid to resolve to, and `font-setup` errors at compile time rather than silently doing nothing.

```scss
@include mx.font-setup(
  $font: 'primary',
  // font role, see appFonts.fontRoles in trimscale.config.ts
  $font-size: var(--heading-1),
  $line-height: 1.1,
  $font-weight: 700,
  $letter-spacing: -0.02em
);
```

Parameters:

| Parameter         | Type   | Default     | Description                                                     |
| ----------------- | ------ | ----------- | --------------------------------------------------------------- |
| `$font`           | string | `'primary'` | Font role key, from `appFonts.fontRoles` in the config          |
| `$font-size`      | value  | `null`      | CSS font-size value                                             |
| `$line-height`    | number | `null`      | Line height multiplier (unitless)                               |
| `$font-weight`    | number | `null`      | Font weight                                                     |
| `$font-style`     | string | `null`      | Font style (`normal`, `italic`, `oblique`)                      |
| `$letter-spacing` | value  | `null`      | Letter spacing                                                  |
| `$text-transform` | string | `null`      | Text transform (`none`, `uppercase`, `lowercase`, `capitalize`) |

Every parameter except `$font` defaults to `null` and is only emitted as a real CSS property (`font-size`, `line-height`, etc., set directly, not via custom properties) if you pass it explicitly. Omitted `$font-size`/`$line-height` fall through to the font role's placeholder, which carries a bare baseline of its own (`font-size: 1em`, so the rule renders at whatever size it inherits, and `line-height: var(--line-height-dynamic)`, see [design-tokens.md](design-tokens.md)); the other four parameters have no such placeholder default and fall through further, to whatever's inherited (or the CSS initial value).

The mixin sets font metrics internally and applies leading-trim via `::before`/`::after` pseudo-elements. When the browser supports `text-box-trim`, native trimming is used instead.

On the fallback path those are `::before` and `::after` on the selector you called the mixin in, so that rule cannot carry pseudo-elements of its own, and a `display` of your own on it breaks the trim the same way. The failure mode, and why it stays invisible in a browser with native support, is described under [Trim text](utility-classes.md#typography). The fix in component SCSS is the one from markup: put the trim on an inner element and keep your decoration on the outer one.

**A note on `@extend` and layers.** `font-setup` reaches the font role through `@extend`, and `@extend` puts the extending selector wherever the placeholder was _defined_, not wherever the `@extend` is written. A rule that calls `font-setup` is therefore split across three layers:

```scss
@layer components {
  .card__title {
    @include mx.font-setup(
      $font: 'heading',
      $font-size: var(--heading-1),
      $font-weight: 700
    );
    color: var(--text-strong);
  }
}
```

```css
@layer trim-defaults { .card__title { font-size: 1em; line-height: var(--line-height-dynamic); } }
@layer trim          { .card__title { --_top-trim: 0.196em; font-family: var(--font-family-heading); ... } }
@layer components    { .card__title { font-size: var(--heading-1); font-weight: 700; color: var(--text-strong); } }
```

Only what you pass as parameters (and anything else you write in the rule) stays in `components`. The font role's own values land in the trim layers, which is what makes them defaults your declarations win over, see [cascade-layers.md](cascade-layers.md#why-the-trim-system-straddles-base).

`@extend %heading-text` by hand behaves identically, so the recommendation for `font-setup` over the placeholder is about the role validation and the typography parameters, not about layering. What both mean in practice is that a component rule using the trim system does not sit wholly inside `@layer components`, so a later rule in `layouts` or `components` can beat its font-family without beating the rest of it.

### `mx.generate-color-tokens($tokens, $default-scheme)`

Emits CSS custom properties for every entry in a color-token map, with a progressive-enhancement fallback chain layered on `:root`/`.app-theme-container`: plain hex first (works everywhere), then static `oklch()` behind an `@supports` check for browsers without `light-dark()`, then full `light-dark(oklch(), oklch())` where supported. Because later blocks always win the cascade, an older browser simply never reaches the blocks it doesn't support and keeps resolving the plain hex (or static `oklch()`) tier instead, so colors degrade gracefully on older browsers rather than breaking outright. `.app-theme-container` is a scoped-theming hook: every token (and the `.theme-light`/`.theme-dark` override classes) is generated for it in addition to `:root`, so adding that class to any element gives its subtree an independently-controlled theme, see [design-tokens.md](design-tokens.md#color-tokens).

This is the actual mechanism behind [Color Tokens](design-tokens.md#color-tokens). Call it again with your own map to add project-specific tokens alongside the config-driven defaults:

```scss
$brand-tokens: (
  prefix: 'brand',
  tokens: (
    primary: (
      light: (
        oklch: oklch(0.55 0.15 250),
        hex: #4a5fc1,
      ),
      dark: (
        oklch: oklch(0.7 0.12 250),
        hex: #8fa0e8,
      ),
    ),
  ),
);

@include mx.generate-color-tokens(
  $tokens: $brand-tokens,
  $default-scheme: dark
);
// → --brand-primary, with the full hex/oklch/light-dark fallback chain
```

Parameters:

| Parameter         | Type   | Default                  | Description                                                                                  |
| ----------------- | ------ | ------------------------ | -------------------------------------------------------------------------------------------- |
| `$tokens`         | map    | `var.$base-color-tokens` | Map shaped `(prefix: string, tokens: (name: (light: (oklch:, hex:), dark: (oklch:, hex:))))` |
| `$default-scheme` | string | `var.$default-scheme`    | Which scheme's value backs the plain-hex fallback tier                                       |

Each token also gets a typed `@property --#{prefix}-#{name} { syntax: "<color>"; }` registration, so invalid overrides fail safe to the fallback color instead of silently breaking the cascade. `$tokens.prefix` sets the custom-property prefix directly, unlike a separate `$prefix` parameter.

## Breakpoints

Import the mixins via:

```scss
@use 'abstracts/mixins' as mx;
```

Breakpoints are a plain map, not individual variables, reachable via:

```scss
@use 'abstracts/variables' as var;
// var.$breakpoints: (mobile, phablet, tablet, tablet-lg, laptop, desktop) → rem
```

**Default values** (from `breakpoints` in `trimscale.config.ts`):

| Key         | px value | rem value |
| ----------- | -------- | --------- |
| `mobile`    | 320 px   | 20rem     |
| `phablet`   | 540 px   | 33.75rem  |
| `tablet`    | 720 px   | 45rem     |
| `tablet-lg` | 1024 px  | 64rem     |
| `laptop`    | 1280 px  | 80rem     |
| `desktop`   | 1440 px  | 90rem     |

You never read the map directly for `@media` queries though, use the mixins:

| Mixin                      | Behavior                                                           |
| -------------------------- | ------------------------------------------------------------------ |
| `mx.up-to($breakpoint)`    | Below the given breakpoint (exclusive)                             |
| `mx.and-up($breakpoint)`   | At the given breakpoint and wider (inclusive)                      |
| `mx.and-down($breakpoint)` | Below the _next_ breakpoint after the given one (string keys only) |
| `mx.between($min, $max)`   | Between two breakpoints, `$min` inclusive, `$max` exclusive        |
| `mx.only($breakpoint)`     | Only within the given breakpoint's own range (string keys only)    |

`$breakpoint` accepts either a key from the `$breakpoints` map (`'tablet'`, `'laptop'`, ...) or a raw number (treated as px if unitless). `and-down` and `only` need a string key, since they look up the _next_ entry in the map, there's no "next" for an arbitrary number.

Every mixin also takes an optional trailing `$container`: `true` swaps `@media` for an unnamed `@container` query (nearest ancestor with `container-type` set), a string swaps it for a named one. The ancestor must actually set `container-type` (e.g. `container-type: inline-size`), an `@container` query with no such ancestor simply never matches, unlike `cqi`/`cqw` units elsewhere in this system, which silently resolve against the small viewport instead (see [customizing-type-scale.md](customizing-type-scale.md)).

```scss
.card {
  padding: var(--space-sm);

  @include mx.and-up('tablet') {
    padding: var(--space-md);
  }

  @include mx.and-up('desktop') {
    padding: var(--space-lg);
  }
}

.feature {
  @include mx.only('tablet') {
    display: block;
  }
}

.sidebar {
  width: 300px;

  @include mx.up-to('tablet') {
    width: 100%;
  }
}

.widget {
  container-type: inline-size;

  .widget__title {
    font-size: 1rem;

    @include mx.and-up('tablet', $container: true) {
      font-size: 1.25rem;
    }
  }
}
```

See how-to change the breakpoint values themselves in [customizing-breakpoints.md](customizing-breakpoints.md).
