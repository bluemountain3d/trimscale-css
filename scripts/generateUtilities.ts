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
}

/**
 * Resolves `cfg.utilities`'s `boolean | { ...subFlags }` shape per section
 * into flat per-group booleans. A section set to `false` at the top level
 * (or omitted, since each section itself is optional) forces every one of
 * its sub-flags false too, so `spacing: false` really does mean zero
 * spacing classes, not just the two scale loops. Omitting a section
 * entirely, or the whole `utilities` field, resolves every group to `true`.
 */
export const resolveUtilityFlags = (utilities: UtilitiesConfig | undefined): ResolvedUtilityFlags => {
  const spacing = utilities?.spacing ?? true
  const typography = utilities?.typography ?? true

  const spacingOn = spacing !== false
  const typographyOn = typography !== false

  const spacingSub = (key: 'base' | 'tshirt' | 'numeric'): boolean =>
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
    spacingTshirt: spacingSub('tshirt'),
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
  }
}
