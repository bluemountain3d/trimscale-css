# Customizing Breakpoints

## Overview

Breakpoints are config-driven, not hand-edited SCSS:

| File | What you do there |
|------|-------------------|
| [`trimscale.config.ts`](../trimscale.config.ts) | Edit the `breakpoints` field |
| `scripts/generateBreakpoints.ts` | Regenerated automatically, never edit the output by hand |

After changing `breakpoints`, run:

```bash
npx trimscale-css generate
```

This rewrites `styles/abstracts/variables/_breakpoints.scss`, the `$breakpoints` map consumed by the breakpoint mixins (see [abstracts.md](abstracts.md#breakpoints)).

## Changing the values

`breakpoints` is a flat map of name to px value:

```ts
breakpoints: {
  mobile: 320,
  phablet: 540,
  tablet: 720,
  tabletLg: 1024,
  laptop: 1280,
  desktop: 1440,
  // Custom: E.g.
  //   xSmall: 360,
  //   mobileLarge: 480,
},
```

Keys become kebab-case in the generated map (`tabletLg` → `tablet-lg`), then get converted to `rem` via `fn.pxToRem`. Add, remove, or rename keys freely, there's no fixed list you must match, the six defaults above are just a starting point.

Order matters for `mx.and-down()` and `mx.only()`: both look up the *next* key after the one you pass, based on the map's insertion order. Keep `breakpoints` sorted smallest to largest, or those two mixins will resolve against the wrong neighbor.

## Using the new values

Breakpoints are never read as raw values in component SCSS, always go through the mixins:

```scss
@use "abstracts/mixins" as mx;

.sidebar {
  width: 100%;

  @include mx.and-up('tablet') {
    width: 300px;
  }
}
```

See [abstracts.md](abstracts.md#breakpoints) for the full mixin reference (`and-up`, `up-to`, `and-down`, `between`, `only`).

## Quick checklist

- [ ] Keys sorted smallest to largest in `breakpoints`
- [ ] Ran `npx trimscale-css generate` after any change
- [ ] Dev server compiles without errors
- [ ] Any hard-coded breakpoint name in your own SCSS still matches a key in the config
