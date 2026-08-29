# trimscale-css

A framework-agnostic SCSS design system with fluid typography, leading-trim precision, and OKLCH color tokens.

---

## Overview

trimscale-css is built around three core ideas:

1. **Fluid typography:** font sizes and spacing scale continuously across viewports using `clamp()`. No breakpoint jumps.
2. **Leading-trim precision:** removes excess vertical whitespace above and below text using font metrics, giving you true cap-height-to-baseline control.
3. **OKLCH color tokens:** perceptually uniform colors with automatic light/dark mode switching via the CSS `light-dark()` function.

The system is pure SCSS. It generates CSS custom properties, utility classes, and base styles from a single config file, no JavaScript required for styles.

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
npm install trimscale-css
npx trimscale-css init
npx trimscale-css generate
```

`init` copies `trimscale.config.ts` into your project; edit it for your fonts, type scale, breakpoints, spacing, and colors. `generate` reads it and writes every generated token file. Then point your SCSS compiler's `loadPaths` at the package's `styles/` folder and `@use 'trimscale'`.

See [getting-started.md](docs/getting-started.md) for the full walkthrough, requirements (Node version, editor config), and both import styles (global vs. component-scoped).

---

## Project Structure

```
trimscale-css/
├── bin/                             # CLI entry point (init/generate)
├── models/                          # Config.ts, the TrimscaleConfig type
├── scripts/                         # generate*.ts, read trimscale.config.ts, write styles/
├── fixtures/                        # Default font files used by the shipped config
├── trimscale.config.ts              # Your project's configuration
├── styles/
│   ├── trimscale.scss               # Main entry point
│   ├── _layer.scss                  # @layer order, see cascade-layers.md
│   ├── abstracts/
│   │   ├── variables/               # Generated: breakpoints, fluid scale, font metrics, typography
│   │   ├── functions/               # Fluid size calc, OKLCH helpers, unit utils
│   │   └── mixins/                  # fontSetup, breakpoints, color token generation
│   ├── tokens/                      # CSS custom properties (generated)
│   ├── base/                        # HTML defaults: reset, fonts, typography (generated fonts + typography)
│   ├── utilities/                   # Spacing, gap, and typography utility classes
│   └── components/                  # Empty by default, see examples.md
└── styleguide/                      # Vite dev app for visual testing
```

---

## Documentation

| Guide                                                         | Covers                                         |
| ------------------------------------------------------------- | ---------------------------------------------- |
| [getting-started.md](docs/getting-started.md)                 | Install, CLI, requirements, both import styles |
| [full-config-reference.md](docs/full-config-reference.md)     | Every `trimscale.config.ts` property, one page |
| [cascade-layers.md](docs/cascade-layers.md)                   | The `@layer` stack and why it matters          |
| [design-tokens.md](docs/design-tokens.md)                     | Every generated CSS custom property            |
| [abstracts.md](docs/abstracts.md)                             | Functions, mixins, and the breakpoint API      |
| [utility-classes.md](docs/utility-classes.md)                 | Spacing, gap, and typography utility classes   |
| [examples.md](docs/examples.md)                               | Copy-paste component recipes (text-box)        |
| [customizing-spacing.md](docs/customizing-spacing.md)         | Coupled vs. independent spacing, tuning tiers  |
| [customizing-breakpoints.md](docs/customizing-breakpoints.md) | Changing breakpoint values                     |
| [customizing-type-scale.md](docs/customizing-type-scale.md)   | Tuning the fluid type scale                    |
| [adding-a-font.md](docs/adding-a-font.md)                     | Adding a font and assigning roles              |
| [using-with-nextjs.md](docs/using-with-nextjs.md)             | `next/font` integration                        |

---

## Customization

Everything lives in one file: [`trimscale.config.ts`](trimscale.config.ts). Edit a field, run `npx trimscale-css generate`, the system derives everything else at compile time. Nothing under `styles/tokens/` or the generated files in `styles/abstracts/variables/`/`styles/base/` should be hand-edited, they get overwritten on the next generate.

The table below groups fields by topic; for every individual property, its type, and whether it's required, see [full-config-reference.md](docs/full-config-reference.md).

| Config field                                                                           | Controls                                                                                                                                             | Guide                                                                                            |
| -------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| `appFonts`, `fontRoles`                                                                | Font files, fallbacks, and role assignment                                                                                                           | [adding-a-font.md](docs/adding-a-font.md), [using-with-nextjs.md](docs/using-with-nextjs.md)     |
| `fluidScale`, `modularTypographicScale`, `semanticFontSizes`                           | Viewport range, base font sizes, modular scale ratios                                                                                                | [customizing-type-scale.md](docs/customizing-type-scale.md)                                      |
| `breakpoints`                                                                          | Named viewport breakpoints                                                                                                                           | [customizing-breakpoints.md](docs/customizing-breakpoints.md)                                    |
| `spacingSetup`                                                                         | `coupled` vs. `independent` spacing growth model, tier multipliers, numeric scale range                                                              | [customizing-spacing.md](docs/customizing-spacing.md)                                            |
| `defaultScheme`, `baseColorTokens`, `semanticColorAliases`, custom `{name}ColorTokens` | The color palette. Ships with a placeholder palette; replace the values (or add your own token maps) rather than treating them as fixed brand colors | [design-tokens.md](docs/design-tokens.md#color-tokens), [abstracts.md](docs/abstracts.md#mixins) |

Adding a component of your own? See [examples.md](docs/examples.md), the `components` cascade layer is reserved for exactly that.

---

## Development

`docs/` covers using the published package; it ships with it. `devDocs/` does not ship, it's for working on trimscale-css itself: [devDocs/styleguide.md](devDocs/styleguide.md) covers running the local Vite dev app used to visually test the system while building it.
