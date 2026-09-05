import type { TrimscaleConfig } from 'trimscale-css/models/Config.ts'

/**
 * Trimscale design-system configuration. Edit values here to customize the
 * generated tokens — see node_modules/trimscale-css/docs/ for the full reference,
 * or docs/full-config-reference.md for a single-page property-by-property index.
 *
 * Where to find the docs for each section below:
 * - appFonts, fontRoles
 *   → docs/adding-a-font.md
 * - breakpoints
 *   → docs/customizing-breakpoints.md
 * - ultrawideHeightThresholdPx
 *   → docs/design-tokens.md#base-tokens
 * - fluidScale, modularTypographicScale, semanticFontSizes
 *   → docs/customizing-type-scale.md
 *
 * - fontWeights, lineHeights, dynamicLineHeight
 *   → docs/design-tokens.md#typography-tokens
 * - spacingSetup
 *   → docs/customizing-spacing.md
 * - defaultScheme, baseColorTokens, campaignColorTokens, semanticColorAliases
 *   → docs/design-tokens.md#color-tokens
 *     (semanticColorAliases' derivation logic: docs/abstracts.md)
 */
const config: TrimscaleConfig = {
  /**
   * Where `trimscale-css generate` writes this project's generated output
   * (the bridge file + any @font-face rules), relative to this file.
   * Optional, defaults to './trimscale-generated'.
   * → docs/getting-started.md
   */
  // outDir: './trimscale-generated',

  /**
   * Font sources (local file, CDN URL, or hand-entered metrics), keyed by
   * family name, and their fallback stacks.
   * → docs/adding-a-font.md · docs/full-config-reference.md#appfonts
   */
  appFonts: {
    nextFontDefault: false,         // if using Next.js `next/font` (local or google)
    nextFontPrefix: 'next-font',    // if using Next.js, font `variable` must be `--{prefix}-{family-name}`
    fallbackDefault: 'sans-serif',  // used when a font entry below has no `fallback` of its own
    fonts: {
      // Placeholder so `generate` produces working output before you've set
      // up a real font. Replace it, see docs/adding-a-font.md.
      'System Sans': {
        source: 'manual',
        fallback: 'sans-serif',
        metrics: { avgCharWidth: 0.5, topTrim: 0, bottomTrim: 0, lsbAdjust: 0, rsbAdjust: 0 },
      },
      // Local example (self-hosted font file, path relative to this file):
      // 'Roboto': {
      //   source: 'local',
      //   path: ['./public/fonts/Roboto-Regular.woff2', './public/fonts/Roboto-Bold.woff2'],
      //   fallback: 'sans-serif',
      // },
      // CDN example (metrics auto-extracted, no @font-face written by default):
      // 'Open Sans': {
      //   source: 'cdn',
      //   url: ['https://fonts.gstatic.com/s/opensans/v40/....woff2'],
      //   fallback: 'sans-serif',
      // },
      // Manual example, for CDNs that don't expose a downloadable file — get
      // the metrics from precisionspec.dev:
      // 'Proxima Nova': {
      //   source: 'manual',
      //   fallback: 'sans-serif',
      //   metrics: {
      //     avgCharWidth: 0.545,
      //     topTrim: 0.107,
      //     bottomTrim: 0.02,
      //     lsbAdjust: -0.012,
      //     rsbAdjust: -0.012,
      //   },
      // },
    },
  },

  /**
   * Maps semantic font roles (primary, heading, body, etc.) to font family
   * names defined in appFonts.fonts. primary and body are required, the rest optional.
   * → docs/full-config-reference.md#fontroles
   */
  fontRoles: {
    primary: 'System Sans',
    body: 'System Sans',
    // Add more roles once you've replaced the placeholder above, e.g.:
    // secondary: 'Some Font Name',
    // heading: 'Some Font Name',
  },

  /**
   * Named viewport breakpoints (px), converted to rem for the $breakpoints
   * SCSS map. Keys become kebab-case (e.g. tabletLg → tablet-lg). Must be
   * added smallest to largest.
   * → docs/customizing-breakpoints.md · docs/full-config-reference.md#breakpoints
   */
  breakpoints: {
    // System Default (optional)
    mobile: 320,
    phablet: 540,
    tablet: 720,
    tabletLg: 1024,
    laptop: 1280,
    desktop: 1440,
    // Custom:
    // E.g. xSmall: 360 or mobileLarge: 480
  },

  /**
   * Viewport height (px) threshold for the --vwx ultrawide switch-over
   * (paired with a >= 21:9 aspect ratio check). Optional, defaults to 944.
   * → docs/design-tokens.md#base-tokens
   */
  // ultrawideHeightThresholdPx: 944,

  /**
   * Fluid clamp() boundaries: base font-size and modular-scale ratio at the min/max viewport widths.
   * → docs/customizing-type-scale.md · docs/full-config-reference.md#fluidscale
   */
  fluidScale: {
    // System default
    minWidth: 360,
    maxWidth: 1440,
    minFontSize: 16,
    maxFontSize: 20,
    minTypeScale: 1.2,   // scale name (e.g "Minor Third") or scale value (e.g 1.2)
    maxTypeScale: 1.333, // scale name (e.g "Perfect Fourth") or scale value (e.g 1.333)
    precision: 4,        // integer 1-6
  },

  /**
   * The base modular scale (fs100..fs900). Each entry generates a --fs-*
   * fluid clamp() custom property from step/unit, referenced by
   * semanticFontSizes' `from` field for `type: 'scale'` entries.
   * → docs/customizing-type-scale.md · docs/full-config-reference.md#modulartypographicscale
   */
  modularTypographicScale: {
    // System Default (optional)
    fs900: { step: 6, unit: 'vwx', uncapped: true},
    fs800: { step: 5, unit: 'vwx', uncapped: true},
    fs700: { step: 4, unit: 'vwx' },
    fs600: { step: 3, unit: 'vwx' },
    fs500: { step: 2, unit: 'vwx' },
    fs400: { step: 1, unit: 'vwx' },
    fs350: { step: 0.5, unit: 'vwx' },
    fs300: { step: 0, unit: 'vwx' },
    fs200: { step: -1, unit: 'vwx' },
    fs100: { step: -2, unit: 'vwx' },
    // Custom
    // E.g: stepName: {step: 2.5, unit: 'cqw'}
  },

  /**
   * Named roles (display1, heading1, textBase, etc.), generates CSS custom
   * properties like --display-1, --text-base. Each role's `from` either
   * aliases a modularTypographicScale key (`type: 'scale'`) or multiplies
   * another semanticFontSizes role via calc() (`type: 'linear'`).
   * → docs/customizing-type-scale.md · docs/full-config-reference.md#semanticfontsizes
   */
  semanticFontSizes: {
    // System Default (optional)
    display1: { type: 'scale', from: 'fs900' },
    display2: { type: 'scale', from: 'fs800' },
    heading1: { type: 'scale', from: 'fs700' },
    heading2: { type: 'scale', from: 'fs600' },
    heading3: { type: 'scale', from: 'fs500' },
    heading4: { type: 'scale', from: 'fs400' },
    textLg: { type: 'scale', from: 'fs400' },
    textMd: { type: 'scale', from: 'fs350' },
    textBase: { type: 'scale', from: 'fs300' }, // --text-base: clamp(min, preferred, max);
    textSm: { type: 'linear', from: 'textBase', multiplier: 0.875 }, // --text-sm: calc(var(--text-base) * 0.875);
    textXs: { type: 'linear', from: 'textBase', multiplier: 0.75 }, // --text-xs: calc(var(--text-base) * 0.75);
    // Custom
    // E.g: heading5: {type: 'scale', from: 'fs350'}
  },

  /**
   * Named font-weight scale. Generates --font-weight-* custom properties.
   * → docs/full-config-reference.md#fontweights
   */
  fontWeights: {
    // System Default (optional)
    thin: 100,
    extralight: 200,
    light: 300,
    normal: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
    extrabold: 800,
    black: 900,
    // Custom
    // string: number,
  },

  /**
   * Named line-height scale (percent-based keys, e.g. "125" = 1.25).
   * Generates --line-height-* custom properties, e.g. "--line-height-125".
   * → docs/full-config-reference.md#lineheights
   */
  lineHeights: {
    // System Default (optional)
    '100': 1,
    '105': 1.05,
    '110': 1.1,
    '115': 1.15,
    '120': 1.2,
    '125': 1.25,
    '130': 1.3,
    '135': 1.35,
    '140': 1.4,
    '145': 1.45,
    '150': 1.5,
    '155': 1.55,
    '160': 1.6,
    '165': 1.65,
    '170': 1.7,
    '175': 1.75,
    '180': 1.8,
    '185': 1.85,
    '190': 1.9,
    '195': 1.95,
    '200': 2,
  },

  /**
   * Curve for the self-scaling --line-height-dynamic token. Optional, every
   * field falls back to its own default (shown below, commented out).
   * → docs/design-tokens.md#typography-tokens
   */
  // dynamicLineHeight: {
  //   fsBase: 16,
  //   ratioBase: 1.5,
  //   fsCeil: 64,
  //   ratioCeil: 1.05,
  //   ratioCap: 1.6,
  // },

  /**
   * How --space-* tokens grow across viewport widths: 'coupled' (spacing
   * tracks the fluid type scale) or 'independent' (its own two-unit
   * system, --unit-micro/--unit-macro). The two shapes aren't combinable.
   * → docs/customizing-spacing.md · docs/full-config-reference.md#spacingsetup
   */
  spacingSetup: {
    baseGridSize: 4,
    approach: 'independent',
    macroRangeMultiplier: 2,
    tShirtScaleMicro: {
      '3xs': 1,
      '2xs': 2,
      'xs': 3,
      'sm': 4,
      'md': 5,
      'lg': 6,
    },
    tShirtScaleMacro: {
      'xl': 6,
      '2xl': 8,
      '3xl': 10,
      '4xl': 12,
      '5xl': 16,
      '6xl': 20,
      '7xl': 24,
      '8xl': 28,
      '9xl': 32,
    },
    numericScaleMicroEnd: 6,
    numericScaleMacroEnd: 48,
    // Coupled example — remove/comment the independent-only fields above
    // (macroRangeMultiplier, tShirtScaleMicro, tShirtScaleMacro, numericScaleMicroEnd,
    // numericScaleMacroEnd) if you uncomment this, the two shapes can't coexist:
    // approach: 'coupled',
    // tShirtScale: {
    //   '3xs': 1, '2xs': 2, 'xs': 3, 'sm': 4, 'md': 5, 'lg': 6,
    //   'xl': 8, '2xl': 12, '3xl': 16, '4xl': 20,
    //   '5xl': 24, '6xl': 28, '7xl': 32, '8xl': 40, '9xl': 48,
    // },
    // numericScaleEnd: 48,
  },

  /**
   * Which scheme (light/dark) backs the static fallback tier for browsers
   * without oklch()/light-dark() support.
   * → docs/full-config-reference.md#defaultscheme
   */
  defaultScheme: 'light',

  /**
   * Base color palette. Each token generates a CSS custom property
   * (--{prefix}-{name}) with light/dark oklch/hex values and an optional
   * shared opacity. Referenced by name in semanticColorAliases.
   * → docs/full-config-reference.md#basecolortokens
   */
  baseColorTokens: {
    prefix: 'color',
    tokens: {
      // Placeholder palette, replace with your own.
      surfaceBase: {
        light: { oklch: 'oklch(0.973 0.003 264)', hex: '#f5f6f8' },
        dark: { oklch: 'oklch(0.214 0.008 274)', hex: '#18191d' },
      },
      textPrimary: {
        light: { oklch: 'oklch(0.228 0.014 273)', hex: '#1a1c23' },
        dark: { oklch: 'oklch(0.943 0 0)', hex: '#ececec' },
      },
    },
  },

  /**
   * Optional. Semantic names (e.g. "text-muted") that alias a token from
   * baseColorTokens or a tokenMap, with an optional absolute opacity plus
   * optional lightness/chroma MULTIPLIERS (not absolute values) applied to
   * the aliased token's existing channels (single value, or per light/dark).
   * → docs/design-tokens.md#color-tokens · docs/full-config-reference.md#semanticcoloraliases
   */
  // semanticColorAliases: {
  //   textMuted: {
  //     token: 'textPrimary',
  //     tokenMap: 'baseColorTokens',
  //     opacity: 0.7,
  //   },
  // },
}

export default config
