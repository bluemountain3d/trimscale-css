import * as fs from 'node:fs'
import path from 'node:path'
import { raw, setScssMap, setScssMapEntries, toKebabCase } from './helpers.ts'
import { loadConfig } from './loadConfig.ts'

const cfg = await loadConfig()

/** Builds the `$breakpoints` SCSS map from `cfg.breakpoints`, converting each px value to rem via `fn.pxToRem`. */
const breakpointsToScssMap = (): string => {
  const rawData = Object.fromEntries(
    Object.entries(cfg.breakpoints).map(([key, value]) => [toKebabCase(key), raw(`fn.pxToRem(${value})`)]),
  )
  const entries = setScssMapEntries(rawData)
  return setScssMap('', 'breakpoints', entries)
}

const output = `
/// @group Abstracts/Variables
/// @name Breakpoints
/// @description Responsive breakpoints and typography scale configuration
/// ===========================================================================

@use 'abstracts/functions/fn_unit-utils' as fn;

// ============================================================================
// Grid System
// ============================================================================

/// Base font size — matches min-font-size in $fluid-scale
/// Used as the rem base for unit conversion functions
/// @type Number
$base-font-size: 16px !default;

/// Base grid unit
/// @type Number
$base-grid-size: 4 !default; // 4px grid

// ============================================================================
// Breakpoints
// ============================================================================

/// Responsive breakpoints map (in rem)
/// @type Map
${breakpointsToScssMap()}

/// Viewport height threshold for the ultrawide aspect-ratio check
/// @type Number
/// @see styles/tokens/_base-tokens.scss
$ultrawide-height-threshold-px: 944px;
`

const outputFile = path.join(import.meta.dirname, '../styles/abstracts/variables/_breakpoints.scss')
fs.writeFileSync(outputFile, output)
console.log('- Breakpoint abstracts is written to file')
