import fs from 'node:fs'
import path from 'node:path'

/**
 * Removes emitted JavaScript before `tsc` runs, so output for a source file
 * that no longer exists cannot survive a rename or a file split. `tsc` only
 * writes, it never deletes, and package.json's `files` ships `scripts/*.js`
 * and all of `models/`, so a leftover `.js` reaches the tarball.
 *
 * The directory list mirrors the emitted paths in .gitignore. `models/` is
 * cleaned even though tsconfig.build.json no longer emits there, so output
 * left over from an earlier build layout goes away too.
 *
 * Runs as the first half of `pnpm build`, which `prepack` calls in turn.
 */

const emittedDirs = ['bin', 'scripts', 'models']

for (const dir of emittedDirs) {
  if (!fs.existsSync(dir)) continue

  for (const entry of fs.readdirSync(dir)) {
    if (entry.endsWith('.js')) fs.rmSync(path.join(dir, entry))
  }
}
