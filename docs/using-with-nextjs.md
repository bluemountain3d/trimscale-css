# Using with Next.js

This guide covers the extra steps for integrating trimscale-css with a Next.js project that uses `next/font` for font loading.

`next/font` manages `@font-face` declarations itself and exposes each font as a CSS custom property. Setting `appFonts.nextFont: true` in your config tells the generator to skip writing `_fonts.scss` and to build each font's `family` value starting with that CSS variable, so you don't touch `_font-metrics.scss` by hand for this, it's automatic once the config is set correctly and `next/font`'s variable name matches the convention below.

## Overview

| Step | File                                            | What you do there                                                                                 |
| ---- | ----------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| 1    | [`trimscale.config.ts`](../trimscale.config.ts) | Set `appFonts.nextFont: true` (and `nextFontPrefix` if you want something other than `next-font`) |
| 2    | `next.config.ts`                                | Add `sassOptions` with `loadPaths`                                                                |
| 3    | `layout.tsx` (or wherever you load fonts)       | Load fonts with `next/font`, variable name must match `--{prefix}-{kebab-family-name}`            |
| 4    | Run `npx trimscale-css generate`                | Extracts metrics as usual, skips `_fonts.scss`, builds the `family` value around the CSS variable |

## Step 1: Configure the package

```ts
appFonts: {
  fontPath: 'path/to/fonts/', // relative to trimscale config file, e.g. ./fonts/ or ../assets/fonts/
  nextFont: true,
  nextFontPrefix: 'next-font', // defaults to 'next-font' if omitted
  fallbacks: {
    'Inter': 'sans-serif',
    'Newsreader Text': 'serif',
  },
  defaultFallback: 'sans-serif',
},
```

`nextFontPrefix` only sets the prefix half of the variable name, the family half is derived automatically from each font's name (kebab-cased). `nextFont` only makes sense for `next/font/local`, not `next/font/google`, the metrics pipeline reads real font files from `appFonts.fontPath` via fontkit, and Google-loaded fonts have no local file to extract metrics from. If you're using `next/font/google`, leave `nextFont: false` and skip step 3 below.

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

## Step 3: Load fonts in `layout.tsx`

The `variable` you assign must be `--{nextFontPrefix}-{kebab-case family name}`. With the default prefix, a font named "Inter" needs `variable: '--next-font-inter'`; E.g. "Newsreader Text" needs `--next-font-newsreader-text`.

```tsx
import { localFont } from 'next/font/local';

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

const newsreaderText = localFont({
  src: [
    {
      path: '../assets/fonts/NewsreaderText-Regular.woff2',
      style: 'normal',
      weight: '400',
    },
    {
      path: '../assets/fonts/NewsreaderText-Italic.woff2',
      style: 'italic',
      weight: '400',
    },
  ],
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

Add every font's `variable` class to `<html>`, otherwise the custom property is never defined and the CSS falls through to the fallback in `appFonts.fallbacks`.

## Step 4: Generate

```bash
npx trimscale-css generate
```

With `nextFont: true`, this writes `_font-metrics.scss` with each family's `family` value already built around the CSS variable (`var(--next-font-inter), "Inter", sans-serif`), skips `_fonts.scss` entirely (no `@font-face` block gets written, and `styles/base/_index.scss` stops forwarding it), and assigns roles from `fontRoles` exactly as in the standard flow, see [adding-a-font.md](adding-a-font.md) for that part.

## Why the CSS variable must come first

Next.js does not expose fonts by family name, it exposes them via the CSS custom property you define in `variable`. If `family` only contained the raw font name, the browser would look for an `@font-face` rule with that name, but Next.js uses its own internal name for the generated rule, so the font would never resolve and the system would fall back to the generic stack. Putting `var(--next-font-inter)` first ensures the browser resolves to Next.js's generated font; the plain name after it is kept as a fallback for non-Next environments (or for the styleguide, which doesn't run Next.js's font pipeline).

## Quick checklist

- [ ] `appFonts.nextFont: true` set in the config
- [ ] `sassOptions` with `loadPaths` added to `next.config.ts`
- [ ] Each font loaded with `next/font/local` and assigned a `variable` matching `--{nextFontPrefix}-{kebab-family-name}`
- [ ] All `variable` classes added to the `<html>` element in `layout.tsx`
- [ ] Ran `npx trimscale-css generate`
- [ ] Fonts mapped to roles in `fontRoles` (see [adding-a-font.md](adding-a-font.md))
- [ ] Dev server compiles without errors
- [ ] Inspect a heading in the browser, the computed `font-family` should show the correct typeface
 