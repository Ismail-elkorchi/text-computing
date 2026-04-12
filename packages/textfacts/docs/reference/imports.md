# Imports And Footprint

This repo keeps the root entrypoint small to avoid accidental bundle growth and to make imports intentional.

## Canonical Import Patterns
- **Minimal core (root):**
  - `import { sliceBySpan, createProvenance } from "textfacts";`
  - Root exports: core, integrity, JCS, hashing.
- **Compare (diff + fingerprints):**
  - `import { diffText, winnowingFingerprints } from "@ismail-elkorchi/textfacts/compare";`
- **IDNA (UTS #46):**
  - `import { uts46ToAscii } from "@ismail-elkorchi/textfacts/idna";`
- **Security (confusables + scripts):**
  - `import { confusableSkeleton } from "@ismail-elkorchi/textfacts/security";`
- **Everything:**
  - `import * as textfacts from "@ismail-elkorchi/textfacts/all";`

## Why The Root Is Small
Some bundlers do not reliably drop unused exports when a root entrypoint re-exports many modules.
Bundling rationale references are maintained in `docs/sources-docs.md` under **Footprint + Bundling** (external sources; local snapshots are not vendored in this repo).

## Footprint Policy
- Root exports only minimal primitives (core types, hashing, integrity, JCS).
- Heavy modules live behind explicit subpath entrypoints or `@ismail-elkorchi/textfacts/all`.
- Size budget history is not retained in this repository.
