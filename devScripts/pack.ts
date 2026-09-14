import { execSync } from 'node:child_process'

/**
 * Packs a tarball stamped with the minute it was built, e.g.
 * `trimscale-css-1.0.0-beta.5-20260911-1412.tgz`.
 *
 * The stamp is there for the sandbox projects the package gets tested in. A
 * tarball whose filename never changes between builds can be reinstalled
 * without the sandbox picking up the new contents, and once it is installed
 * the path recorded in the sandbox's package.json says nothing about which
 * build is actually in there. A name that moves every time settles both.
 *
 * `pnpm pack` runs the `prepack` hook itself, so the TypeScript build still
 * happens; this only decides the filename. Old tarballs are left alone, they
 * are gitignored: `git clean -Xf -- "*.tgz"` clears them out.
 */

const pad = (n: number): string => String(n).padStart(2, '0')
const now = new Date()
const stamp = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}`

// `%s` and `%v` are pnpm's own placeholders for the package name and version.
execSync(`pnpm pack --out "%s-%v-${stamp}.tgz"`, { stdio: 'inherit' })
