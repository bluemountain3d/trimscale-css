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
