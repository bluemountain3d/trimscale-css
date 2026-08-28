# Cascade Layers

The layer order is declared once, in `_layer.scss`:

```scss
@layer reset, tokens, functions, trim, base, layouts, components, utilities;
```

Layers are listed lowest to highest priority, a later layer always beats an earlier one, regardless of selector specificity (short of `!important`). This is what lets utility classes and `fontSetup`-authored component styles override the framework's own defaults with zero specificity management:

| Layer        | Contains                                                                                                            |
| ------------ | ------------------------------------------------------------------------------------------------------------------- |
| `reset`      | Browser-default reset (lowest priority)                                                                             |
| `tokens`     | CSS custom property declarations on `:root`                                                                         |
| `functions`  | Reserved, currently unused                                                                                          |
| `trim`       | `%text-properties` and the font-role placeholders, leading-trim geometry plus a bare font-size/line-height baseline |
| `base`       | HTML element defaults (`body`, headings, etc.)                                                                      |
| `layouts`    | Reserved for your own layout styles (grids, page structure, containers), the system ships none of its own           |
| `components` | Reserved for your own component classes, the system ships none of its own, see [examples.md](examples.md)           |
| `utilities`  | All utility classes: spacing, gap, text, layout (highest priority)                                                  |

Because `trim` sits below `base`, `components`, and `utilities`, everything the trim placeholders set is a _default_: any component class, base element rule, or utility class overrides it automatically. This is also why `.trim-text-*` and a plain `.font-size-*` can be combined freely on the same element, the winner is decided by layer, not by class order or specificity.

**Adding your own reset rules?** Wrap them in `@layer reset { ... }` too, matching the layer name declared above. Unlayered CSS always wins over every layer regardless of specificity, so a reset rule you add outside `@layer reset` would outrank everything in the system, not just the browser defaults it's meant to normalize. Declaring `@layer reset { ... }` again in your own file doesn't create a second layer, it appends to the same one; normal cascade order still applies within it, so load your additions after `styles/base/_reset.scss` if you need them to win over a specific rule there.

With the [global import](getting-started.md#global-import) (`@use 'styles/trimscale'`), the layer order above is always guaranteed, `_layer.scss` is the first thing that entry point forwards.

If you only ever use [component-scoped import](getting-started.md#component-scoped-import) and never load the global entry point anywhere in your build, the layer order doesn't exist on its own, add `@use 'styles/layer';` once at your app's own entry point too. Otherwise layers fall back to first-seen-in-source order, which may not match the stack above.
