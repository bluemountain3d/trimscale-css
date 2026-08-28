# Getting Started

trimscale-css is consumed as SCSS source plus a small CLI that generates your tokens from a single config file. This guide covers both.

## Requirements

- Node >=23.6.0. The CLI's `generate` command dynamically imports your `trimscale.config.ts` and relies on Node's built in TypeScript type stripping to run it directly, no build step, no `ts-node`. That support only became flagless default at 23.6.0, so it's a hard floor, not a suggestion.
- Your own SCSS compiler (`sass-embedded` or `sass`) configured with a `loadPaths` entry pointing at the package's `styles/` folder. Vite and Next.js setups are shown below.
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

This copies `trimscale.config.ts` into your project root (unless one already exists there) and adds a `trimscale:generate` script to your `package.json`.

Open `trimscale.config.ts` and edit the fields for your project: fonts, font roles, fluid type scale, breakpoints, spacing, and colors. Each field is commented inline; see the guides linked from the [Customization](../README.md#customization) table for the full reference on any one of them.

## Generate

```bash
npx trimscale-css generate
# or, once init has added the script: npm run trimscale:generate / pnpm trimscale:generate / yarn trimscale:generate
```

Reads your `trimscale.config.ts` and writes every generated file: font metrics, `@font-face` rules (unless `appFonts.nextFont` is true), the fluid type scale, breakpoints, typography tokens, leading trim placeholders, text utilities, spacing tokens, and color tokens.

Re-run this any time you change the config. Wire it into your own build pipeline (a `prebuild` or `predev` script) rather than treating it as a one time step, since the generated files live inside `node_modules/trimscale-css` and get reset by a fresh install.

## Configure your SCSS compiler

**Vite + sass-embedded:**

```ts
// vite.config.ts
export default {
  css: {
    preprocessorOptions: {
      scss: {
        loadPaths: ['path/to/trimscale-css/styles'],
      },
    },
  },
};
```

`loadPaths` accepts multiple entries, add your own project's SCSS root alongside it (e.g. `loadPaths: ['path/to/trimscale-css/styles', './src']`) so your own `@use 'styles/whatever'`-style imports keep working too. Pointing trimscale-css's own entry directly at its `styles/` folder means it never claims the bare `styles/` name for itself, so it can't collide with a `styles/` folder of your own on another loadPath.

**Next.js:** see [using-with-nextjs.md](using-with-nextjs.md) for the full setup, including `next/font` integration.

## Usage

### Global Import

Import once at your app's entry point to load all tokens, base styles, and utility classes:

```scss
@use 'trimscale';
```

This single import includes:

- All CSS custom property tokens
- HTML element defaults and reset
- Utility classes (spacing, gap, text, layout)

### Component-Scoped Import

For component styles that need mixins, functions, or token variables without re-emitting global CSS:

```scss
@use 'abstracts/variables' as var;
@use 'abstracts/functions' as fn;
@use 'abstracts/mixins' as mx;
@use 'tokens/leading-trim' as *;

.card {
  @include mx.fontSetup($font: 'body', $font-size: var(--text-md));
  padding: var(--space-md);
  gap: var(--space-lg);

  @include mx.and-up('tablet') {
    padding: var(--space-xl);
  }
}
```

This assumes the [global import](#global-import) is loaded somewhere in your build too, which guarantees the layer order (see [cascade-layers.md](cascade-layers.md)). If you only ever use component-scoped import and never load the global entry point, add `@use 'layer';` once at your app's own entry point instead.
