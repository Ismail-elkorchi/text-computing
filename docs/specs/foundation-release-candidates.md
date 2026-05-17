# Foundation release candidates

This document defines the non-publishing release-candidate gate for the foundational private packages:
`@ismail-elkorchi/textprotocol`, `@ismail-elkorchi/textconformance`, `@ismail-elkorchi/textdoc`, and
`@ismail-elkorchi/textpack`.

## Boundary

Release-candidate work is not package publication. These packages remain private until their release blockers are
removed by evidence, their built package APIs are exercised by downstream dependents, and package release gates are
updated.

## Gate order

The foundational package gate must pass before dependent packages move toward release:

1. `textprotocol` and `textconformance` — interchange and report contracts.
2. `textdoc` — document and annotation container contracts.
3. `textpack` — resource manifest, loading, and registry contracts.
4. Dependent packages — `textpipeline`, `textcorpus`, `textrules`, and `textlab`.

## Verification

The canonical machine-readable gate is
`fixtures/package-release/foundation-release-candidates.v1.json` and its schema is
`schemas/foundation-release-candidates-v1.schema.json`.

The validator checks that:

- the package set is exactly the four foundational packages;
- each package is still `private-unreleased` and `private:true`;
- release blockers remain explicit;
- package, test, schema, fixture, and gate evidence references exist;
- downstream dependents are declared without changing support claims.

Run:

```sh
node tools/validate-foundation-release-candidates.mjs
```
