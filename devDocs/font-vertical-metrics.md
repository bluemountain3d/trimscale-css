# Font Vertical Metrics and the Leading-Trim Fallback

Why the `@supports not (text-box-trim)` path in `styles/tokens/_leading-trim.scss` is correct for some fonts and visibly wrong for others, what the package does about it, and where it runs out of room. Background for maintaining that block and for the warning in `scripts/fontData.ts`. Consumer-facing summary lives in [adding-a-font.md](../docs/adding-a-font.md#when-trimmed-text-sits-low-in-one-browser-but-not-another).

## Three tables, one em

A font declares its vertical extents three times over, and the three rarely agree:

| Table | Fields | Intended meaning |
| --- | --- | --- |
| OS/2 typo | `sTypoAscender`, `sTypoDescender`, `sTypoLineGap` | The designer's intended line metrics |
| OS/2 win | `usWinAscent`, `usWinDescent` | Clipping bounds: how far glyphs reach, so a rasterizer knows not to cut them off |
| `hhea` | `ascender`, `descender`, `lineGap` | The original Apple line metrics |

Which pair a browser turns into the content area is not the font's choice to make directly. With OS/2 `fsSelection` bit 7 (`USE_TYPO_METRICS`) set, every engine reads the typo pair. With it clear, Windows engines read `usWin` and macOS reads `hhea`. The typo pair was added because the other two had already been pressed into a job neither was specified for, and `usWin` is the worst fit of the three: it describes ink extremes, so a font with a long swash or a tall accent declares a content area far larger than its em.

## What the package computes

`getCorrectedAscenderDescender` clips the typo pair so it sums to at most the em, splitting any overshoot evenly. `topTrim` is then `correctedAscender - capHeight` and `bottomTrim` is `correctedDescender`, both normalized to em. Together they always sum to `1em - capHeight`, which is what makes the trim total independent of which pair the browser picked.

The fallback removes `(1lh - 1em) / 2` from each end plus the relevant trim value. That subtraction is where the em enters: it assumes the content area is exactly 1em, which is true only when the browser reads the same pair the trim was derived from, and that pair reaches or exceeds the em.

## The error

Write A and D for the pair the browser actually reads, and Ac and Dc for the corrected typo pair the trim was computed from. The browser puts the cap top at

```
(1lh - (A + D)) / 2 + (A - capHeight)
```

below the line box top, while the fallback removes

```
(1lh - 1em) / 2 + (Ac - capHeight)
```

Subtracting cancels `1lh` and `capHeight` and leaves

```
(1 - (A + D)) / 2 + (A - Ac)
```

which is `capTopError` in `scripts/fontMetrics.helpers.ts`. The same subtraction at the bottom gives `(1 - (A + D)) / 2 + (D - Dc)`, and because `Ac + Dc` is 1 whenever clipping happened, the two are exact negatives. **The total trimmed is therefore always right and only the split is wrong**: the box keeps the correct height and the text sits low inside it. That is why the symptom reads as a layout bug rather than as a metrics bug, and why it survives casual inspection.

Native `text-box-trim` is immune. `text-box-edge: cap alphabetic` reads cap height and baseline out of the font directly and never consults the content area, so the four `--_*` custom properties do not participate in that path at all.

## Why the bit is not the signal

Warning on `USE_TYPO_METRICS` being clear produces 61% false alarms: across the 3793 files in `C:\Dev\Fonts\GoogleFontsGit`, 64.9% set the bit, but 86.2% have an error under 0.005em, because most fonts that leave it clear have tables that agree closely enough to cost nothing. The distribution is bimodal, 10.9% exceed 0.05em with very little in between, so the threshold is not a delicate parameter: anything from 0.005 to 0.05 selects nearly the same set.

The bit also misses in the other direction. A font that sets it but whose typo pair sums to less than the em is never clipped, so `Ac` equals A, and the error is `(1 - (A + D)) / 2`, small but nonzero. The condition for zero error is not "the bit is set" and not "the tables agree", it is that the pair the browser reads, after the same clipping, equals the corrected typo pair.

Of the badly affected fonts, 287 of 412 have a typo sum of exactly 1.000. That is the tell: no clipping happens, so any inflation lives entirely in `usWin`. Inter, Playfair Display, Lora and Open Sans are clean. Roboto is off by 0.1001em.

## The fix, and where it does not reach

Every `@font-face` the package writes carries `ascent-override` and `descent-override` computed from the corrected pair, which forces the content area to exactly 1em regardless of which table the engine would have read. This is not a per-platform patch, it removes the branch entirely, and it is why `local` and `cdn`-with-`generateFontFace` families are correct everywhere.

The overrides can only sit in a rule the package writes. For the rest, `generate` warns above the threshold and names the two values (`next/font/local` takes them through `declarations`; `next/font/google` has no hook). `manual` gets neither the fix nor the warning: the file the values would be read from is absent by definition, which is the whole meaning of the source.

## Case study: Adobe Fonts, September 2026

Two Typekit families through `source: 'manual'`, measured in the browser with `measureText().fontBoundingBox*` and cross-checked against the desktop files in FontDrop.

**Brioso Pro.** upm 1000, `hhea` 696 / -304 / 200, `usWin` 846 / 341, precisionspec's corrected pair 0.696 / 0.304. `usWin` matches the browser's reading on Windows exactly (Brave 0.846 / 0.341, Firefox 0.843 / 0.340), so Adobe's web build and the desktop file are vertically identical and nothing is being rewritten in delivery.

```
errWin  = (1 - 1.187) / 2 + (0.846 - 0.696) = 0.0565
errHhea = (1 - 1.000) / 2 + (0.696 - 0.696) = 0
```

The computed `errWin` matches the measured value to the thousandth. But `hhea` is identical to typo and sums to exactly the em, so **the font is already correct on macOS**. Hand-correcting the config for Windows introduces the same 0.0565em offset on macOS, in the other direction.

**Proxima Nova.** upm 1000, `hhea` 920 / -298 / 0, `usWin` 920 / 210, precisionspec's pair 0.79 / 0.21. The browser reads 1.079 / 0.325, which is neither, so this family's web build carries different vertical tables than the desktop file. Cap height still agrees within 0.005em, so the outlines are the same design. Its served `hhea` is unmeasured; reading the delivered woff2 would settle it.

## What this rules out

A per-font correction folded into `topTrim`/`bottomTrim` works, keeps the sum, and leaves the native path untouched, so it is a legitimate manual remedy. It cannot become a config field. The field would have to carry the browser-read pair, there are two of them, they are read per platform, and CSS cannot branch on the platform. Brioso is the counterexample that settles it: any single number is right on one platform and wrong on the other by the same amount.

Forcing `USE_TYPO_METRICS` is not available either. It is a bit in the binary with no CSS equivalent, and a font you can patch is a font you can self-host, at which point `ascent-override` is both available and strictly stronger, since it pins exact values rather than redirecting to a table that may still not sum to the em.

## Shelf life

This whole class of problem is confined to the `@supports not` branch, which is marked for removal in `_leading-trim.scss` once traffic from engines without native `text-box-trim` drops below the project's threshold. Check analytics rather than Baseline's dates. Until then the fallback is what the majority of the correctness surface here refers to.
