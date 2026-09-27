import type { SemanticAlias, SizeStep, TrimscaleConfig } from 'trimscale-css/models/Config.ts'
import type { Plugin } from 'vite'

// Same conversion the generator uses for token names (scripts/helpers.ts)
const kebab = (text: string) =>
  text
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/([a-zA-Z])(\d)/g, '$1-$2')
    .replace(/\s+/g, '-')
    .toLowerCase()

const escapeHtml = (text: string) =>
  text.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;')

const code = (text: string) => `<code>${escapeHtml(text)}</code>`

// Filled in and kept current by src/tokenValues.ts
const liveValue = '<span class="token-value" data-token-value></span>'

const SAMPLE_TEXT = 'Sphinx of black quartz, judge my vow'

// ============================================================================
// Typography
// ============================================================================

function typeScale(config: TrimscaleConfig) {
  const roles: Record<string, string | undefined> = config.appFonts?.fontRoles ?? {}
  const weights = config.fontWeights ?? {}

  const source = (step: SizeStep) =>
    step.type === 'scale'
      ? code(`--${kebab(step.from)}`)
      : `${code(`--${kebab(step.from)}`)} × ${step.multiplier}`

  const rows = Object.entries(config.semanticFontSizes ?? {}).flatMap(([name, step]) => {
    if (!step) return []
    const token = kebab(name)
    const isHeading = /^(display|heading)/.test(name)
    const role = isHeading
      ? (name.startsWith('display') && roles.display ? 'display' : roles.heading ? 'heading' : 'primary')
      : 'body'
    const classes = [
      'type-scale__sample',
      `trim-text-${role}`,
      `font-size-${token}`,
      isHeading && weights.medium !== undefined ? 'font-weight-medium' : '',
    ].filter(Boolean)

    return `
      <div class="type-scale__row" data-token>
        <p class="type-scale__meta">
          ${code(`--${token}`)}
          <span class="type-scale__source">${source(step)}</span>
          ${liveValue}
        </p>
        <p class="${classes.join(' ')}" data-measure="font-size">${SAMPLE_TEXT}</p>
      </div>`
  })

  return `<div class="type-scale">${rows.join('')}</div>`
}

function fontFamilies(config: TrimscaleConfig) {
  const roles = Object.entries(config.appFonts?.fontRoles ?? {})

  const items = Object.keys(config.appFonts?.families ?? {}).flatMap((family) => {
    const familyRoles = roles.filter(([, value]) => value === family).map(([role]) => role)
    if (familyRoles.length === 0) return []

    return `
      <li class="font-families__item">
        <span class="font-families__sample font-family-${familyRoles[0]}" aria-hidden="true">Aa</span>
        <span class="font-families__name">${escapeHtml(family)}</span>
        <span class="font-families__roles">${familyRoles.map(code).join(' ')}</span>
      </li>`
  })

  return `<ul class="font-families">${items.join('')}</ul>`
}

function fontWeights(config: TrimscaleConfig) {
  const items = Object.entries(config.fontWeights ?? {}).flatMap(([name, weight]) => {
    if (weight === undefined) return []
    return `
      <li class="font-weights__item">
        <span class="font-weights__sample font-family-body font-weight-${kebab(name)}" aria-hidden="true">Aa</span>
        ${code(kebab(name))}
        <span class="font-weights__value">${weight}</span>
      </li>`
  })

  return `<ul class="font-weights">${items.join('')}</ul>`
}

// ============================================================================
// Spacing
// ============================================================================

function spaceScale(config: TrimscaleConfig) {
  const setup = config.spacingSetup
  if (!setup) return ''

  const groups =
    setup.approach === 'independent'
      ? [
          { title: 'Micro', note: 'Fixed', unit: 'micro', scale: setup.tShirtScaleMicro },
          { title: 'Macro', note: 'Fluid', unit: 'macro', scale: setup.tShirtScaleMacro },
        ]
      : [{ title: 'Spacing', note: 'Follows the type scale', unit: 'unit', scale: setup.tShirtScale }]

  return groups
    .map(({ title, note, unit, scale }) => {
      const rows = Object.entries(scale).map(
        ([size, multiplier]) => `
          <li class="space-scale__row" data-token>
            ${code(`--space-${size}`)}
            <span class="space-scale__source">${unit} × ${multiplier}</span>
            <span class="space-scale__bar" style="inline-size: var(--space-${size})" data-measure="inline-size"></span>
            ${liveValue}
          </li>`,
      )

      return `
        <div class="space-scale">
          <h4 class="space-scale__title">${title} <span class="space-scale__note">${note}</span></h4>
          <ul class="space-scale__list">${rows.join('')}</ul>
        </div>`
    })
    .join('')
}

// ============================================================================
// Colors
// ============================================================================

function colorTokens(config: TrimscaleConfig) {
  const setup = config.colorSetup
  if (!setup) return ''

  const prefix = setup.baseColorTokens.prefix

  const multiplier = (label: string, value: SemanticAlias['lightnessMultiplier']) => {
    if (value === undefined) return []
    return typeof value === 'number'
      ? `${label} × ${value}`
      : `${label} × ${value.light} light, ${value.dark} dark`
  }

  const derivation = (alias: SemanticAlias) =>
    [
      code(`--${prefix}-${kebab(alias.token)}`),
      multiplier('L', alias.lightnessMultiplier),
      multiplier('C', alias.chromaMultiplier),
      alias.opacity !== undefined ? `opacity ${alias.opacity}` : [],
    ]
      .flat()
      .join(', ')

  const swatch = (name: string, detail: string) => `
    <li class="color-tokens__item">
      <span class="color-tokens__swatch" style="background-color: var(--${prefix}-${kebab(name)})"></span>
      ${code(`--${prefix}-${kebab(name)}`)}
      <span class="color-tokens__source">${detail}</span>
    </li>`

  const base = Object.entries(setup.baseColorTokens.tokens).map(([name, token]) =>
    swatch(name, `${escapeHtml(token.light.oklch)}<br />${escapeHtml(token.dark.oklch)}`),
  )
  const aliases = Object.entries(setup.semanticColorAliases ?? {}).map(([name, alias]) =>
    swatch(name, derivation(alias)),
  )

  return `
    <div class="color-tokens app-theme-container">
      <div class="color-tokens__toolbar" role="group" aria-label="Color scheme">
        <button class="color-tokens__scheme" type="button" data-scheme="" aria-pressed="true">System</button>
        <button class="color-tokens__scheme" type="button" data-scheme="light" aria-pressed="false">Light</button>
        <button class="color-tokens__scheme" type="button" data-scheme="dark" aria-pressed="false">Dark</button>
      </div>
      <h4 class="color-tokens__title">Base tokens <span class="color-tokens__note">Picked by hand, light and dark</span></h4>
      <ul class="color-tokens__list">${base.join('')}</ul>
      <h4 class="color-tokens__title">Semantic aliases <span class="color-tokens__note">Derived from a base token</span></h4>
      <ul class="color-tokens__list">${aliases.join('')}</ul>
    </div>`
}

// ============================================================================
// Plugin
// ============================================================================

const sections: Record<string, (config: TrimscaleConfig) => string> = {
  'type-scale': typeScale,
  'font-families': fontFamilies,
  'font-weights': fontWeights,
  'space-scale': spaceScale,
  'color-tokens': colorTokens,
}

// Replaces <div data-tokens="..."></div> placeholders in index.html with
// markup built from trimscale.config.ts, so the token section follows the
// config instead of a hand-copied list
export function tokenTables(config: TrimscaleConfig): Plugin {
  return {
    name: 'token-tables',
    transformIndexHtml(html) {
      return html.replace(/<div data-tokens="([\w-]+)"><\/div>/g, (_, name: string) => {
        const section = sections[name]
        if (!section) throw new Error(`Unknown token table "${name}" in index.html`)
        return section(config)
      })
    },
  }
}
