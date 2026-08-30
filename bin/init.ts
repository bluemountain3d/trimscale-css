#!/usr/bin/env node
import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'

const projectRoot = process.cwd()
const command = process.argv[2] ?? 'init'

/**
 * Copies the package's `trimscale.config.ts` template into the consumer's
 * project root (unless one already exists there) and wires up a
 * `trimscale:generate` npm script pointing at the `generate` subcommand below.
 */
const runInit = () => {
  const configFileName = 'trimscale.config.ts'
  const configDest = path.join(projectRoot, configFileName)

  if (fs.existsSync(configDest)) {
    console.log(`⚠️  ${configFileName} already exists, leaving it untouched.`)
  } else {
    const configTemplate = path.join(import.meta.dirname, '..', configFileName)
    // The template's own `import type { TrimscaleConfig } from './models/Config.ts'`
    // is relative to this repo, correct for dogfooding, but once copied to the
    // consumer's project root, that relative path no longer resolves (models/
    // lives inside node_modules/trimscale-css/, not the consumer's own root).
    // Repoint it at the package specifier before writing the copy.
    const templateContent = fs
      .readFileSync(configTemplate, 'utf8')
      .replace("from './models/Config.ts'", "from 'trimscale-css/models/Config.ts'")
    fs.writeFileSync(configDest, templateContent, 'utf8')
    console.log(`✅ Created ${configFileName}.`)
  }

  const pkgPath = path.join(projectRoot, 'package.json')

  if (!fs.existsSync(pkgPath)) {
    console.warn('❌ Could not find a package.json in this folder.')
    return
  }

  try {
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'))

    if (!pkg.scripts) pkg.scripts = {}

    if (!pkg.scripts['trimscale:generate']) {
      pkg.scripts['trimscale:generate'] = 'trimscale-css generate'
      fs.writeFileSync(pkgPath, `${JSON.stringify(pkg, null, 2)}\n`, 'utf8')
      console.log('✅ Added the "trimscale:generate" script to package.json.')
    } else {
      console.log('⚠️  The "trimscale:generate" script already existed.')
    }
  } catch (error) {
    console.error('❌ Something went wrong:', (error as Error).message)
  }

  console.log(
    '📁 `generate` writes to ./trimscale-generated/ by default (set outDir in trimscale.config.ts to change it). Commit it like any other source file, or gitignore it (along with .trimscale-cache/) and run `generate` in CI, your choice.',
  )
  console.log('📖 Docs: node_modules/trimscale-css/docs/getting-started.md')
}

/**
 * Runs the package's token generators against the consumer's own
 * `trimscale.config.ts` (read from `process.cwd()` by `scripts/loadConfig.ts`,
 * not this package's own template).
 */
const runGenerate = async () => {
  await import('../scripts/generateAll.ts')
}

switch (command) {
  case 'init':
    runInit()
    break
  case 'generate':
    await runGenerate()
    break
  default:
    console.error(`❌ Unknown command "${command}". Use "init" or "generate".`)
    process.exit(1)
}
