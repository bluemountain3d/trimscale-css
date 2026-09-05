# Using with Next.js

This guide covers the extra steps for integrating trimscale-css with a Next.js project that uses `next/font` for font loading.

`next/font` manages `@font-face` declarations itself and exposes each font as a CSS custom property. Setting `nextFontDefault: true` (globally in `appFonts`, or `nextFont: true` per-family, see below) tells the generator to build that family's `family` value starting with that CSS variable instead of a plain quoted name, and, for `local` sources, to skip writing `_fonts.scss` for it. You don't touch `_font-metrics.scss` by hand for this, it's automatic once the config is set correctly and `next/font`'s `variable` name matches the convention below.

**Known issue: Turbopack can't build trimscale-css's `@property` tokens, regardless of `next/font`.** trimscale-css's spacing tokens (and others) use `@property` with a decimal `initial-value` (e.g. `initial-value: .25rem`, Sass's own output always drops the leading zero). Turbopack, Next.js's default bundler since v15, always uses Lightning CSS for its CSS processing (`experimental.useLightningcss` has no effect on Turbopack, only on webpack), and Lightning CSS currently fails to parse that syntax: `Parsing CSS source code failed ... Unexpected end of input`, see [vercel/next.js#76302](https://github.com/vercel/next.js/issues/76302), an open upstream bug, not something fixable from trimscale-css's side. Confirmed working around it by building without Turbopack:

```json
{
  "scripts": {
    "dev": "next dev --webpack",
    "build": "next build --webpack"
  }
}
```

## Overview

| Step | File                                            | What you do there                                                                                 |
| ---- | ------------------------------------------------ | --------------------------------------------------------------------------------------------------- |
| 1    | [`trimscale.config.ts`](../trimscale.config.ts) | Set `appFonts.nextFontDefault: true` (and `nextFontPrefix` if you want something other than `next-font`) |
| 2    | `next.config.ts`                                | Add `sassOptions` with `loadPaths`                                                                 |
| 3    | `layout.tsx` (or wherever you load fonts)       | Load fonts with `next/font`, variable name must match `--{prefix}-{kebab-family-name}`             |
| 4    | Run `npx trimscale-css generate`                | Extracts metrics as usual, builds each family's `family` value around its CSS variable             |

## Step 1: Configure the package

`next/font/local` and `next/font/google` are both handled the same way here, both expose a CSS variable via their own `variable` option, so both should use `nextFontDefault: true`. The difference is only in `source`: a `next/font/local` family reads metrics straight from your own font file (`source: 'local'`), while a `next/font/google` family has no local file for trimscale to read, since Next fetches and self-hosts it internally, so point `source: 'cdn'` at the same file Google actually serves (see [adding-a-font.md](adding-a-font.md#source-cdn) for how to find that URL) and leave `generateFontFace` at its default `false`, `next/font/google` writes its own `@font-face`, trimscale only needs the file to extract metrics from.

```ts
appFonts: {
  nextFontDefault: true,
  nextFontPrefix: 'next-font', // defaults to 'next-font' if omitted
  fallbackDefault: 'sans-serif',
  fonts: {
    'Inter': {
      source: 'local', // loaded with next/font/local
      path: ['../assets/fonts/Inter-Variable.woff2'],
      fallback: 'sans-serif',
    },
    'Newsreader Text': {
      source: 'cdn', // loaded with next/font/google
      url: ['https://fonts.gstatic.com/s/newsreadertext/....woff2'],
      fallback: 'serif',
    },
  },
},
```

`nextFontPrefix` only sets the prefix half of the variable name, the family half is derived from the config key (kebab-cased), not from anything read out of a font file.

**Mixing in a font that isn't loaded via `next/font` at all?** `nextFontDefault: true` at the top level applies to every family in `fonts` by default, so a `manual`/`cdn` family loaded some other way (a CDN's own `<link>` tag or JS loader) would otherwise also get the `var(--next-font-x)` treatment, pointing at a CSS variable that's never actually defined. Override `nextFont: false` on that specific family instead:

```ts
'Proxima Nova': {
  source: 'manual',
  fallback: 'sans-serif',
  metrics: { /* ... */ },
  nextFont: false, // loaded via Adobe Fonts' own script, not next/font
},
```

**Don't combine `fallbackFamily` with `next/font`'s own automatic fallback.** `next/font/local` already generates its own metric-matched fallback font to reduce CLS (`adjustFontFallback`, defaults to `'Arial'`, `next/font/google` defaults to `true`), independently of trimscale-css. Setting `fallbackFamily` on a `next/font`-managed family stacks trimscale-css's own metric-matched fallback on top of Next's, e.g. `font-family: var(--next-font-x), "x Fallback", "x-config-key Fallback", serif`, two different fallback fonts doing the same job. It isn't broken, the browser just never reaches the redundant one, but pick one: drop `fallbackFamily` for `next/font`-managed families and let Next handle it, or set `adjustFontFallback: false` on the `next/font` side and use trimscale-css's `fallbackFamily` instead.

## Step 2: Configure `next.config.ts`

Point `loadPaths` at the installed package's `styles/` folder:

```ts
import path from 'path';
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  sassOptions: {
    implementation: 'sass-embedded',
    loadPaths: [path.join(process.cwd(), 'node_modules/trimscale-css/styles')],
  },
};

export default nextConfig;
```

After this, `@use 'trimscale'` resolves from anywhere in your SCSS files. Add your own project's SCSS root as a second `loadPaths` entry if you need it, trimscale-css never claims the bare `styles/` name for itself, so it won't collide with one of your own.

**Use `loadPaths` here, not the [`pkg:` importer](getting-started.md#configure-your-scss-compiler).** `pkg:` needs a `NodePackageImporter` instance (real `canonicalize`/`load` methods) passed through `sassOptions.importers`, and Turbopack, Next.js's default bundler since v15, only passes plain, JSON-serializable values through `sassOptions` to its Rust-based Sass compilation, a class instance's methods don't survive that boundary. The build fails with `An importer must have either canonicalize and load methods, or a findFileUrl method.` `loadPaths` works because it's already a plain array of strings.

## Step 3: Load fonts in `layout.tsx`

The `variable` you assign must be `--{nextFontPrefix}-{kebab-case family name}`. With the default prefix, a font named "Inter" needs `variable: '--next-font-inter'`; "Newsreader Text" needs `--next-font-newsreader-text`.

**Double-check this name by hand**, nothing catches a mismatch for you: Next.js writes `variable` to the DOM as a plain string, and trimscale-css's generated `family` value reads it back by the same naming convention, there's no compile-time link between the two. A typo (`--next-font-inte`, a missing prefix, a family renamed in `trimscale.config.ts` without updating `layout.tsx` to match) doesn't error, it quietly falls through to the fallback font instead, see [Why the CSS variable must come first](#why-the-css-variable-must-come-first). If a font looks wrong after following this guide, a mismatched variable name is the first thing to check: inspect the element and see whether `font-family` resolves to `var(--next-font-...)` or has already fallen through.

```tsx
import { Newsreader_Text } from 'next/font/google';
import localFont from 'next/font/local';

const inter = localFont({
  src: [
    {
      path: '../assets/fonts/Inter-Variable.woff2',
      style: 'normal',
      weight: '100 900',
    },
  ],
  variable: '--next-font-inter',
});

const newsreaderText = Newsreader_Text({
  subsets: ['latin'],
  variable: '--next-font-newsreader-text',
});

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang='en' className={`${inter.variable} ${newsreaderText.variable}`}>
      <body>{children}</body>
    </html>
  );
}
```

Add every font's `variable` class to `<html>`, otherwise the custom property is never defined and the CSS falls through to the fallback.

## Step 4: Generate

```bash
npx trimscale-css generate
```

For every family resolving to `true` (via `nextFontDefault`, or its own `nextFont` override), this writes `_font-metrics.scss` with that family's `family` value built around its CSS variable, e.g. `var(--next-font-inter), sans-serif`, and, for `local` sources, skips its `@font-face` rules (Next.js's own `next/font/local` writes those). `cdn` sources never write `@font-face` unless `generateFontFace: true` is set explicitly, regardless of `nextFont`, that's what leaves `next/font/google` free to write its own. If nothing across the whole config ends up needing `@font-face`, `_fonts.scss` isn't written and `styles/base/_index.scss` stops forwarding it. Roles are assigned from `fontRoles` exactly as in the standard flow, see [adding-a-font.md](adding-a-font.md) for that part.

## Why the CSS variable must come first

Next.js does not expose fonts by family name, it exposes them via the CSS custom property you define in `variable`. If `family` only contained the raw font name, the browser would look for an `@font-face` rule with that name, but Next.js uses its own internal name for the generated rule, so the font would never resolve and the system would fall back to the generic stack. Putting `var(--next-font-inter)` first ensures the browser resolves to Next.js's generated font; the fallback after it only applies for non-Next environments (or the styleguide, which doesn't run Next.js's font pipeline).

## Quick checklist

- [ ] `appFonts.nextFontDefault: true` set (globally, with per-family `nextFont: false` overrides for anything not loaded via `next/font`)
- [ ] `sassOptions` with `loadPaths` added to `next.config.ts`
- [ ] `next/font/local` families use `source: 'local'`; `next/font/google` families use `source: 'cdn'` pointed at the real gstatic URL, `generateFontFace` left at its default
- [ ] Each font's `next/font` `variable` matches `--{nextFontPrefix}-{kebab-family-name}` exactly, checked by hand: a typo fails silently (falls back to the fallback font, no error)
- [ ] All `variable` classes added to the `<html>` element in `layout.tsx`
- [ ] Ran `npx trimscale-css generate`
- [ ] Fonts mapped to roles in `fontRoles` (see [adding-a-font.md](adding-a-font.md))
- [ ] Dev server compiles without errors
- [ ] Inspect a heading in the browser, the computed `font-family` should show the correct typeface
