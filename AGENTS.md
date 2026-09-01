# trimscale-css

A lean, opinionated SCSS toolkit, published as an npm package (see [package.json](package.json), [bin/init.ts](bin/init.ts)). Consumers install it and generate their own tokens from [trimscale.config.ts](trimscale.config.ts).

## Layer order

`styles/_layer.scss` fixes the cascade: `reset, tokens, functions, trim, base, layouts, components, utilities`. Don't reorder without a deliberate reason — later layers are meant to win regardless of source order or specificity.

## Scope discipline

Keep `base/` lean. This is a _base_ system, not a utility framework — resist adding niche or advanced mixins/utilities "while we're in here." If something feels like it belongs in a consumer's own project rather than a shared base, it probably does.

## Config-driven generation

Most token/scale files under `styles/tokens/` and `styles/abstracts/variables/` are static SCSS shipped in the package (never regenerated), reading `!default` variables that a consumer configures via `@use 'trimscale' with (...)` in a generated bridge file. `scripts/generateBridge.ts` (see `pnpm generate-all` / `pnpm generate-bridge`) reads `trimscale.config.ts` and writes that bridge file into `<outDir>` (the consumer's own project, never `node_modules`), reusing per-domain map-builder functions exported from the other `scripts/generate*.ts` files. `scripts/generateFonts.ts` additionally computes font metrics and `@font-face` data (folded into the same bridge `with()` call). Prefer changing the config, a `!default` var, or a builder function in `scripts/` over hand-editing generated output — but "generated output" here is almost always just the bridge file itself, not the static `styles/` files it configures.

## Design conventions

- **Custom properties**: only introduce a `--_*` custom prop when a `calc()` genuinely needs it at runtime. If a value can be set directly, set the real property.
- **Breakpoints**: no `$bp-*` variables. The API is the `mx.and-up()`, `up-to()`, `and-down()`, `between()`, `only()` mixins over a `$breakpoints` map (`styles/abstracts/mixins/_mx_breakpoints.scss`).
- **Scales**: prefer hand-curated, round-number scales over pure geometric progressions. Design tokens that are meant to stay per-project tunable should live in config, not be hardcoded into generators.
- **Baseline CSS features**: once a feature reaches Baseline "widely available," use it unfallbacked in new code. Removing a fallback from _existing_ code is a separate call (analytics-gated), not a drive-by cleanup.

## Working style

- When you spot a bug or design smell in source (SCSS or generator scripts) while doing something else, describe it and propose a fix — don't fix it inline unless explicitly asked to.
- Commit messages and prose: no em dashes, no `Co-Authored-By` trailer.
