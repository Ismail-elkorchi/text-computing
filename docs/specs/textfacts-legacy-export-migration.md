# textfacts Legacy Export Migration

## Status

Draft public boundary contract.

## Purpose

`@ismail-elkorchi/textfacts` remains the deterministic single-text Unicode kernel. Some historical public subpaths expose broader repository concerns. Those subpaths stay available for compatibility, but they are frozen for new production use.

New cross-package behavior must land in the package that owns the concern.

## Frozen legacy subpaths

| Legacy subpath | Status | Replacement direction |
| --- | --- | --- |
| `@ismail-elkorchi/textfacts/all` | Frozen compatibility aggregate. | Use explicit package entrypoints instead of a broad aggregate import. |
| `@ismail-elkorchi/textfacts/compare` | Frozen compatibility surface for historical comparison helpers. | Keep single-text comparison primitives under `textfacts`; move corpus/replay/evidence comparison behavior to owning packages or repository tools. |
| `@ismail-elkorchi/textfacts/pack` | Frozen compatibility surface for historical pack helpers. | Use `@ismail-elkorchi/textpack` for resource manifests, resource loading, provenance, and lookup. |
| `@ismail-elkorchi/textfacts/protocol` | Frozen compatibility surface for historical protocol helpers. | Use `@ismail-elkorchi/textprotocol` for result envelopes, payload kinds, and compatibility checks. |
| `@ismail-elkorchi/textfacts/schema` | Frozen compatibility surface for historical repository schema helpers. | Use package-owned schemas and repository-level `schemas/` artifacts for interop contracts. |
| `@ismail-elkorchi/textfacts/toolspec` | Frozen compatibility surface for historical tool descriptors. | Use `@ismail-elkorchi/textprotocol` for machine-readable payload contracts and `@ismail-elkorchi/textlab` for inspection behavior. |

## New-code rule

New production code MUST NOT import the frozen legacy subpaths above. The boundary check scans production code for those imports. Explicit compatibility tests and historical documentation may still reference them.

## Compatibility rule

This document does not remove exports. Any future removal requires a separate compatibility decision, public migration notice, and version-policy review.

## Claim boundary

This migration narrows package ownership. It does not change the current published behavior of `@ismail-elkorchi/textfacts` and does not upgrade any support status.
