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
- `@ismail-elkorchi/textfacts` may keep its existing single-text utilities, but
  new public repository-level envelope, resource, or conformance responsibilities
  do not expand there.

## Consequences

- Issue `#9` proof uses `textdoc` annotation sets wrapped by `textprotocol`
  envelopes and referenced by `textconformance` reports.
- Later work for issues `#11`, `#12`, `#10`, `#13`, and `#14` follows the same
  package boundary.

## Validation evidence

- `npm run -s check:fixtures`
- `npm run -s test:all`
