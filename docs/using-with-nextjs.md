# Using with Next.js

This guide covers the extra steps for integrating trimscale-css with a Next.js project that uses `next/font` for font loading.

This is the SCSS path (`loadPaths`, not `pkg:`, see [why](getting-started.md#configure-your-scss-compiler)). The [standalone CSS output](getting-started.md#standalone-css-output) isn't a fit for a Next.js project using `next/font`: a `nextFont`-enabled family's `family` value is built around `var(--next-font-x)`, a variable only Next's own runtime ever sets, so it falls through to the generic fallback in a plain CSS file. `generate` warns about this per family when `output.css` is on. A project already set up for `next/font` already has the SCSS pipeline this guide describes, so there's nothing to gain from the CSS output anyway.

`next/font` manages `@font-face` declarations itself and exposes each font as a CSS custom property. Setting `nextFontDefault: true` (globally in `appFonts`, or `nextFont: true` per-family, see below) tells the generator to build that family's `family` value around that CSS variable instead of a plain quoted name, with the family name itself as the variable's fallback (`var(--next-font-inter, "Inter"), sans-serif`, see [Why the CSS variable must come first](#why-the-css-variable-must-come-first)), and, for `local` sources, to skip emitting `@font-face` rules for it (Next.js's own `next/font/local` writes those instead). You don't touch the generated output by hand for this, it's automatic once the config is set correctly and `next/font`'s `variable` name matches the convention below.

## Overview

| Step | File                                            | What you do there                                                                                        |
| ---- | ----------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| 1    | [`trimscale.config.ts`](../templates/trimscale.config.ts) | Set `appFonts.nextFontDefault: true` (and `nextFontPrefix` if you want something other than `next-font`) |
| 2    | `next.config.ts`                                | Add `sassOptions` with `loadPaths`                                                                       |
| 3    | `layout.tsx` (or wherever you load fonts)       | Load fonts with `next/font`, variable name must match `--{prefix}-{kebab-family-name}`                   |
| 4    | Run `npx trimscale-css generate`                | Extracts metrics as usual, builds each family's `family` value around its CSS variable                   |

## Step 1: Configure the package

`next/font/local` and `next/font/google` are both handled the same way here, both expose a CSS variable via their own `variable` option, so both should use `nextFontDefault: true`. The difference is only in `source`: a `next/font/local` family reads metrics straight from your own font file (`source: 'local'`), while a `next/font/google` family has no local file for trimscale to read, since Next fetches and self-hosts it internally, so point `source: 'cdn'` at the same file Google actually serves (see [adding-a-font.md](adding-a-font.md#source-cdn) for how to find that URL) and leave `generateFontFace` at its default `false`, `next/font/google` writes its own `@font-face`, trimscale only needs the file to extract metrics from.

```ts
appFonts: {
  nextFontDefault: true,
  nextFontPrefix: 'next-font', // defaults to 'next-font' if omitted
  fallbackDefault: 'sans-serif',
  families: {
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

**Mixing in a font that isn't loaded via `next/font` at all?** `nextFontDefault: true` at the top level applies to every family in `families` by default, so a `manual`/`cdn` family loaded some other way (a CDN's own `<link>` tag or JS loader) would otherwise also get the `var(--next-font-x)` treatment, pointing at a CSS variable that's never actually defined. Override `nextFont: false` on that specific family instead:

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
    loadPaths: [path.join(process.cwd(), 'node_modules/trimscale-css/styles')],
  },
};

export default nextConfig;
```

After this, `@use 'trimscale'` resolves from anywhere in your SCSS files. Add your own project's SCSS root as a second `loadPaths` entry if you need it, trimscale-css never claims the bare `styles/` name for itself, so it won't collide with one of your own.

`implementation` is left unset above (Next.js's own default, `sass`). Both `sass` and `sass-embedded` (an option for faster compiles, set `implementation: 'sass-embedded'`) work fine with this setup.

**Use `loadPaths` here, not the [`pkg:` importer](getting-started.md#configure-your-scss-compiler).** Turbopack, Next.js's default bundler since v15, can't pass `pkg:`'s setup object through `sassOptions`, only plain values like `loadPaths`' string list, so `pkg:` fails to build under Turbopack.

## Step 3: Load fonts in `layout.tsx`

The `variable` you assign must be `--{nextFontPrefix}-{kebab-case family name}`. With the default prefix, a font named "Inter" needs `variable: '--next-font-inter'`; "Newsreader Text" needs `--next-font-newsreader-text`.

**Double-check this name against what `generate` prints.** Next.js writes `variable` to the DOM as a plain string, and trimscale-css's generated `family` value reads it back by the same naming convention, there's no compile-time link between the two, so a typo (`--next-font-inte`, a missing prefix, a family renamed in `trimscale.config.ts` without updating `layout.tsx` to match) doesn't error. Running `npx trimscale-css generate` prints the exact expected name for every `next/font`-managed family, e.g. `- "Inter" expects next/font's \`variable\` to be exactly "--next-font-inter"`, compare that line against your `layout.tsx` by eye. A mismatch shows up differently depending on how the font is loaded, and for a `next/font/google` family it doesn't show up at all, so trust that printed line over what the browser renders, see [Why the CSS variable must come first](#why-the-css-variable-must-come-first).

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

`next/font` returns two classes per font, and only one of them defines the custom property:

| Returned as      | What it does                                                                  | Use it                            |
| ---------------- | ----------------------------------------------------------------------------- | --------------------------------- |
| `font.variable`  | Defines `--next-font-inter`, which is what the generated `family` value reads | On `<html>`, for every font       |
| `font.className` | Sets `font-family` directly on whatever element carries it, defines no property | Not in this setup                 |

They read as interchangeable and aren't. `className={inter.className}` leaves `--next-font-inter` undefined everywhere and drops Next.js's own `font-family` on `<html>` for the whole document to inherit, which is not the same font stack trimscale-css measured its trim against.

## Step 4: Generate

```bash
npx trimscale-css generate
```

For every family resolving to `true` (via `nextFontDefault`, or its own `nextFont` override), this builds that family's `family` value around its CSS variable, e.g. `var(--next-font-inter, "Inter"), sans-serif`, and, for `local` sources, skips its `@font-face` rules (Next.js's own `next/font/local` writes those). `cdn` sources never write `@font-face` unless `generateFontFace: true` is set explicitly, regardless of `nextFont`, that's what leaves `next/font/google` free to write its own. Roles are assigned from `appFonts.fontRoles` exactly as in the standard flow, see [adding-a-font.md](adding-a-font.md) for that part.

## Why the CSS variable must come first

Next.js exposes a font through the CSS custom property you define in `variable`, not by family name. Putting `var(--next-font-inter)` first is what makes the browser resolve to the face Next.js generated, whatever that face happens to be called internally.

The family name follows as the variable's own fallback, `var(--next-font-inter, "Inter"), sans-serif`. It's there because a `var()` pointing at an undefined property makes the whole declaration invalid at computed-value time: the generic fallback sitting after it is not reached either, and the element inherits its parent's font instead. The name inside `var()` is the one thing that still means something when the variable is missing, whether that's a typo in it or `font.className` on `<html>` where `font.variable` belongs.

What it resolves to depends on the loader:

| Loader             | Next.js's own `@font-face` family           | With the variable undefined                      |
| ------------------ | ------------------------------------------- | ------------------------------------------------ |
| `next/font/google` | The real family name, e.g. `Newsreader Text` | The fallback matches it, the font still renders  |
| `next/font/local`  | A generated name, e.g. `__inter_a1b2c3`     | Nothing matches it, the generic fallback renders |

So a broken variable name is visible in the browser for a local font and invisible for a Google one. That asymmetry is the reason to check the name against what `generate` prints rather than against what the page looks like.

The fallback also means the config key has to be the font's real family name for a `next/font/google` family, which is already required of any `cdn` family that doesn't write its own `@font-face`, see [adding-a-font.md](adding-a-font.md#source-cdn).

## Quick checklist

- [ ] `appFonts.nextFontDefault: true` set (globally, with per-family `nextFont: false` overrides for anything not loaded via `next/font`)
- [ ] `sassOptions` with `loadPaths` added to `next.config.ts`
- [ ] `next/font/local` families use `source: 'local'`; `next/font/google` families use `source: 'cdn'` pointed at the real gstatic URL, `generateFontFace` left at its default
- [ ] Each font's `next/font` `variable` matches `--{nextFontPrefix}-{kebab-family-name}` exactly, checked against what `npx trimscale-css generate` prints for it: a typo never errors, and for a Google font it doesn't even look wrong
- [ ] `font.variable` on the `<html>` element for every font, not `font.className`
- [ ] Ran `npx trimscale-css generate`
- [ ] Fonts mapped to roles in `appFonts.fontRoles` (see [adding-a-font.md](adding-a-font.md))
- [ ] Dev server compiles without errors
- [ ] Inspect a heading in the browser, the computed `font-family` should show the correct typeface
