# Getting Started

trimscale-css is consumed as SCSS source plus a small CLI that generates your tokens from a single config file. This guide covers both.

## Requirements

- Node >=22.18.0. The CLI's `generate` command dynamically imports your `trimscale.config.ts` and relies on Node's built in TypeScript type stripping to run it directly, no build step, no `ts-node`. That support only became flagless default at 22.18.0 (and 23.6.0 on the odd-numbered line), so it's a hard floor, not a suggestion.
- Your own SCSS compiler (`sass-embedded` or `sass`) at **1.95.0 or later**, configured with a `loadPaths` entry pointing at the package's `styles/` folder. Vite and Next.js setups are shown below.
- If your project has a `tsconfig.json` and you want editor type checking on `trimscale.config.ts`, set `moduleResolution` to `"nodenext"` or `"bundler"` so the config's `import type ... from 'trimscale-css/models/Config.ts'` subpath import resolves. This is purely for editor DX, the config runs fine at runtime either way.

## Install

```bash
npm install -D trimscale-css
# or: pnpm add -D trimscale-css
# or: yarn add -D trimscale-css
```

A dev dependency, not a runtime one. The package is SCSS sources plus the `generate` CLI, both of which do their work at build time; nothing from it ends up in your JavaScript bundle.

## Initialize

```bash
npx trimscale-css init
# or: pnpm dlx trimscale-css init
# or: yarn dlx trimscale-css init
```

This copies `trimscale.config.ts` into your project root (unless one already exists there) and adds a `trimscale:generate` script to your `package.json`:

```json
{
  "scripts": {
    "trimscale:generate": "trimscale-css generate"
  }
}
```

Run it (`npm run trimscale:generate`) whenever you change `trimscale.config.ts`. Generated output lives in your own project (see [Generate](#generate) below), so there's no need to wire it into a `prebuild`/`predev` step.

Open `trimscale.config.ts` and edit the fields for your project: fonts, font roles, fluid type scale, breakpoints, spacing, and colors. Each field is commented inline; see the guides linked from the [Customization](../README.md#customization) table for the full reference on any one of them.

`appFonts` is the one section you can skip entirely (remove it, don't leave it commented out with no families). Without it, you still get the full fluid type scale, spacing system, breakpoints, and color tokens, working exactly as they do with fonts configured. What you don't get is leading trim and `--font-family-*` tokens, both need font metrics that only exist once a font is configured. See [adding-a-font.md](adding-a-font.md) when you're ready to add one.

## Generate

```bash
npx trimscale-css generate
# or, once init has added the script: npm run trimscale:generate / pnpm trimscale:generate / yarn trimscale:generate
```

Reads your `trimscale.config.ts` and writes into `<output.dir>` (defaults to `./trimscale-generated`, configurable via `output.dir` in `trimscale.config.ts`), into **your own project**, never into `node_modules`:

- `_index.scss`, the bridge file, unless `output.scss: false`. Configures trimscale-css's static internals with your actual config values via Sass's `@use ... with (...)`, passing in your font metrics and (if any of your fonts need them) `@font-face` rules as part of the same call, not as a separate file.
- `utility-classes.md`, a reference listing the exact utility classes _your_ config produces (font roles, sizes, weights, spacing tiers), not a generic example, see [utility-classes.md](utility-classes.md).
- `trimscale.css` and (unless `output.css.minify: false`) `trimscale.min.css`, if `output.css` is set, see [Standalone CSS Output](#standalone-css-output) below.
- `reset-requirements.md`, if `output.reset: false`, see [cascade-layers.md](cascade-layers.md#turning-off-the-built-in-reset).

Re-run this any time you change `trimscale.config.ts`, and after every trimscale-css version bump, even if your config didn't change, in case a future version changes which config fields exist. The output lives in your own project, so it survives a fresh install. Commit `<output.dir>` like any other source file, or gitignore it (along with `.trimscale-cache/`, the font-download cache) and run `generate` as a build step, your choice.

## Standalone CSS Output

For consumers who want the tokens and utility classes without configuring Sass at all. Set `output.css: true` in `trimscale.config.ts` and `generate` writes `trimscale.css` (and, unless you set `output.css: { minify: false }`, a minified `trimscale.min.css` alongside it) into `<output.dir>`:

```ts
output: {
  css: true,
  // or: css: { minify: false, fontUrlBase: '/assets/fonts' },
}
```

```html
<link rel="stylesheet" href="/trimscale-generated/trimscale.min.css">
```

**This isn't "no setup," it's "no Sass setup."** The file still has to come from `generate`, font metrics, color tokens, spacing, and breakpoints are all config-driven and can't ship pre-built in the package, see [why-scss.md](why-scss.md) for why none of this can be plain CSS at the source level. The flow is still `npm install` → `npx trimscale-css generate` → link the file, just without touching `loadPaths` or the `pkg:` importer.

**Generating CSS requires a Sass compiler** (`sass-embedded` or `sass`) installed in your project at generate time, compiling the same static SCSS the bridge file configures, there's no separate hand-written CSS emitter to keep in sync with it. If you're only ever using the CSS output and never `@use` this package's SCSS yourself, that Sass compiler is still a one-time `generate`-time dependency, not something your bundler needs.

### What's in the file

Tokens (as CSS custom properties) and utility classes, resolved against your actual config, same as the SCSS build produces. That's the complete list, not a subset with gaps:

- `mx.font-setup` — the component-authoring API doesn't exist, there's no SCSS left to call it from
- The breakpoint mixins (`mx.and-up` etc.) — write your own `@media`/`@container` queries instead
- `@extend %{role}-text` from your own SCSS — same reason
- `mx.generate-color-tokens` with your own palette — the file has the palette from your config baked in already, but no way to generate a new one at your own build time
- `fn.px-to-rem` and the rest of `abstracts/functions` — nothing left to call them from

### Utility flags are function flags here, not size flags

In the SCSS build, `output.utilities.typography.trim: false` just means the `.trim-text-*` classes aren't generated, `font-setup` and the underlying placeholders still work if you reach for them directly. In the CSS build there's no SCSS left to fall back on: `trim: false` means leading trim doesn't exist in the file at all, and both `@layer trim-defaults` and `@layer trim` are empty (placeholders emit nothing until something extends them, and `.trim-text-*` is the only thing that does). `generate` warns about this (and the equivalent for `family`) rather than forcing the flag on, tokens/spacing/colors without trim in a CSS build is still a legitimate choice.

A family with `nextFont: true` doesn't work in the CSS build either: its `family` value is `var(--next-font-x)`, a CSS variable only ever set by Next.js's own runtime, which a standalone CSS file never goes through. `generate` warns per family when this combination is detected.

## Configure your SCSS compiler

**Vite + sass-embedded:**

```ts
// vite.config.ts
export default {
  css: {
    preprocessorOptions: {
      scss: {
        loadPaths: [
          'node_modules/trimscale-css/styles', // or wherever it's installed
          './src', // your own project's SCSS root
        ],
      },
    },
  },
};
```

`loadPaths` accepts multiple entries, add your own project's SCSS root alongside trimscale-css's so your own `@use 'styles/whatever'`-style imports keep working too. Pointing trimscale-css's own entry directly at its `styles/` folder means it never claims the bare `styles/` name for itself, so it can't collide with a `styles/` folder of your own on another loadPath.

This `loadPaths` entry is only for trimscale-css's own static files (functions, mixins, base styles), it's separate from wherever `generate` writes your bridge file (`output.dir`, see [Generate](#generate) above) — that one you `@use` by its actual location in your project (relative path, or add its parent directory to `loadPaths` too if you'd rather use a bare specifier).

**`pkg:` importer (additional to `loadPaths`, not a replacement):**

Sass's built-in [package importer](https://sass-lang.com/documentation/at-rules/use/#pkg-importer) resolves `pkg:` URLs against a package's `exports` field, for your own component-scoped `@use` statements:

```scss
@use 'pkg:trimscale-css/tokens';
@use 'pkg:trimscale-css/abstracts/mixins' as mx;
```

Requires Dart Sass 1.71.0 or later, already covered by the 1.95.0-or-later requirement above. It's not enabled automatically anywhere, every tool needs it registered explicitly.

**Vite:** this has changed across Vite's own major versions, check what your installed version actually expects (Vite's `preprocessorOptions.scss` type, or [vite.dev/config](https://vite.dev/config/shared-options.html#css-preprocessoroptions)) rather than trusting a single snippet:

```ts
// vite.config.ts
import { NodePackageImporter } from 'sass-embedded';

export default {
  css: {
    preprocessorOptions: {
      scss: {
        importers: [new NodePackageImporter()],
      },
    },
  },
};
```

- **Vite 7+**: Sass's legacy API was dropped, there's only one mode left, no `api` field at all, `importers` goes directly under `scss` as shown above.
- **Vite 5.4–6.x**: needs `api: 'modern-compiler'` alongside `importers` (plain `'modern'` doesn't support `importers`).
- **Below Vite 5.4**: no modern Sass API support at all, the option is named `pkgImporter` instead of `importers` under the legacy API.

**A bare `sass` CLI:**

```bash
sass --pkg-importer=node input.scss output.css
```

**JS/Dart Sass API directly:**

```js
import { NodePackageImporter } from 'sass-embedded'; // or 'sass'
sass.compile('input.scss', { importers: [new NodePackageImporter()] });
```

`pkg:` and `loadPaths` compile to identical output for the subpaths `pkg:` exposes, but **keep `loadPaths` configured either way**: the bridge file `generate` writes into your `<output.dir>` uses a bare (non-`pkg:`) import for trimscale-css's main entry point, so it only resolves via `loadPaths`, same as it always has, `pkg:` doesn't change that. `pkg:` is additive for your own component-scoped `@use` statements, not a way to drop the `loadPaths` requirement. The available subpaths (`tokens`, `abstracts/variables`, `abstracts/functions`, `abstracts/mixins`, `base`, `utilities`, `components`) mirror the ones already used under `loadPaths` in the example above. Anything not listed there is an implementation detail, not part of the package's public surface, and isn't reachable via `pkg:` either.

**Next.js:** see [using-with-nextjs.md](using-with-nextjs.md) for the full setup, including `next/font` integration. Use `loadPaths` there, not `pkg:`, Turbopack (Next.js's default bundler since v15) can't pass a `NodePackageImporter` instance through `sassOptions`, only plain JSON-serializable values.

## Usage

### Global Import

Import once at your app's entry point to load all tokens (configured with your actual `trimscale.config.ts` values), base styles, and utility classes:

```scss
@use './trimscale-generated'; // wherever `generate` wrote your output.dir
```

This single import includes:

- All CSS custom property tokens, configured from your `trimscale.config.ts`
- HTML element defaults and reset
- Utility classes (spacing, typography, accessibility)

The reset (`output.reset`) and the accessibility utilities (`output.utilities.a11y`) can both be turned off, for a project that already has its own, see [cascade-layers.md](cascade-layers.md#turning-off-the-built-in-reset) and [utility-classes.md](utility-classes.md#accessibility).

Haven't run `generate` yet, or don't want to? `@use 'trimscale';` (via `loadPaths`) works too, it's the same static package, just with the shipped example config's default values instead of yours.

Alternatively, if you're not routing your styles through your own SCSS entry file, import your generated bridge file as a side effect directly from your app's JS/TS entry point (works with Vite, webpack, and similar bundlers):

```ts
// main.ts
import '../trimscale-generated/_index.scss'; // relative to your entry file
```

### Component-Scoped Import

For component styles that need mixins, functions, or token variables without re-emitting global CSS:

```scss
@use 'abstracts/mixins' as mx;

.card {
  @include mx.font-setup($font: 'body', $font-size: var(--text-md));
  padding: var(--space-md);
  gap: var(--space-lg);

  @include mx.and-up('tablet') {
    padding: var(--space-xl);
  }
}
```

This assumes the [global import](#global-import) is loaded somewhere in your build too, which guarantees the layer order (see [cascade-layers.md](cascade-layers.md)). If you only ever use component-scoped import and never load the global entry point, add `@use 'layer';` once at your app's own entry point instead.
