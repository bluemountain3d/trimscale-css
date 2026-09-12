# trimscale-css

[![npm version](https://img.shields.io/npm/v/trimscale-css.svg)](https://www.npmjs.com/package/trimscale-css)
[![license](https://img.shields.io/npm/l/trimscale-css.svg)](LICENSE)

A framework-agnostic SCSS toolkit for fluid typography, leading-trim, and OKLCH tokens.

---

## Overview

trimscale-css is built around three core ideas:

1. **Fluid typography:** font sizes and spacing scale continuously across viewports using `clamp()`. No breakpoint jumps.
2. **Leading-trim precision:** removes excess vertical whitespace above and below text using font metrics, giving you true cap-height-to-baseline control.
3. **OKLCH color tokens:** perceptually uniform colors with automatic light/dark mode switching via the CSS `light-dark()` function.

It generates CSS custom properties, utility classes, and base styles from a single config file: no JavaScript ships to the browser.

A config with every utility group on generates about 86 kB of CSS, 66 kB minified and 10 kB gzipped. Groups can be turned off individually, though that's mostly about what you want in the file rather than about size, see [output size](https://github.com/bluemountain3d/trimscale-css/blob/HEAD/docs/getting-started.md#output-size) for the figures per config and what actually drives them.

---

## Why trimscale-css?

Most fluid-typography solutions clamp() a handful of pre-defined sizes across
the viewport. trimscale-css goes a step further in a few places:

- **Line-height that self-scales per element, not per breakpoint.**
  `--line-height-dynamic` isn't a lookup table or a set of breakpoint
  overrides: it's a single self-scaling CSS expression that automatically
  produces the correct ratio for _any_ font-size, including one-off sizes
  outside your modular scale, with zero extra config per element.

- **Leading-trim that reads your actual font's metrics, not a guessed constant.**
  Most implementations hardcode a negative-margin value that only
  holds for one font at one size. trimscale-css extracts real
  ascender/descender-to-cap-height values from your font files at generate
  time, applies the exact trim per font role, and progressively enhances to
  the native `text-box-trim` property, no second code path to maintain
  yourself. Native support reached Baseline (all major engines) in August
  2026, but Baseline tracks the newest shipped versions, not what most
  visitors are actually running, so the metrics-based fallback still
  carries the majority of real-world traffic for a while yet.

- **Metric-matched font-swap fallbacks, so leading-trim precision survives font loading.**
  Precise vertical control doesn't count for much if everything still jumps
  the moment your web font finishes loading. `fallback: { matched: 'serif' }`
  generates a metric-matched `@font-face` override for a real system font
  (size-adjust, ascent/descent/line-gap overrides computed from your font's
  own metrics), which stands in until your font arrives, so the swap doesn't
  shift the layout.

- **OKLCH colors with a real fallback, not just a "future CSS" gamble.**
  Every color token is set with a static hex fallback for `light-dark()`- or
  `oklch()`-unsupporting browsers, generated automatically from the same
  config: no separate fallback palette to maintain.

trimscale-css isn't a component library: it won't give you buttons or
cards out of the box. It's a config-driven toolkit that generates the fluid
typography, spacing, and color primitives most design systems build by hand.

---

## Features

- Fluid typography using a modular scale, Minor Third (1.2×) at 360 px expanding to Perfect Fourth (1.333×) at 1440 px by default, tunable per project
- Spacing on a fixed `--unit-micro` grid step plus a `--unit-macro` grid that scales 4 px to 8 px with the viewport, both snapped to whole pixels (or a single coupled `--unit`, your choice)
- Leading-trim via CSS pseudo-elements, with a progressive enhancement to native `text-box-trim` where supported
- Font metrics, `@font-face` rules, and role assignment generated automatically from your actual font files
- OKLCH color system with semantic tokens for surfaces, text, accent, and action states
- Light/dark mode via `prefers-color-scheme`, no JavaScript required
- Modern responsive breakpoints using CSS range syntax (`width <`, `width >=`)
- Semantic (t-shirt sizes) and numeric (1–48) spacing scales
- Framework-agnostic, works with any JS framework or plain HTML for the web

---

## Getting Started

```bash
npm install -D trimscale-css
npx trimscale-css init
# edit trimscale.config.ts: fonts, type scale, breakpoints, spacing, colors
npx trimscale-css generate
```

trimscale-css is a build-time dependency: SCSS sources plus a `generate` CLI, nothing ships to the browser from the package itself, so it belongs in `devDependencies`.

`init` copies `trimscale.config.ts` into your project; edit it for your fonts, type scale, breakpoints, spacing, and colors. `generate` reads it and writes into your own project (`output.dir`, `./trimscale-generated` by default, never `node_modules`): the SCSS bridge file and a `utility-classes.md` reference, plus `trimscale.css`/`trimscale.min.css` if you set `output.css`, and `reset-requirements.md` if you set `output.reset: false`. Point your SCSS compiler's `loadPaths` at the package's `styles/` folder for trimscale-css's own static files, and `@use` the generated bridge file for your project's actual config values.

**Don't want to configure Sass at all?** Set `output.css: true` and `generate` compiles a standalone stylesheet you can link directly, tokens and utility classes resolved against your config. You still run `install` → `generate`, just without touching `loadPaths`. See [getting-started.md](https://github.com/bluemountain3d/trimscale-css/blob/HEAD/docs/getting-started.md#standalone-css-output) for what that build can and can't do.

See [getting-started.md](https://github.com/bluemountain3d/trimscale-css/blob/HEAD/docs/getting-started.md) for the full walkthrough, requirements (Node version, editor config), and both import styles (global vs. component-scoped).

---

## Package Structure

```
trimscale-css/
├── bin/                             # CLI entry point (init/generate)
├── models/                          # Config.ts, the TrimscaleConfig type
├── scripts/                         # generateBridge.js/fontData.js, read trimscale.config.ts, write <output.dir>/ (your project, not styles/)
├── fixtures/                        # Default font files used by the shipped config
├── templates/                       # trimscale.config.ts, the consumer-safe template `init` copies into your project
├── docs/                            # Guides, see Documentation below
└── styles/
    ├── trimscale.scss               # Main entry point: static, !default-configurable via `@use ... with (...)`
    ├── _layer.scss                  # @layer order, see cascade-layers.md
    ├── abstracts/
    │   ├── variables/               # Config surface: breakpoints, fluid scale, font metrics, typography, spacing, colors
    │   ├── functions/               # Fluid size calc, OKLCH helpers, unit utils
    │   └── mixins/                  # font-setup, breakpoints, color token generation
    ├── tokens/                      # CSS custom properties
    ├── base/                        # HTML defaults: reset, fonts, typography
    └── utilities/                   # Spacing and typography utility classes
```

The `layouts` and `components` cascade layers are declared but stay empty: grids, page structure, and component classes are design decisions that belong in your project, not in a typography and spacing base. See [examples.md](https://github.com/bluemountain3d/trimscale-css/blob/HEAD/docs/examples.md) for recipes to copy in.

The public surface is `tokens/`, `abstracts/variables/`, `abstracts/functions/`, `abstracts/mixins/`, `base/`, `utilities/`, `styles/trimscale.scss`, and `models/Config.ts`, the exact set exposed via `package.json`'s `exports` field for the [`pkg:` importer](https://github.com/bluemountain3d/trimscale-css/blob/HEAD/docs/getting-started.md#configure-your-scss-compiler). Anything else under `styles/` is an implementation detail, not covered by semver.

---

## Documentation

| Guide                                                                                                                   | Covers                                         |
| ----------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------- |
| [getting-started.md](https://github.com/bluemountain3d/trimscale-css/blob/HEAD/docs/getting-started.md)                 | Install, CLI, requirements, both import styles |
| [full-config-reference.md](https://github.com/bluemountain3d/trimscale-css/blob/HEAD/docs/full-config-reference.md)     | Every `trimscale.config.ts` property, one page |
| [cascade-layers.md](https://github.com/bluemountain3d/trimscale-css/blob/HEAD/docs/cascade-layers.md)                   | The `@layer` stack and why it matters          |
| [design-tokens.md](https://github.com/bluemountain3d/trimscale-css/blob/HEAD/docs/design-tokens.md)                     | Every generated CSS custom property            |
| [abstracts.md](https://github.com/bluemountain3d/trimscale-css/blob/HEAD/docs/abstracts.md)                             | Functions, mixins, and the breakpoint API      |
| [utility-classes.md](https://github.com/bluemountain3d/trimscale-css/blob/HEAD/docs/utility-classes.md)                 | Spacing and typography utility classes         |
| [examples.md](https://github.com/bluemountain3d/trimscale-css/blob/HEAD/docs/examples.md)                               | Copy-paste component recipes (text-box)        |
| [customizing-spacing.md](https://github.com/bluemountain3d/trimscale-css/blob/HEAD/docs/customizing-spacing.md)         | Coupled vs. independent spacing, tuning tiers  |
| [customizing-breakpoints.md](https://github.com/bluemountain3d/trimscale-css/blob/HEAD/docs/customizing-breakpoints.md) | Changing breakpoint values                     |
| [customizing-type-scale.md](https://github.com/bluemountain3d/trimscale-css/blob/HEAD/docs/customizing-type-scale.md)   | Tuning the fluid type scale                    |
| [adding-a-font.md](https://github.com/bluemountain3d/trimscale-css/blob/HEAD/docs/adding-a-font.md)                     | Adding a font and assigning roles              |
| [using-with-nextjs.md](https://github.com/bluemountain3d/trimscale-css/blob/HEAD/docs/using-with-nextjs.md)             | `next/font` integration                        |
| [why-scss.md](https://github.com/bluemountain3d/trimscale-css/blob/HEAD/docs/why-scss.md)                               | What SCSS buys you, and the standalone CSS alternative |

---

## Customization

Everything lives in one file: [`trimscale.config.ts`](https://github.com/bluemountain3d/trimscale-css/blob/HEAD/templates/trimscale.config.ts). Edit a field, run `npx trimscale-css generate`, it derives everything else at compile time and writes the result to `output.dir` (a bridge file plus a `utility-classes.md` reference). Nothing in `output.dir` should be hand-edited, it gets overwritten on the next generate.

The table below groups fields by topic; for every individual property, its type, and whether it's required, see [full-config-reference.md](https://github.com/bluemountain3d/trimscale-css/blob/HEAD/docs/full-config-reference.md).

| Config field                                                                    | Controls                                                                                                                                             | Guide                                                                                                                                                                                                                |
| ------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `appFonts` (incl. `appFonts.fontRoles`)                                         | Font files, fallbacks, and role assignment                                                                                                           | [adding-a-font.md](https://github.com/bluemountain3d/trimscale-css/blob/HEAD/docs/adding-a-font.md), [using-with-nextjs.md](https://github.com/bluemountain3d/trimscale-css/blob/HEAD/docs/using-with-nextjs.md)     |
| `fluidScale`, `modularTypographicScale`, `semanticFontSizes`                    | Viewport range, base font sizes, modular scale ratios                                                                                                | [customizing-type-scale.md](https://github.com/bluemountain3d/trimscale-css/blob/HEAD/docs/customizing-type-scale.md)                                                                                                |
| `breakpoints`                                                                   | Named viewport breakpoints                                                                                                                           | [customizing-breakpoints.md](https://github.com/bluemountain3d/trimscale-css/blob/HEAD/docs/customizing-breakpoints.md)                                                                                              |
| `spacingSetup`                                                                  | `coupled` vs. `independent` spacing growth model, tier multipliers, numeric scale range                                                              | [customizing-spacing.md](https://github.com/bluemountain3d/trimscale-css/blob/HEAD/docs/customizing-spacing.md)                                                                                                      |
| `defaultScheme`, `baseColorTokens`, `semanticColorAliases`, `customColorTokens` | The color palette. Ships with a placeholder palette; replace the values (or add your own token maps) rather than treating them as fixed brand colors | [design-tokens.md](https://github.com/bluemountain3d/trimscale-css/blob/HEAD/docs/design-tokens.md#color-tokens), [abstracts.md](https://github.com/bluemountain3d/trimscale-css/blob/HEAD/docs/abstracts.md#mixins) |
| `output.utilities`                                                              | Opt-out toggles for the generated utility-class groups (spacing, typography), on or off per group or per sub-group                                   | [utility-classes.md](https://github.com/bluemountain3d/trimscale-css/blob/HEAD/docs/utility-classes.md#opting-out-of-utility-classes)                                                                                |

Adding a component of your own? See [examples.md](https://github.com/bluemountain3d/trimscale-css/blob/HEAD/docs/examples.md), the `components` cascade layer is reserved for exactly that.

---

## Changelog

See [changelog.md](https://github.com/bluemountain3d/trimscale-css/blob/HEAD/docs/changelog.md) for what changed in each release and what it means when upgrading. It ships with the package, so an installed copy is at `node_modules/trimscale-css/docs/changelog.md`.

---

## Development

Documentation lives in three places, split by audience:

| Directory  | Written for                              | Ships to npm |
| ---------- | ---------------------------------------- | ------------ |
| `docs/`    | People using the package                 | Yes          |
| `devDocs/` | People working on the package itself     | No           |
| `notes/`   | Local working notes, gitignored          | No           |

Anything a consumer needs belongs in `docs/`. `devDocs/` is for the parts of the
work that never reach a consumer: what's planned, what's deliberately not being
done, and which files need a manual pass when something else changes.

| Doc                                                                                                | Covers                                                                        |
| -------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| [roadmap.md](https://github.com/bluemountain3d/trimscale-css/blob/HEAD/devDocs/roadmap.md)         | Work that's decided but not shipped                                           |
| [backlog.md](https://github.com/bluemountain3d/trimscale-css/blob/HEAD/devDocs/backlog.md)         | Candidates that aren't decided yet, ranked, plus small fixes (in Swedish)     |
| [changelog.md](https://github.com/bluemountain3d/trimscale-css/blob/HEAD/devDocs/changelog.md)     | The detailed changelog; `docs/changelog.md` is the consumer-facing short form |
| [maintenance.md](https://github.com/bluemountain3d/trimscale-css/blob/HEAD/devDocs/maintenance.md) | Files that don't auto-update and go silently out of sync                      |
| [styleguide.md](https://github.com/bluemountain3d/trimscale-css/blob/HEAD/devDocs/styleguide.md)   | The Vite dev app in `styleguide/`                                             |
