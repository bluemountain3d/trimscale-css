# Roadmap

Planned or in-progress work that isn't reflected in the shipped package yet. Kept out of `docs/` since none of it is usable by consumers today, see [devDocs vs docs](../README.md#development).

## Native CSS `@function` port

Sass functions are being ported to native CSS `@function` rules in parallel with the existing Sass implementations, starting with `dynamic-line-height`, so the native version can later replace the Sass one as a drop-in without redesigning the math, once browser support for `@function` is broad enough. The `functions` cascade layer in `styles/_layer.scss` is reserved for this.

Not yet committed to the repo, currently maintained outside it and reviewed ad hoc.
