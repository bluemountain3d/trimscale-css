# trimscale-css

A lean, opinionated SCSS design-system base, published as an npm package (see [package.json](package.json), [bin/init.ts](bin/init.ts)). Consumers install it and generate their own tokens from [trimscale.config.ts](trimscale.config.ts).

## Layer order

`styles/_layer.scss` fixes the cascade: `reset, tokens, functions, trim, base, layouts, components, utilities`. Don't reorder without a deliberate reason — later layers are meant to win regardless of source order or specificity.

## Scope discipline

Keep `base/` lean. This is a _base_ system, not a utility framework — resist adding niche or advanced mixins/utilities "while we're in here." If something feels like it belongs in a consumer's own project rather than a shared base, it probably does.

## Config-driven generation

Token/scale files under `styles/tokens/` and `styles/abstracts/variables/` are generated from `trimscale.config.ts` via scripts in `scripts/generate*.ts` (see `pnpm generate-all`). Prefer changing the config or generator over hand-editing generated SCSS output.

## Design conventions

- **Custom properties**: only introduce a `--_*` custom prop when a `calc()` genuinely needs it at runtime. If a value can be set directly, set the real property.
- **Breakpoints**: no `$bp-*` variables. The API is the `mx.and-up()`, `up-to()`, `and-down()`, `between()`, `only()` mixins over a `$breakpoints` map (`styles/abstracts/mixins/_mx_breakpoints.scss`).
- **Scales**: prefer hand-curated, round-number scales over pure geometric progressions. Design tokens that are meant to stay per-project tunable should live in config, not be hardcoded into generators.
- **Baseline CSS features**: once a feature reaches Baseline "widely available," use it unfallbacked in new code. Removing a fallback from _existing_ code is a separate call (analytics-gated), not a drive-by cleanup.

## Working style

- When you spot a bug or design smell in source (SCSS or generator scripts) while doing something else, describe it and propose a fix — don't fix it inline unless explicitly asked to.
- Commit messages and prose: no em dashes, no `Co-Authored-By` trailer.
