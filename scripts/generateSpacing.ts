import * as fs from 'node:fs';
import path from 'node:path';
import { setScssMap, setScssMapEntries } from './helpers.ts';
import { loadConfig } from './loadConfig.ts';

const cfg = await loadConfig()
const spacingSetup = cfg.spacingSetup
const coupledSpacing = spacingSetup.approach === 'coupled'; 

const spacingSetupToScssMap = (): string | undefined => {
  if (coupledSpacing) {
    const spaceValues = setScssMap('','space-values', setScssMapEntries(spacingSetup.tShirtScale, 1));
    return spaceValues
  }

  if (!coupledSpacing) {
    const spaceMicro = setScssMap('', 'space-micro', setScssMapEntries(spacingSetup.tShirtScaleMicro, 1));
    const spaceMacro = setScssMap('', 'space-macro', setScssMapEntries(spacingSetup.tShirtScaleMacro, 1));
    return `${spaceMicro}\n${spaceMacro}`
  }
}

const baseTokensOutput = `
@use "abstracts/functions/" as fn;
@use "abstracts/variables" as var;

/// @group Tokens
/// @name Base Tokens
/// @description Foundation CSS custom properties for fluid typography and spacing system
/// ===========================================================================

@property --vwx {
  syntax: "<length>";
  inherits: true;
  initial-value: 1vw;
}

@property --fluid-base {
  syntax: "<length>";
  inherits: true;
  initial-value: 1rem;
}
${coupledSpacing
  ? `
@property --unit {
  syntax: "<length>";
  inherits: true;
  initial-value: 0.25rem;
} `
  : `
@property --unit-micro {
  syntax: "<length>";
  inherits: true;
  initial-value: 0.25rem;
}

@property --unit-macro {
  syntax: "<length>";
  inherits: true;
  initial-value: 0.25rem;
}`}

@property --header-height {
  syntax: "<length>";
  inherits: true;
  initial-value: 8rem;
}

@layer tokens {
  :root {
    // ============================================================================
    // Viewport Unit System
    // ============================================================================

    /// Custom viewport unit that adapts to ultrawide displays
    /// Standard: 1vw (viewport width)
    /// Ultrawide (≥21:9 & ≥ $ultrawide-threshold-px): 2vh to prevent excessive scaling
    --vwx: 1vw;

    /// Switch to height-based scaling on ultrawide displays
    /// Prevents text from becoming too large on very wide screens
    @media (aspect-ratio >= 21/9) and (height >= #{fn.pxToRem(var.$ultrawide-height-threshold-px)}) {
      --vwx: 2vh;
    }

    // ==========================================================================
    // Fluid Base Values
    // ==========================================================================

    /// Fluid base font size
    /// Scales from 16px @ 360px viewport to 20px @ 1440px viewport
    /// Formula: clamp(1rem, 0.9167rem + 0.3472 * var(--vwx), 1.25rem)
    --fluid-base: #{fn.fluidFontSize(0, "vwx")};
    ${coupledSpacing
      ? `
    /// Base spacing unit (1/4 of fluid base)
    /// Used as foundation for all spacing tokens
    /// At 16px base = 4px unit, at 20px base = 5px unit
    --unit: calc(var(--fluid-base) / #{var.$base-grid-size});`
      : `
    /// Base spacing unit for small steps — static grid unit ($base-grid-size), not fluid
    /// The old fluid-base/4 formula only ever rounded to 4px or 5px, so the
    /// continuous interpolation bought nothing once snapped to a pixel grid.
    /// container-spacing-provider mirrors this same static value.
    --unit-micro: #{fn.pxToRem(var.$base-grid-size)};

    /// Base spacing unit for large steps, an independent 4px → 8px fluid clamp
    --unit-macro: round(#{fn.getFluidClamp(4, 8, "vwx")}, 1px);`
    }
  }
}
`;

const baseTokensOutputFile = path.join(import.meta.dirname, '../styles/tokens/_base-tokens.scss')
fs.writeFileSync(baseTokensOutputFile, baseTokensOutput)
console.log('- Base Tokens is written to file')


const spacingTokensOutput = coupledSpacing 
    ? `
/// @group Tokens
/// @name Spacing Tokens
/// @description Fluid spacing scale based on --unit from base tokens
/// Provides both t-shirt sizes (xs, sm, md...) and numeric scale (1-48)
/// ===========================================================================

// ============================================================================
// T-shirt Size Scale Configuration
// ============================================================================

/// Spacing scale multipliers
/// @type Map
/// Each value is a multiplier of --unit (which is 1/4 of --fluid-base)
/// Example: --space-sm = calc(var(--unit) * 4) = 1rem at base font size
${spacingSetupToScssMap()}

// ============================================================================
// CSS Custom Properties
// ============================================================================

@each $size, $factor in $space-values {
  @property --space-#{$size} {
    syntax: "<length>";
    inherits: true;
    initial-value: 0.25rem;
  }
}

@for $i from 1 through 48 {
  @property --space-#{$i} {
    syntax: "<length>";
    inherits: true;
    initial-value: 0.25rem;
  }
}

@layer tokens {
  :root {
    // ==========================================================================
    // T-shirt Size Scale
    // ==========================================================================

    /// Semantic spacing tokens using t-shirt sizes
    /// Usage: padding: var(--space-sm); gap: var(--space-lg);
    @each $size, $factor in $space-values {
      --space-#{$size}: calc(var(--unit) * #{$factor});
    }

    // ==========================================================================
    // Numeric Scale (1-48)
    // ==========================================================================

    /// Numeric spacing tokens for fine-grained control
    /// Usage: margin-block: var(--space-5); padding-inline: var(--space-12);
    @for $i from 1 through ${spacingSetup.numericScaleEnd} {
      --space-#{$i}: calc(var(--unit) * #{$i});
    }
  }
}`
    : `
@use "sass:map";

/// @group Tokens
/// @name Spacing Tokens
/// @description Fluid spacing scale based on --unit-micro/--unit-macro from base tokens
/// Provides both t-shirt sizes (xs, sm, md...) and numeric scale (1-48)
/// ===========================================================================

// ============================================================================
// T-shirt Size Scale Configuration
// ============================================================================

/// Spacing scale multipliers
/// @type Map
/// $space-micro values are multipliers of --unit-micro (1/4 of --fluid-base);
/// $space-macro values are multipliers of --unit-macro (an independent 4px → 8px fluid clamp)
/// Example: --space-sm = calc(var(--unit-micro) * 4) = 1rem at base font size
${spacingSetupToScssMap()}

$space-values: map.merge($space-micro, $space-macro) !default;

// ============================================================================
// CSS Custom Properties
// ============================================================================

@each $size, $factor in $space-values {
  @property --space-#{$size} {
    syntax: "<length>";
    inherits: true;
    initial-value: 0.25rem;
  }
}

@for $i from 1 through 48 {
  @property --space-#{$i} {
    syntax: "<length>";
    inherits: true;
    initial-value: 0.25rem;
  }
}

@layer tokens {
  :root {
    // ==========================================================================
    // T-shirt Size Scale
    // ==========================================================================

    /// Semantic spacing tokens using t-shirt sizes
    /// Usage: padding: var(--space-sm); gap: var(--space-lg);
    @each $size, $factor in $space-micro {
      --space-#{$size}: calc(var(--unit-micro) * #{$factor}
      );
    }

    @each $size, $factor in $space-macro {
      --space-#{$size}: calc(var(--unit-macro) * #{$factor});
    }

    // ==========================================================================
    // Numeric Scale (1-48)
    // ==========================================================================

    /// Numeric spacing tokens for fine-grained control
    /// Usage: margin-block: var(--space-5); padding-inline: var(--space-12);
    @for $i from 1 through ${spacingSetup.numericScaleMicroEnd} {
      --space-#{$i}: calc(var(--unit-micro) * #{$i});
    }

    @for $i from ${spacingSetup.numericScaleMicroEnd + 1} through ${spacingSetup.numericScaleMacroEnd} {
      --space-#{$i}: calc(var(--unit-macro) * #{$i});
    }
  }
}`

const spacingTokensOutputFile = path.join(import.meta.dirname, '../styles/tokens/_spacing-tokens.scss')
fs.writeFileSync(spacingTokensOutputFile, spacingTokensOutput)
console.log('- Spacing Tokens is written to file')