# Dependencies

trimscale-css installs one runtime dependency, `fontkit`, plus its type
definitions. Everything else in `package.json` is a devDependency and stops
at this repo.

fontkit is the most widely used font parser for Node, behind projects such
as react-pdf, at roughly 9.6 million downloads a week as of September 2026.
It brings twelve packages of its own. Supply-chain scanners flag
several of them, so this page covers what they are, why they are there, and
how to check every claim below yourself.

---

## What installs

```
fontkit
├── clone, fast-deep-equal, restructure, dfa, tiny-inflate
├── @swc/helpers → tslib
├── brotli → base64-js
└── unicode-properties → base64-js, dfa, unicode-trie → pako, tiny-inflate
```

Thirteen packages carry code. None of them has a `preinstall`, `install`,
`postinstall`, or `prepare` script, so `npm install trimscale-css` executes
no code.

Three more arrive as TypeScript declarations and contain nothing
executable: `@types/fontkit`, `@types/node`, and `undici-types`.

## Why fontkit

Leading trim needs your font's ascender, descender, and cap height. Metric-
matched fallbacks need an average character width derived from the `hmtx`
table. Those values live inside the font binary, and reading them is what
fontkit does. See [why-scss.md](why-scss.md#2-build-time-font-data) for why
this has to happen at build time.

fontkit also decodes WOFF2 and instances variable fonts at a given weight,
both of which trimscale-css relies on. WOFF2 is the reason `brotli` is in
the tree: the format is brotli-compressed.

## Where it runs

Only during `trimscale-css generate`, on your machine, against the font
files your config points at. The output is SCSS and CSS.

No part of this tree is bundled into your application, and none of it
reaches a browser. trimscale-css has no runtime.

---

## What scanners flag

**Uses eval.** One occurrence exists in the whole tree, in
`brotli/build/encode.js`, which is Emscripten-compiled asm.js for the
brotli *compressor*. That file is reachable through `brotli/index.js` and
`brotli/compress.js`. fontkit imports `brotli/decompress.js` directly, which
resolves to `brotli/dec/decode`. The compressor is never loaded.

**Obfuscated code, minified code.** `brotli/build/encode.js` and
`brotli/build/mem.js`, the same two compiler-generated files. Emscripten
output reads like obfuscation to a heuristic because both are machine-
generated and unformatted. Neither is hand-obscured, and neither is on a
code path trimscale-css uses.

**Filesystem access.** fontkit and brotli. fontkit reads the font file you
name, plus three `.trie` data tables it ships for Arabic, Indic, and
Universal shaping. brotli's is in the unused compressor.

**Unmaintained.** Accurate. Six of these packages are small, finished, and
untouched for years: a deflate implementation, a deep-clone helper, a DFA
matcher, a Unicode trie reader. They do one thing and that thing does not
change.

## Checking this yourself

Print the runtime tree, with no dev dependencies:

```bash
npm ls --omit=dev --all
```

With pnpm, whose layout nests packages under `node_modules/.pnpm/`:

```bash
pnpm ls --prod --depth Infinity
```

Find every file in brotli that evaluates code at runtime. The one result is
`build/encode.js`, the compressor:

```bash
find node_modules -type d -name brotli -exec grep -rln "eval(\|new Function(" {} \;
```

Confirm nothing runs on install, by installing with scripts disabled and
seeing an identical result:

```bash
npm install trimscale-css --ignore-scripts
```

## Avoiding fontkit entirely

Two configurations never hand a font file to fontkit:

- Set font metrics to `manual` and supply the values yourself. fontkit stays
  installed but opens nothing.
- Skip the CLI and consume a generated `output.css`. Generation happens once,
  wherever you choose to run it.
