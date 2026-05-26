# Package boundary ownership

- **Status:** Accepted
- **Date:** 2026-04-21
- **Area:** repository package boundaries

## Context

Issue `#9` requires tokenization and sentence-boundary outputs to survive the
document model and a machine-readable result envelope. The repository already
contains historical protocol/schema utilities inside `@ismail-elkorchi/textfacts`,
but new public work needs an explicit package-allocation rule before more feature
growth starts.

## Decision

- New result-envelope and repository-level protocol shapes land in
  `@ismail-elkorchi/textprotocol`.
- New machine-readable conformance report shapes land in
  `@ismail-elkorchi/textconformance`.
- New pack/resource manifest and loader contracts land in
  `@ismail-elkorchi/textpack`.
- `@ismail-elkorchi/textfacts` keeps only its single-text deterministic Unicode
  kernel utilities. Historical broad `all`, `compare`, `pack`, `protocol`,
  `schema`, and `toolspec` subpaths are removed before stable publication rather
  than kept as compatibility shims.
- Pack, protocol, schema registry, tool descriptor, corpus-comparison, and
  repository-evidence behavior belongs in the package or repository tool that
  owns that concern, not in `textfacts`.
- Workspace packages import each other through package names, not sibling source
  paths.

## Consequences

- Issue `#9` verification uses `textdoc` annotation sets wrapped by `textprotocol`
  envelopes and referenced by `textconformance` reports.
- Later work for issues `#11`, `#12`, `#10`, `#13`, and `#14` follows the same
  package boundary.
- `textrules` and later workspace packages consume sibling contracts through
  package entrypoints, which keeps workspace boundaries testable.

## Validation evidence

- `npm run -s check:fixtures`
- `npm run -s test:all`
