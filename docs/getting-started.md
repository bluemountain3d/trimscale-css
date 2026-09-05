# Getting Started

trimscale-css is consumed as SCSS source plus a small CLI that generates your tokens from a single config file. This guide covers both.

## Requirements

- Node >=22.18.0. The CLI's `generate` command dynamically imports your `trimscale.config.ts` and relies on Node's built in TypeScript type stripping to run it directly, no build step, no `ts-node`. That support only became flagless default at 22.18.0 (and 23.6.0 on the odd-numbered line), so it's a hard floor, not a suggestion.
- Your own SCSS compiler (`sass-embedded` or `sass`) at **1.95.0 or later**, configured with a `loadPaths` entry pointing at the package's `styles/` folder. Vite and Next.js setups are shown below.
- If your project has a `tsconfig.json` and you want editor type checking on `trimscale.config.ts`, set `moduleResolution` to `"nodenext"` or `"bundler"` so the config's `import type ... from 'trimscale-css/models/Config.ts'` subpath import resolves. This is purely for editor DX, the config runs fine at runtime either way.

## Install

```bash
npm install trimscale-css
# or: pnpm add trimscale-css
# or: yarn add trimscale-css
```

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

## Generate

```bash
npx trimscale-css generate
# or, once init has added the script: npm run trimscale:generate / pnpm trimscale:generate / yarn trimscale:generate
```

Reads your `trimscale.config.ts` and writes two files into `<outDir>` (`outDir` defaults to `./trimscale-generated`, configurable via `outDir` in `trimscale.config.ts`), into **your own project**, never into `node_modules`:

- `_index.scss`, the bridge file. Configures trimscale-css's static internals with your actual config values via Sass's `@use ... with (...)`, and (if any of your fonts need `@font-face` rules) sits alongside the generated font faces.
- `utility-classes.md`, a reference listing the exact utility classes _your_ config produces (font roles, sizes, weights, spacing tiers), not a generic example, see [utility-classes.md](utility-classes.md).

Re-run this any time you change `trimscale.config.ts`, and after every trimscale-css version bump, even if your config didn't change, in case a future version changes which config fields exist. The output lives in your own project, so it survives a fresh install. Commit `<outDir>` like any other source file, or gitignore it (along with `.trimscale-cache/`, the font-download cache) and run `generate` as a build step, your choice.

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

This `loadPaths` entry is only for trimscale-css's own static files (functions, mixins, base styles), it's separate from wherever `generate` writes your bridge file (`outDir`, see [Generate](#generate) above) — that one you `@use` by its actual location in your project (relative path, or add its parent directory to `loadPaths` too if you'd rather use a bare specifier).

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

`pkg:` and `loadPaths` compile to identical output for the subpaths `pkg:` exposes, but **keep `loadPaths` configured either way**: the bridge file `generate` writes into your `<outDir>` uses a bare (non-`pkg:`) import for trimscale-css's main entry point, so it only resolves via `loadPaths`, same as it always has, `pkg:` doesn't change that. `pkg:` is additive for your own component-scoped `@use` statements, not a way to drop the `loadPaths` requirement. The available subpaths (`tokens`, `abstracts/variables`, `abstracts/functions`, `abstracts/mixins`, `base`, `utilities`, `components`) mirror the ones already used under `loadPaths` in the example above. Anything not listed there is an implementation detail, not part of the package's public surface, and isn't reachable via `pkg:` either.

**Next.js:** see [using-with-nextjs.md](using-with-nextjs.md) for the full setup, including `next/font` integration. Use `loadPaths` there, not `pkg:`, Turbopack (Next.js's default bundler since v15) can't pass a `NodePackageImporter` instance through `sassOptions`, only plain JSON-serializable values. Turbopack also currently fails to build trimscale-css's `@property`-based tokens at all (a Lightning CSS bug, [vercel/next.js#76302](https://github.com/vercel/next.js/issues/76302)), see using-with-nextjs.md for the `--webpack` workaround.

## Usage

### Global Import

Import once at your app's entry point to load all tokens (configured with your actual `trimscale.config.ts` values), base styles, and utility classes:

```scss
@use './trimscale-generated'; // wherever `generate` wrote your outDir
```

This single import includes:

- All CSS custom property tokens, configured from your `trimscale.config.ts`
- HTML element defaults and reset
- Utility classes (spacing, typography)

Haven't run `generate` yet, or don't want to? `@use 'trimscale';` (via `loadPaths`) works too, it's the same static package, just with the shipped example config's default values instead of yours.

Alternatively, if you're not routing your styles through your own SCSS entry file, import your generated bridge file as a side effect directly from your app's JS/TS entry point (works with Vite, webpack, and similar bundlers):

```ts
// main.ts
import '../trimscale-generated/_index.scss'; // relative to your entry file
```

### Component-Scoped Import

For component styles that need mixins, functions, or token variables without re-emitting global CSS:

```scss
@use 'abstracts/variables' as var;
@use 'abstracts/functions' as fn;
@use 'abstracts/mixins' as mx;
@use 'tokens/leading-trim' as *;

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
