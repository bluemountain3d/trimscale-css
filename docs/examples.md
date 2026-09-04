# Examples

Recipes you can copy into your own `components/` layer (see [cascade-layers.md](cascade-layers.md)). None of these ship as part of the package, components are inherently more opinionated than tokens and utilities, so they're kept out of the default `@use 'trimscale'` import.

## Text Box

A typographic prose container: it handles flow spacing between block elements, character-count-based line lengths, and horizontal centering. Uses `em`-based spacing throughout, so rhythm scales with the local font size rather than the viewport.

```html
<div class="text-box text-box--flow text-box-65 text-box--center-content">
  <h2>Heading</h2>
  <p>Paragraph…</p>
  <ul>
    …
  </ul>
</div>
```

Headings inside a text box would typically carry `.trim-text-heading` too,
see [Typography](utility-classes.md#typography) for the `<span>`-wrapper
pattern that requires.

```scss
@layer components {
  .text-box {
    width: 100%;
    height: auto; /* fallback */

    @supports (height: calc-size(auto, size)) {
      height: calc-size(auto, round(up, size, 1px));
    }

    // Structured flow spacing for mixed content with headings.
    // Applies contextual margin-block values based on sibling relationships.
    // Mutually exclusive with --prose.
    &--flow {
      // Heading to content
      :where(h1, h2, h3, h4, h5, h6) {
        &:has(+ :is(p, figure, ul, ol, dl, div, section, article)) {
          margin-block-end: 0.8em;
        }
      }

      // Content to heading
      :where(p, figure, ul, ol, dl, div, section, article) {
        & + :is(h1, h2, h3, h4, h5, h6) {
          margin-block-start: 2em;
        }
      }

      // Heading group rules
      :where(hgroup) {
        & > :is(p):has(+ :is(h1, h2, h3, h4)) {
          margin-block-end: 1em;
        }

        & > :is(h1, h2, h3, h4):has(+ p) {
          margin-block-end: 0.5em;
        }

        &:has(+ :is(p, figure, ul, ol, dl, div, section, article)) > p {
          margin-block-end: 1.5em;
        }
      }

      // Content block spacing
      :where(p, figure, ul, ol, dl, div, section, article) {
        &:has(+ :is(p, figure, ul, ol, dl, div, section, article)) {
          margin-block-end: 1.5em;
        }
      }
    }

    // Uniform flow spacing for continuous prose.
    // Applies margin-block-start to every direct child after the first.
    // Override via the --prose-flow custom property. Mutually exclusive with --flow.
    &--prose > * + * {
      margin-block-start: var(--prose-flow, 1.5em);
    }

    // Constrains line length by character count.
    // --avg-char-width-body is an em value, so it resolves to an absolute
    // width using .text-box's own computed font-size, assumed to be
    // --text-base (inherited from body unless overridden by a parent).
    // Available steps: 45, 50, 55, 60, 65, 70, 75.
    @each $chars in (45, 50, 55, 60, 65, 70, 75) {
      &-#{$chars} {
        max-width: round(
          calc(var(--avg-char-width-body, 1ch) * $chars),
          2px
        );
      }
    }

    // Centers the text box horizontally within its parent.
    &--center-content {
      margin-inline: auto;
    }
  }
}
```

| Class                       | Effect                                                                                                                                                                                                                       |
| --------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `.text-box`                 | Base container (`width: 100%`)                                                                                                                                                                                               |
| `.text-box--flow`           | Structured `margin-block` rhythm for **mixed content** (headings + paragraphs/lists/figures), using `:has()` to vary spacing by context (e.g. `2em` before a heading, `0.8em` after one). Mutually exclusive with `--prose`. |
| `.text-box--prose`          | Uniform `margin-block-start` between every direct child, for **continuous prose**. Override the spacing via the `--prose-flow` custom property (default `1.5em`). Mutually exclusive with `--flow`.                          |
| `.text-box-45` … `-75`      | Caps line length by character count (steps of 5: `45, 50, 55, 60, 65, 70, 75`), computed as `max-width: calc(avg-char-width * N)`                                                                                            |
| `.text-box--center-content` | `margin-inline: auto`, typically paired with a character-count modifier                                                                                                                                                      |

To add this (or any other component) to your own project, create a `components/` folder alongside your SCSS entry point, paste this in, and load it in the `components` layer somewhere after `@use 'trimscale'`:

```scss
@layer components {
  @use 'components/text-box';
}
```

## Container

A fluid-width layout wrapper with `max-width` and padding variants. The base class only handles positioning and centering, layout mode (flex, grid, block…) is left to modifiers so it doesn't force an opinion on its children.

```html
<div class="container container--boxed container--stack">
  <p>Content…</p>
</div>
```

```scss
@layer components {
  .container {
    $_max-width: #{math.div(map.get(var.$fluid-scale, "max-width"), 16)}rem;
    position: relative;
    width: 100%;
    margin-inline: auto;

    // Stretches to fill the viewport height (100dvh, with a 100vh fallback).
    &--full-height {
      min-height: 100vh;
      min-height: 100dvh;
    }

    // Lays child elements out as a vertical flex stack.
    &--stack {
      display: flex;
      flex-direction: column;
    }

    // Wide max-width with tight padding, content nearly spans the viewport.
    // Multipliers are empirically tuned against the default fluid-scale
    // (min-width 360, max-width 1440) — they scale proportionally with a
    // different fluidScale config, but the 12/20 floors below are absolute
    // pixel minimums picked for a 360px screen. They differ (12 < 20) on
    // purpose, so --overshoot's padding stays narrower than --boxed's,
    // keeping --overshoot the wider of the two at any viewport width.
    // Mutually exclusive with --boxed/--narrow (all three set max-width).
    &--overshoot {
      padding-inline: round(#{fn.get-fluid-clamp(
        #{math.round(math.max(map.get(var.$fluid-scale, "min-width") * 0.03125, 12))},
        #{math.round(map.get(var.$fluid-scale, "max-width") * 0.03125)}
      )}, 1px);
      max-width: $_max-width;
    }

    // Narrower max-width with more generous padding than --overshoot.
    // Mutually exclusive with --overshoot/--narrow.
    &--boxed {
      padding-inline: round(#{fn.get-fluid-clamp(
        #{math.round(math.max(map.get(var.$fluid-scale, "min-width") * 0.05555, 20))},
        #{math.round(map.get(var.$fluid-scale, "max-width") * 0.08333)}
      )}, 1px);
      max-width: $_max-width;
    }

    // Caps max-width well below the viewport, no padding of its own.
    // Mutually exclusive with --overshoot/--boxed.
    &--narrow {
      max-width: round(#{fn.get-fluid-clamp(
        #{math.round(map.get(var.$fluid-scale, "min-width") * 0.77778)},
        #{math.round(map.get(var.$fluid-scale, "max-width") * 0.66667)}
      )}, 1px);
    }
  }
}
```

| Class                     | Effect                                                                                                          |
| ------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| `.container`               | Base wrapper: `position: relative`, `width: 100%`, `margin-inline: auto`                                        |
| `.container--full-height`  | `min-height: 100dvh` (with a `100vh` fallback)                                                                   |
| `.container--stack`        | Lays children out as a vertical flex stack (`display: flex; flex-direction: column`)                            |
| `.container--overshoot`    | Wide `max-width` with tight fluid padding, content nearly spans the viewport. Mutually exclusive with `--boxed`/`--narrow`. |
| `.container--boxed`        | Narrower `max-width`, more generous fluid padding than `--overshoot`. Mutually exclusive with `--overshoot`/`--narrow`.     |
| `.container--narrow`       | Caps `max-width` well below the viewport, no padding of its own. Mutually exclusive with `--overshoot`/`--boxed`.           |

Depends on the package's own `abstracts/functions`/`abstracts/variables` (already resolvable via the `loadPaths` entry from [getting-started.md](getting-started.md)):

```scss
@use 'abstracts/variables' as var;
@use 'abstracts/functions' as fn;
@use 'sass:math';
@use 'sass:map';
```

To add this to your own project, paste the snippet above plus the `.container` block into `components/container.scss`, and load it in the `components` layer somewhere after `@use 'trimscale'`:

```scss
@layer components {
  @use 'components/container';
}
```
