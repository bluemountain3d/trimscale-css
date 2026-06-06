# Using with Next.js

This guide covers the extra steps required when integrating trimscale-css with a Next.js project that uses `next/font` for font loading.

The key difference from a standard setup is that `next/font` manages `@font-face` declarations itself and exposes each font as a CSS custom property (e.g. `--next-font-inter`). That variable must be the first value in the `family` stack in `_font-metrics.scss` so the system picks it up correctly.

## Overview

| Step | File                 | What you do there                                      |
| ---- | -------------------- | ------------------------------------------------------ |
| 1    | `next.config.ts`     | Add `sassOptions` with `loadPaths`                     |
| 2    | `src/app/layout.tsx` | Load fonts with `next/font`, add variables to `<html>` |
| 3    | `_font-metrics.scss` | Prepend the CSS variable to each font's `family` value |
| 4    | `_fonts.scss`        | Skip — Next.js generates `@font-face` for you          |
| 5    | `_typography.scss`   | Assign fonts to roles as normal                        |

---

## Step 1: Configure `next.config.ts`

Add `sassOptions` to your Next.js config. Point `loadPaths` to the directory that contains the `styles/` folder — typically `src/`:

```ts
import path from 'path';
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // ... your other config
  sassOptions: {
    implementation: 'sass-embedded',
    loadPaths: [path.join(process.cwd(), 'src')],
  },
};

export default nextConfig;
```

After this, `@use 'styles/trimscale'` resolves from anywhere in your SCSS files.

---

## Step 2: Load fonts in `layout.tsx`

Use `next/font/local` for self-hosted fonts or `next/font/google` for Google Fonts. Assign a CSS variable name to each font and add it as a class on `<html>`:

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

const newsreader = localFont({
  src: [
    {
      path: '../assets/fonts/NewsreaderText-Regular.woff2',
      style: 'normal',
      weight: '400',
    },
    {
      path: '../assets/fonts/NewsreaderText-SemiBold.woff2',
      style: 'normal',
      weight: '600',
    },
    {
      path: '../assets/fonts/NewsreaderText-Italic.woff2',
      style: 'italic',
      weight: '400',
    },
  ],
  variable: '--next-font-newsreader',
});

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang='en' className={`${inter.variable} ${newsreader.variable}`}>
      <body>{children}</body>
    </html>
  );
}
```

For Google Fonts the setup is the same, but imported from `next/font/google`:

```tsx
import { Inter } from 'next/font/google';

const inter = Inter({
  subsets: ['latin'],
  variable: '--next-font-inter',
});
```

---

## Step 3: Update `_font-metrics.scss`

This is the step that differs from the standard font setup. Next.js generates its own `@font-face` declarations and makes each font available via the CSS variable you defined (`--next-font-inter`, etc.). For the browser to use the correct font, that variable must appear **first** in the `family` stack:

```scss
$font-metrics: (
  'Inter': (
    'family': 'var(--next-font-inter), "Inter", "Inter Variable", sans-serif',
    'category': 'sans-serif',
    'cap-height': 0.728,
    // ... rest of metrics
  ),
  'Newsreader Text': (
    'family': 'var(--next-font-newsreader), "Newsreader Text", serif',
    'category': 'serif',
    'cap-height': 0.67,
    // ... rest of metrics
  ),
) !default;
```

The font name after the variable (`"Inter"`, `"Newsreader Text"`) acts as a fallback in environments where the CSS variable is not set.

---

## Step 4: Skip `_fonts.scss`

Do not add `@font-face` declarations to `_fonts.scss`. Next.js handles font loading and injects its own `@font-face` rules automatically. Adding them manually would result in duplicate declarations.

---

## Step 5: Assign fonts to roles

This step is identical to the standard flow. Open `_typography.scss` and map fonts to roles as normal:

```scss
$fonts: (
  'primary': 'Inter',
  'secondary': 'Newsreader Text',
  'body': 'Inter',
  'heading': 'Newsreader Text', // ...
) !default;
```

See [adding-a-font.md](./adding-a-font.md) for the full list of available roles.

---

## Why the CSS variable must come first

Next.js does not expose fonts by family name, it exposes them via the CSS custom property you define in `variable`. If `family` only contains the raw font name (`"Inter", sans-serif`), the browser looks for an `@font-face` rule with that name. Since Next.js uses its own internal name for the generated rule, the font will not resolve and the system falls back to the generic stack.

Putting `var(--next-font-inter)` first ensures the browser resolves to Next.js's generated font. The fallback name is kept for completeness and for non-Next environments.

---

## Quick checklist

- [ ] `sassOptions` with `loadPaths` added to `next.config.ts`
- [ ] Each font loaded with `next/font` and assigned a `variable` name
- [ ] All `variable` classes added to the `<html>` element in `layout.tsx`
- [ ] Each font's `family` in `_font-metrics.scss` starts with `var(--next-font-xxx)`
- [ ] No `@font-face` added to `_fonts.scss`
- [ ] Fonts mapped to roles in `_typography.scss`
- [ ] Dev server compiles without errors
- [ ] Inspect a heading in the browser — the computed `font-family` should show the correct typeface
