#!/usr/bin/env node
import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'

const projectRoot = process.cwd()
const command = process.argv[2] ?? 'init'

/**
 * Whether `package.json` declares CommonJS outright, which decides the config
 * file's extension. Three states behave differently: `"type": "module"` and a
 * missing `type` both load a `.ts` config as an ES module (the second by
 * Node's module detection, which costs a MODULE_TYPELESS_PACKAGE_JSON
 * warning), while an explicit `"type": "commonjs"` settles the format and
 * skips detection, so `export default` in the config is a syntax error there.
 * `npm init -y` writes that third state, so it isn't hypothetical.
 */
const declaresCommonJs = (pkgPath: string): boolean => {
  try {
    return JSON.parse(fs.readFileSync(pkgPath, 'utf8')).type === 'commonjs'
  } catch {
    // No package.json, or one that won't parse. Neither declares CommonJS,
    // and the missing-package.json case is warned about further down anyway.
    return false
  }
}

/**
 * Copies the package's consumer-facing `templates/trimscale.config.ts` into
 * the consumer's project root (unless one already exists there) and wires up
 * a `trimscale:generate` npm script pointing at the `generate` subcommand
 * below. This template is distinct from the repo's own `trimscale.config.ts`
 * (used for dogfooding against `fixtures/`), it has no file-path assumptions
 * of its own so it works unmodified in a fresh project.
 */
const runInit = () => {
  const pkgPath = path.join(projectRoot, 'package.json')
  const isCommonJs = declaresCommonJs(pkgPath)
  const configFileName = `trimscale.config.${isCommonJs ? 'mts' : 'ts'}`
  const existing = ['trimscale.config.ts', 'trimscale.config.mts'].find((name) =>
    fs.existsSync(path.join(projectRoot, name)),
  )

  if (existing) {
    console.log(`⚠️  ${existing} already exists, leaving it untouched.`)

    // Untouched, but unusable: a `.ts` config predates the `"type"` this
    // package.json declares (or was copied in from a project without it), and
    // `generate` is the first thing that will say so. Saying it here costs a
    // rename instead of a failed run.
    if (isCommonJs && existing === 'trimscale.config.ts') {
      console.warn(
        `⚠️  ...but this package.json declares "type": "commonjs", so \`generate\` can't load it: Node reads a \`.ts\` config as CommonJS, where the config's own \`export default\` is a syntax error. Rename it to trimscale.config.mts, which is an ES module whatever the project's type is. \`generate\` accepts either name.`,
      )
    }
  } else {
    const configTemplate = path.join(import.meta.dirname, '..', 'templates', 'trimscale.config.ts')
    fs.copyFileSync(configTemplate, path.join(projectRoot, configFileName))
    console.log(`✅ Created ${configFileName}.`)

    if (configFileName.endsWith('.mts')) {
      console.log(
        '   (`.mts` because this package.json declares "type": "commonjs". Node would read a `.ts` config as CommonJS, where the config\'s `export default` is a syntax error. `.mts` is an ES module whatever the project\'s type is, and nothing else about your project changes.)',
      )
    }
  }

  // The config is the actual deliverable and is written either way: `generate`
  // reads it from the working directory and never touches package.json, so a
  // project that isn't npm-shaped (or isn't yet) still gets a working setup.
  // Only the convenience script needs a package.json.
  if (!fs.existsSync(pkgPath)) {
    console.warn(
      '⚠️  No package.json in this folder, so the "trimscale:generate" script was not added. Run `npx trimscale-css generate` directly, or add the script yourself once there is one.',
    )
  } else {
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
  }

  // `existing` first: `configFileName` is the name this run *would* have
  // picked, which is the file on disk only when nothing was there already. A
  // config left untouched keeps whichever of the two names it came with, and
  // that is the file to point at.
  console.log(
    `📁 \`generate\` writes to ./trimscale-generated/ by default (set output.dir in ${existing ?? configFileName} to change it). Commit it like any other source file, or gitignore it (along with .trimscale-cache/) and run \`generate\` in CI, your choice.`,
  )
  const installedDocs = path.join(projectRoot, 'node_modules', 'trimscale-css', 'docs', 'getting-started.md')

  // The short path is the useful one when the package is a dependency, which
  // is the documented flow. Run straight from npx in a folder with no
  // package.json, which `init` deliberately supports, there is no
  // node_modules to point at, so fall back to where this file actually sits.
  console.log(
    `📖 Docs: ${
      fs.existsSync(installedDocs)
        ? path.relative(projectRoot, installedDocs)
        : path.join(import.meta.dirname, '..', 'docs', 'getting-started.md')
    }`,
  )
}

/**
 * Prints a failed `generate` as the message it was written to be. Everything
 * that stops `generate` throws a sentence aimed at the person who ran it (a
 * config field that moved, a font family with no `path`, no Sass compiler for
 * `output.css`), and letting that reach the top level uncaught buries it in a
 * Node stack trace, under an unhandled-rejection banner, under whatever
 * "command failed" line the package manager adds. The message is the part
 * that matters; the stack is about this package's internals, not the
 * consumer's config.
 *
 * The `cause` chain is unwrapped because `loadConfig` uses it to carry why a
 * config file wouldn't load, which is where a syntax error's real message
 * lives.
 */
const reportFailure = (error: unknown): void => {
  console.error(`❌ ${error instanceof Error ? error.message : String(error)}`)

  let cause: unknown = error instanceof Error ? error.cause : undefined
  while (cause instanceof Error) {
    console.error(`   Caused by: ${cause.message}`)
    cause = cause.cause
  }

  if (process.env.TRIMSCALE_DEBUG) console.error(error)
  else console.error('   Set TRIMSCALE_DEBUG=1 for the full stack trace.')
}

/**
 * Runs the package's token generators against the consumer's own
 * `trimscale.config.ts` (read from `process.cwd()` by `scripts/loadConfig.ts`,
 * not this package's own template).
 */
const runGenerate = async () => {
  try {
    await import('../scripts/generateAll.ts')
  } catch (error) {
    reportFailure(error)
    process.exit(1)
  }
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
