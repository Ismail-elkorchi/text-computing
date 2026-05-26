# textfacts Legacy Export Removal

## Status

Accepted alpha boundary contract.

## Purpose

`@ismail-elkorchi/textfacts` remains the deterministic single-text Unicode kernel. Historical broad subpaths exposed repository concerns and package-family behavior that now belongs elsewhere. During alpha, those subpaths are removed rather than retained as compatibility shims.

New cross-package behavior must land in the package that owns the concern.

## Removed legacy subpaths

| Legacy subpath | Status | Replacement direction |
| --- | --- | --- |
| `@ismail-elkorchi/textfacts/all` | Removed aggregate. | Use the root export or explicit kernel subpaths. |
| `@ismail-elkorchi/textfacts/compare` | Removed broad comparison surface. | Keep `textfacts` focused on Unicode/kernel facts; move corpus comparison and evidence behavior to owning repository tools or packages. |
| `@ismail-elkorchi/textfacts/pack` | Removed pack-like helper surface. | Use `@ismail-elkorchi/textpack` for resource manifests, resource loading, provenance, and lookup. |
| `@ismail-elkorchi/textfacts/protocol` | Removed protocol helper surface. | Use `@ismail-elkorchi/textprotocol` for result envelopes, payload kinds, and compatibility checks. |
| `@ismail-elkorchi/textfacts/schema` | Removed source schema registry surface. | Use package-owned schemas and repository-level `schemas/` artifacts for interop contracts. |
| `@ismail-elkorchi/textfacts/toolspec` | Removed tool descriptor surface. | Use package-owned public APIs and inspection/conformance packages for machine-readable contracts. |

## New-code rule

New production code, tests, and docs MUST NOT import or recommend the removed legacy subpaths above. The boundary check rejects reintroduced package exports, Deno exports, source directories, and import references.

## Statement boundary

This migration narrows package ownership. It does not assert broader kernel behavior.
