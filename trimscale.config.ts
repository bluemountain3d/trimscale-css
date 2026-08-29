import type { TrimscaleConfig } from './models/Config.ts'

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
 * - fluidScale, modularTypographicScale, semanticFontSizes                                               
 *   → docs/customizing-type-scale.md
 * 
 * - fontWeights, lineHeights                             
 *   → docs/design-tokens.md#typography-tokens
 * - spacingSetup                                         
 *   → docs/customizing-spacing.md
 * - defaultScheme, baseColorTokens, campaignColorTokens, semanticColorAliases
 *   → docs/design-tokens.md#color-tokens
 *     (semanticColorAliases' derivation logic: docs/abstracts.md)
 */
const config: TrimscaleConfig = {
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
      'Roboto': {
        source: 'local',
        path: [
          '../fixtures/fonts/Roboto-VariableFont_wght-100-900_subset.woff2',
          '../fixtures/fonts/Roboto-VariableFont_wght-100-900-Italic_subset.woff2',
        ],
        fallback: 'sans-serif',
      },
      'Roboto Serif': {
        source: 'local',
        path: [
          '../fixtures/fonts/RobotoSerif-VariableFont_wght-100-900_subset.woff2',
          '../fixtures/fonts/RobotoSerif-VariableFont_wght-100-900-Italic_subset.woff2',
        ],
        fallback: 'serif',
      },
      'Roboto Mono': {
        source: 'local',
        path: [
          '../fixtures/fonts/RobotoMono-VariableFont_wght-100-700_subset.woff2',
          '../fixtures/fonts/RobotoMono-VariableFont_wght-100-700-Italic_subset.woff2',
        ],
        fallback: 'monospace',
      },
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
    // System Default
    // Hierarchical
    primary: 'Roboto',
    secondary: 'Roboto Serif',
    tertiary: 'Roboto Mono',
    // Category
    sans: 'Roboto',
    serif: 'Roboto Serif',
    mono: 'Roboto Mono',
    // Contextual
    display: 'Roboto Serif',
    heading: 'Roboto Serif',
    subheading: 'Roboto',
    body: 'Roboto',
    quote: 'Roboto Serif',
    code: 'Roboto Mono',
    ui: 'Roboto',
    // Custom
    // E.g. ink: 'Some Font Name',
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
   * Fluid clamp() boundaries: base font-size and modular-scale ratio at the min/max viewport widths.
   * → docs/customizing-type-scale.md · docs/full-config-reference.md#fluidscale
   */
  fluidScale: {
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
   * How --space-* tokens grow across viewport widths: 'coupled' (spacing
   * tracks the fluid type scale) or 'independent' (its own two-unit
   * system, --unit-micro/--unit-macro). The two shapes aren't combinable.
   * → docs/customizing-spacing.md · docs/full-config-reference.md#spacingsetup
   */
  spacingSetup: {
    approach: 'independent',
    macroRangeMax: 8,
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
    // (macroRangeMax, tShirtScaleMicro, tShirtScaleMacro, numericScaleMicroEnd,
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
    // Examples
    prefix: 'color',
    tokens: {
      surfaceBase: {
        light: { oklch: 'oklch(0.973 0.003 264)', hex: '#f5f6f8' },
        dark: { oklch: 'oklch(0.214 0.008 274)', hex: '#18191d' },
        // opacity: 0.8,
      },
      surfaceElevated: {
        light: { oklch: 'oklch(1 0 0)', hex: '#ffffff' },
        dark: { oklch: 'oklch(0.29 0.021 270)', hex: '#272B36' },
        // opacity: 0.8,
      },
      surfaceMid: {
        light: { oklch: 'oklch(0.949 0.008 271)', hex: '#eceef4' },
        dark: { oklch: 'oklch(0.253 0.015 274)', hex: '#20222a' },
        // opacity: 0.8,
      },
      action: {
        light: { oklch: 'oklch(0.485 0.105 271)', hex: '#495a9a' },
        dark: { oklch: 'oklch(0.66 0.057 270)', hex: '#8491b6' },
        // opacity: 0.8,
      },
      actionHover: {
        light: { oklch: 'oklch(0.651 0.085 270)', hex: '#7b8dc4' },
        dark: { oklch: 'oklch(0.78 0.067 270)', hex: '#a6b6e3' },
        // opacity: 0.8,
      },
      actionMuted: {
        light: { oklch: 'oklch(0.734 0.0543 269)', hex: '#9ba8cc' },
        dark: { oklch: 'oklch(0.559 0.048 270)', hex: '#697391' },
        // opacity: 0.8,
      },
    },
  },

  /**
   * Optional. Extra color maps alongside baseColorTokens, keyed as
   * `{name}ColorTokens` (e.g. campaignColorTokens). Referenced from
   * semanticColorAliases via `tokenMap`.
   * → docs/full-config-reference.md#custom-color-token-maps-namecolortokens
   */
  campaignColorTokens: {
    prefix: 'campaign',
    tokens: {
      goldLight: {
        light: { oklch: 'oklch(0.921 0.07 100)', hex: '#efe7b1' },
        dark: { oklch: 'oklch(0.921 0.07 100)', hex: '#efe7b1' },
        // opacity: 0.8,
      },
      goldDark: {
        light: { oklch: 'oklch(0.551 0.099 81)', hex: '#8F6B22' },
        dark: { oklch: 'oklch(0.351 0.037 48)', hex: '#4b352a' },
        // opacity: 0.8,
      },
    },
  },

  /**
   * Optional. Semantic names (e.g. "text-muted") that alias a token from
   * baseColorTokens or a tokenMap, with optional opacity/lightness/chroma
   * overrides (single value, or per light/dark).
   * → docs/design-tokens.md#color-tokens · docs/full-config-reference.md#semanticcoloraliases
   */
  semanticColorAliases: {
    scrollThumb: {
      token: 'action',
      tokenMap: 'baseColorTokens',
      opacity: 1,
      chroma: { light: 0.8, dark: 1.25 },
      lightness: { light: 0.75, dark: 1.333 },
    },
  },
}

export default config
