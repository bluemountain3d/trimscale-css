# Maintenance Notes

Files that don't auto-update and need a manual pass whenever something else changes.

## docs/full-config-reference.md

Hand-maintained index of every `trimscale.config.ts` property, not generated from [`models/Config.ts`](../models/Config.ts). Update it whenever a field is added, renamed, or removed from `TrimscaleConfig` or any of its nested types, it won't error on drift, it'll just go silently out of sync with the real config shape.
