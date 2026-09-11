import type { UtilitiesConfig } from '../models/Config.ts'

/** Every gateable utility-class group, flattened to a single resolved boolean per group. See `styles/abstracts/variables/_utilities.scss` for the matching `!default` vars. */
export type ResolvedUtilityFlags = {
  spacingBase: boolean
  spacingTshirt: boolean
  spacingNumeric: boolean
  typographyTrim: boolean
  typographyFamily: boolean
  typographySize: boolean
  typographyLineHeight: boolean
  typographyWeight: boolean
  typographyStyle: boolean
  typographyTextTransform: boolean
  typographyTextAlign: boolean
  typographyNumericFigures: boolean
  a11y: boolean
}

/**
 * Resolves `cfg.output.utilities`'s `boolean | { ...subFlags }` shape per
 * section into flat per-group booleans. A section set to `false` at the top
 * level (or omitted, since each section itself is optional) forces every
 * one of its sub-flags false too, so `spacing: false` really does mean zero
 * spacing classes, not just the two scale loops. Omitting a section
 * entirely, or the whole `output.utilities` field, resolves every group to
 * `true`; `output.utilities: false` resolves every group to `false`, the
 * same shape as turning each section off by hand.
 */
export const resolveUtilityFlags = (utilities: boolean | UtilitiesConfig | undefined): ResolvedUtilityFlags => {
  // Normalized to the object form once, so everything below has one shape to
  // read: `true` and `undefined` are what an empty object already resolves
  // to, and `false` is every section turned off by hand.
  const sections: UtilitiesConfig =
    typeof utilities === 'boolean'
      ? utilities
        ? {}
        : { spacing: false, typography: false, a11y: false }
      : (utilities ?? {})

  const spacing = sections.spacing ?? true
  const typography = sections.typography ?? true

  const spacingOn = spacing !== false
  const typographyOn = typography !== false

  const spacingSub = (key: 'base' | 'tShirt' | 'numeric'): boolean =>
    spacingOn && (typeof spacing === 'object' ? (spacing[key] ?? true) : true)

  const typographySub = (
    key:
      | 'trim'
      | 'family'
      | 'size'
      | 'lineHeight'
      | 'weight'
      | 'style'
      | 'textTransform'
      | 'textAlign'
      | 'numericFigures',
  ): boolean => typographyOn && (typeof typography === 'object' ? (typography[key] ?? true) : true)

  return {
    spacingBase: spacingSub('base'),
    spacingTshirt: spacingSub('tShirt'),
    spacingNumeric: spacingSub('numeric'),
    typographyTrim: typographySub('trim'),
    typographyFamily: typographySub('family'),
    typographySize: typographySub('size'),
    typographyLineHeight: typographySub('lineHeight'),
    typographyWeight: typographySub('weight'),
    typographyStyle: typographySub('style'),
    typographyTextTransform: typographySub('textTransform'),
    typographyTextAlign: typographySub('textAlign'),
    typographyNumericFigures: typographySub('numericFigures'),
    a11y: sections.a11y ?? true,
  }
}
