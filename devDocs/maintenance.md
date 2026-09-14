# Maintenance Notes

Files that don't auto-update and need a manual pass whenever something else changes.

## README.md

Duplicates facts that live elsewhere: the standalone CSS filenames, the `pkg:`
public surface, the output-size figures, the cascade layer order, the package
structure tree. None of it is generated, and nothing errors when it drifts. Four
of the seven contradictions found in the beta.5 docs pass were here, all of them
a copy that stopped matching its source. Re-read it whenever an output filename,
the `exports` field, the layer order, or a measured figure changes.

## docs/full-config-reference.md

Hand-maintained index of every `trimscale.config.ts` property, not generated from [`models/Config.ts`](../models/Config.ts). Update it whenever a field is added, renamed, or removed from `TrimscaleConfig` or any of its nested types, it won't error on drift, it'll just go silently out of sync with the real config shape.
