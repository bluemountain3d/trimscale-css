import * as crypto from 'node:crypto'
import * as fs from 'node:fs'
import path from 'node:path'

const cacheDir = path.join(process.cwd(), '.trimscale-cache/fonts')

/** Reads a local font file's raw bytes. `filePath` is expected already resolved to an absolute path. */
export const readLocalFont = (filePath: string): Promise<Buffer> => fs.promises.readFile(filePath)

/** File extension (no dot) for a local path or a remote URL, used as the `format(...)` hint in `@font-face`. */
export const getFontExtension = (source: string): string => {
  const pathname = source.startsWith('http') ? new URL(source).pathname : source
  return pathname.substring(pathname.lastIndexOf('.') + 1)
}

/**
 * Fetches a font file's raw bytes over HTTP, caching the result under
 * `.trimscale-cache/fonts/` (gitignored) keyed by a hash of the URL so
 * repeat `generate` runs don't re-fetch it. The cache is never committed or
 * published, it's purely a local build-time optimization, so it doesn't
 * raise the redistribution/licensing questions a checked-in copy would.
 * @param url - Direct URL to the font file (not a CSS-generating endpoint)
 * @returns The font file's raw bytes
 */
export const fetchRemoteFont = async (url: string): Promise<Buffer> => {
  const hash = crypto.createHash('sha256').update(url).digest('hex')
  const cachePath = path.join(cacheDir, `${hash}.${getFontExtension(url)}`)

  if (fs.existsSync(cachePath)) {
    return fs.promises.readFile(cachePath)
  }

  const res = await fetch(url)

  if (!res.ok) {
    throw new Error(`Failed to fetch font from ${url}: ${res.status} ${res.statusText}`)
  }

  const buffer = Buffer.from(await res.arrayBuffer())

  fs.mkdirSync(cacheDir, { recursive: true })
  fs.writeFileSync(cachePath, buffer)

  return buffer
}
