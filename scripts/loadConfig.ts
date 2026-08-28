import path from 'node:path'
import { pathToFileURL } from 'node:url'
import type { TrimscaleConfig } from '../models/Config.ts'

/**
 * Loads `trimscale.config.ts` from the current working directory (the
 * consumer's own project root when this package is published and run via
 * `npx trimscale-css generate`), not from this package's own install
 * location. Must be a dynamic, cwd-based import: a static relative import
 * (`import cfg from '../trimscale.config.ts'`) resolves against *this
 * file's* location, which once published lives inside the consumer's
 * `node_modules/trimscale-css/scripts/` — that would always load the
 * package's own template config, never the consumer's.
 * @returns The consumer's (or, in dev, this repo's own) config.
 */
export const loadConfig = async (): Promise<TrimscaleConfig> => {
  const configPath = path.join(process.cwd(), 'trimscale.config.ts')

  try {
    const mod = await import(pathToFileURL(configPath).href)
    return mod.default as TrimscaleConfig
  } catch (err) {
    throw new Error(
      `Could not load trimscale.config.ts from ${configPath}. Run \`npx trimscale-css init\` first if you haven't yet.`,
      { cause: err },
    )
  }
}
