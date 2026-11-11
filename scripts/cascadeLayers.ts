import { raw, type ScssTree } from './helpers.ts'

/** The project's own layers when `output.cascadeLayers` is left out. Mirrors the `!default` in `abstracts/variables/_output.scss`. */
export const DEFAULT_CASCADE_LAYERS = ['layouts', 'components']

/** Every layer `_layer.scss` declares itself, around the configurable window. */
const PACKAGE_LAYERS = ['reset', 'tokens', 'functions', 'trim-defaults', 'base', 'trim', 'utilities']

/** A plain CSS identifier. Dotted sub-layer names are left out: declare those in your own CSS, inside a layer from this list. */
const LAYER_NAME = /^[a-zA-Z_][a-zA-Z0-9_-]*$/

/**
 * Builds the `$cascade-layers` list from `output.cascadeLayers`, failing on
 * a name that isn't a CSS identifier, one the package declares itself, or
 * one listed twice. `_layer.scss` checks the last two as well, for a project
 * that configures the SCSS directly, but the messages here can name the
 * config field.
 *
 * Names are emitted unquoted and as written, not through `toKebabCase`:
 * they are values the project chooses, and the layer has to be called
 * exactly what its own `@layer` blocks say.
 */
export const cascadeLayersTree = (layers: string[] | undefined): ScssTree => {
  const list = layers ?? DEFAULT_CASCADE_LAYERS
  const seen = new Set<string>()

  for (const name of list) {
    if (!LAYER_NAME.test(name)) {
      throw new Error(
        `\`output.cascadeLayers\` contains "${name}", which isn't a valid layer name. Use letters, digits, hyphens and underscores, starting with a letter or underscore.`,
      )
    }
    if (PACKAGE_LAYERS.includes(name)) {
      throw new Error(
        `\`output.cascadeLayers\` contains "${name}", a layer the package declares itself. A second declaration would leave it where the package put it, not where your list says. Pick another name.`,
      )
    }
    if (seen.has(name)) {
      throw new Error(
        `\`output.cascadeLayers\` lists "${name}" twice. A layer's position is set by its first mention, so remove one of them.`,
      )
    }
    seen.add(name)
  }

  return list.map((name) => raw(name))
}
