import * as fs from 'node:fs'
import path from 'node:path'
import type { ScaleStep, SizeStep } from '../models/Config.ts'
import {
  // metricsList,
  setNestedScssMap,
  setScssMap,
  setScssMapEntries,
  setScssMapEntry,
  toKebabCase,
} from './helpers.ts'
import { loadConfig } from './loadConfig.ts'

const cfg = await loadConfig()

// Font Roles =================================================================
/** Builds the `$font-roles` SCSS map from `cfg.fontRoles`. */
const fontRolesToScssMap = (): string => {
  const sassDocs = `
/// Semantic font role assignments
/// @type Map
`
  const entries = setScssMapEntries(cfg.fontRoles)
  return setScssMap(sassDocs, 'font-roles', entries)
}

// Modular Typographic Scale ==================================================
/** Builds the `$modular-typographic-scale` SCSS map from `cfg.modularTypographicScale`, one nested `{step, unit}` map per fs-key. */
const modularTypographicScaleToScssMap = (): string => {
  const sassDocs = `/// Modular Typographic Scale Map
/// @type Map
`
  const entries = Object.entries(cfg.modularTypographicScale).map(([key, value]) => {
    const innerEntries = Object.entries(value as ScaleStep).map(([k, v]) =>
      setScssMapEntry(k, v, 2))
    return setNestedScssMap(toKebabCase(key), innerEntries, 1)
  })
  return setScssMap(sassDocs, 'modular-typographic-scale', entries)
}

// Semantic Font Sizes ========================================================
/**
 * Builds the `$semantic-font-sizes` SCSS map from `cfg.semanticFontSizes`,
 * one nested `SizeStep` map per role. A `from` value is kebab-cased (it
 * references another map key); all other `SizeStep` fields pass through as-is.
 */
const semanticFontSizesToScssMap = (): string => {
  const sassDocs = `
/// Semantic font sizes map
/// @type Map
`
  const entries = Object.entries(cfg.semanticFontSizes).map(([key, value]) => {
    const innerEntries = Object.entries(value as SizeStep).map(([k, v]) => 
      setScssMapEntry(k, k === 'from' ? toKebabCase(v as string) : v, 2)
    );
    return setNestedScssMap(toKebabCase(key), innerEntries, 1)
  })

  return setScssMap(sassDocs, 'semantic-font-sizes', entries)
}

// Font Weights ===============================================================
/** Builds the `$font-weights` SCSS map from `cfg.fontWeights`. */
const fontWeightsToScssMap = (): string => {
  const sassDocs = `
/// Semantic Font Weights Map
/// @type Map
`
  const entries = setScssMapEntries(cfg.fontWeights)
  return setScssMap(sassDocs, 'font-weights', entries)
}

// Line-heights ===============================================================
/** Builds the `$line-heights` SCSS map from `cfg.lineHeights`. */
const lineHeightsToScssMap = (): string => {
  const sassDocs = `
/// Semantic Line Heights Map
/// @type Map
`
  const entries = setScssMapEntries(cfg.lineHeights)
  return setScssMap(sassDocs, 'line-heights', entries)
}

// Private Get Metrics Function ===============================================
// const privateGetMetricFunction = `
// /// Get font metric from font-metrics
// /// @access private
// @function _get-metric($font-key, $metric-key) {
//   $font-name: map.get($font-roles, $font-key);
//   @return map.get(map.get(metrics.$font-metrics, $font-name), $metric-key);
// }
// `

// Font Metrics SCSS Variables ================================================
// const fontRolesToMetricScssVariables = (): string => {
//   const arr: string[] = Object.entries(cfg.fontRoles).map(([key]) => {
//     const metricVariables: string[] = metricsList.map((metric) => {
//       const prefix = metric === 'family' ? 'ff' : metric
//       return `$${prefix}-${key}: _get-metric("${key}", "${toKebabCase(metric)}") !default;\n`
//     })

//     return `/// ${key}\n${metricVariables.join('')}\n`
//   })

//   return `\n${arr.join('')}`
// }

// Output =====================================================================
const output = `
@use './font-metrics' as metrics;
@use 'sass:map';

/// @group Abstracts/Variables
/// @name Typography Configuration
/// @description Font role mappings and exported font-family variables
///
/// CONFIGURATION LAYER - Maps semantic roles to actual fonts
///
/// Font Role Philosophy:
/// - Hierarchical (primary/secondary/tertiary): Core system - use these by default
/// - Category (sans/serif/mono): Type classification - use when type matters
/// - Contextual (display/body/heading/etc): Convenience aliases - use when it improves clarity
///
/// All roles map to fonts defined in $font-metrics (font-metrics.scss)
/// Font family strings are automatically extracted from metrics data
///
/// @requires abstracts/variables/font-metrics
/// @see abstracts/mixins/mx_font-setup For applying these fonts with metrics
/// ===========================================================================


// ============================================================================
// Typography lists and maps
// ============================================================================

${fontRolesToScssMap()}
${modularTypographicScaleToScssMap()}
${semanticFontSizesToScssMap()}
${fontWeightsToScssMap()}
${lineHeightsToScssMap()}
`
// ${scssSectionTitle('Exported Metric Variables')}
// ${privateGetMetricFunction}
// ${fontRolesToMetricScssVariables()}`

const outFile = path.join(import.meta.dirname, '../styles/abstracts/variables/_typography.scss')
fs.writeFileSync(outFile, output)
console.log('- Typography abstracts is written to file')
