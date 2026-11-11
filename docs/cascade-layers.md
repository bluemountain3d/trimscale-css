# Cascade Layers

The layer order is declared once, in `_layer.scss`. With the default config it is:

```scss
@layer reset, tokens, functions, trim-defaults, base, trim, layouts, components, utilities;
```

`layouts` and `components` are the project's own layers, and the list between `trim` and `utilities` can be replaced, see [Your own layers](#your-own-layers).

Layers are listed lowest to highest priority, a later layer always beats an earlier one, regardless of selector specificity (short of `!important`). This is what lets utility classes and `font-setup`-authored component styles override the framework's own defaults with zero specificity management:

| Layer           | Contains                                                                                                                    |
| --------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| `reset`         | Browser-default reset (lowest priority)                                                                                     |
| `tokens`        | CSS custom property declarations on `:root`                                                                                 |
| `functions`     | Reserved, currently unused                                                                                                  |
| `trim-defaults` | `%text-baseline`: the bare font-size/line-height baseline the trim system falls back to                                     |
| `base`          | HTML element defaults (`body`, headings, etc.)                                                                              |
| `trim`          | `%text-geometry`, the font-role placeholders, and `.trim-text-*`: leading-trim metrics, margins, pseudo-elements, font-family |
| `layouts`       | Yours: grids, page structure, containers. The package ships nothing here. Replaceable, see [Your own layers](#your-own-layers) |
| `components`    | Yours: component classes. The package ships nothing here either, see [examples.md](examples.md). Replaceable too             |
| `utilities`     | Spacing, typography, and accessibility utility classes, except `.trim-text-*` (highest priority)                            |

`layouts` and `components` are declared and left empty on purpose. Grids, page structure, and component classes are design decisions, and trimscale-css is a typography and spacing base, not a component library. Declaring the layers anyway means your own rules land in the right place in the cascade without you having to write the layer list yourself.

## Your own layers

`output.cascadeLayers` replaces `layouts` and `components` with a list of your own, lowest priority first. Each name is declared between `trim` and `utilities`:

```ts
// trimscale.config.ts
output: {
  cascadeLayers: ['layouts', 'widgets', 'components'],
},
```

```scss
@layer reset, tokens, functions, trim-defaults, base, trim, layouts, widgets, components, utilities;
```

The list replaces the default rather than adding to it, so keep `layouts` and `components` in it if you use them. An empty list declares none.

Only that window is configurable. `trim` has to stay above `base` (see [below](#why-the-trim-system-straddles-base)), and `utilities` has to win over everything, so neither moves, and nothing can go below `trim`. `generate` stops with an error on a name the package declares itself, a name listed twice, or a name that isn't a plain CSS identifier. A dotted sub-layer such as `widgets.cards` is not accepted in the list. Declare it in your own CSS instead, inside a layer from the list.

The same list reaches the `output.css` bundle, so both targets declare the same order.

Without the config, the list is the `$cascade-layers` variable, and the same names are rejected at compile time:

```scss
@use 'trimscale' with ($cascade-layers: (layouts, widgets, components));
```

Declaring the whole order yourself, before trimscale loads, also works, because the first `@layer` statement fixes the order. It means copying the package's own layer names, though, and a copy breaks silently if those ever change. The config doesn't.

## Why the trim system straddles `base`

The trim system is split across two layers because its two halves need opposite positions relative to `base`.

**`trim-defaults`, below `base`.** The bare `font-size: 1em` / `line-height: var(--line-height-dynamic)` baseline is meant to lose to everything: `small { font-size: 0.875em }` in `base` keeps `<small class="trim-text-body">` small, and `.font-size-*` in `utilities` overrides it too. `1em` computes to the parent's font-size, so a placeholder follows its context rather than pinning a size that would beat inheritance on a nested element.

**`trim`, above `base`.** The four `--_*` metrics are measured from one specific font file and are only correct alongside the `font-family` they were measured from. If `base`'s `code, kbd, samp, pre { font-family: var(--font-family-code) }` outranked them, `<code class="trim-text-body">` would render in the code typeface while trimmed by the body typeface's metrics. Keeping this half above `base` prevents that silently happening.

Utilities can still separate the two, and that is deliberate: `.font-family-mono` sets only `font-family`, so `class="trim-text-body font-family-mono"` renders in mono with body metrics. The difference is that you asked for it. Nothing splits them implicitly any more.

`.trim-text-*` is written in `@layer trim` rather than `@layer utilities` because that is where it lands regardless. `@extend` emits into the placeholder's own position, not the position of the rule doing the extending, so a `.trim-text-*` rule declared under `utilities` would be hoisted into the trim layers anyway and leave an empty `utilities` block behind. The same applies to `mx.font-setup`, see [abstracts.md](abstracts.md#mxfont-setup).

This is why `.trim-text-*` and a plain `.font-size-*` can be combined freely on the same element: the winner is decided by layer, not by class order or specificity, and `.trim-text-*`'s own size baseline sits in the lowest of the two trim layers.

**Adding your own reset rules?** Wrap them in `@layer reset { ... }` too, matching the layer name declared above. Unlayered CSS always wins over every layer regardless of specificity, so a reset rule you add outside `@layer reset` would outrank everything in the system, not just the browser defaults it's meant to normalize. Declaring `@layer reset { ... }` again in your own file doesn't create a second layer, it appends to the same one; normal cascade order still applies within it, so load your additions after `styles/base/_reset.scss` if you need them to win over a specific rule there.

## Turning off the built-in reset

`output.reset: false` drops the *contents* of `@layer reset { ... }` in `styles/base/_reset.scss`, but the `@layer reset, tokens, ...` declaration at the top of this page stays exactly as-is regardless. Dropping `reset` from the declaration itself would put your own `@layer reset { ... }` in first-seen-in-source order instead, almost certainly last (and therefore highest priority), the same failure mode described above but caused by the opt-out flag rather than a mistake in your own CSS.

Turning the reset off means the typography and spacing system's assumptions are now your own reset's job:

- `margin: 0` on headings, paragraphs, lists, `blockquote`, and `figure`
- `body { margin: 0 }`
- `box-sizing: border-box` throughout
- Nothing that reintroduces `line-height: normal` on elements meant to inherit `--line-height-dynamic`

Nothing fails to compile if these are missing, spacing just looks subtly wrong: unexpectedly large gaps between headings and body text, spacing tokens that look like they aren't being applied. A popular reset like `normalize.css` **keeps** margins on headings and paragraphs, so following generic "bring your own reset" advice can still leave these unmet. `generate` writes this same list into `<output.dir>/reset-requirements.md` whenever `output.reset` is `false`, so it lives in your project rather than needing to be found here.

With the [global import](getting-started.md#global-import) (`@use 'trimscale'`), the layer order above is always guaranteed, `_layer.scss` is the first thing that entry point forwards.

If you only ever use [component-scoped import](getting-started.md#component-scoped-import) and never load the global entry point anywhere in your build, the layer order doesn't exist on its own, add `@use 'layer';` once at your app's own entry point too. Otherwise layers fall back to first-seen-in-source order, which may not match the stack above. `@use 'layer'` on its own declares the default `layouts, components`. With your own list, configure it there as well: `@use 'abstracts/variables' with ($cascade-layers: (...))` before it.
