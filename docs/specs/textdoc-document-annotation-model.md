# textdoc document annotation model

## Why this document exists

Issue `#11` requires a public document container that downstream packages can target without
inventing incompatible annotation shapes. This document records the structural examples, invalid
reference policy, and result-envelope expectations before implementation claims depend on them.

## Structural example

The canonical structural example is
[`../../fixtures/textdoc/examples/document-annotation-model-v1.json`](../../fixtures/textdoc/examples/document-annotation-model-v1.json).
It demonstrates that one document can hold:

- token annotations;
- sentence annotations;
- POS alternatives, including a superseded analysis and its active successor;
- lemma alternatives;
- morphology alternatives;
- entity spans;
- relation annotations with role-bearing argument references;
- coreference mention and chain annotations;
- entity-link annotations with canonical or NIL resolution; and
- corpus-feature annotations.

The extension structural example is
[`../../fixtures/textdoc/examples/document-extension-model-v1.json`](../../fixtures/textdoc/examples/document-extension-model-v1.json).
It demonstrates how package-specific annotation payloads are carried as `kind: "extension"` without
adding a new hardcoded core annotation kind.

## Core versus extension policy

A new annotation kind belongs in `textdoc` core only when the repository can define stable
cross-package semantics and runtime/schema validation for that kind. Task-specific, domain-specific,
or producer-specific payloads belong in `kind: "extension"` annotations with a URI-like
`extensionId`, optional package schema metadata, declared targets, lifecycle, provenance,
confidence, loss markers, ambiguity-set references, and external document references.

## Invalid-reference policy

The document model rejects:

- layer `viewId` values that do not resolve to a declared view id;
- view lineage references that do not resolve to an existing earlier view;
- annotation targets of kind `annotation` that do not resolve to an annotation id in the same
  document;
- relation arguments that do not resolve to annotations targeted by the relation;
- coreference chains that reference missing mentions or omit declared mentions from their targets;
- entity links that target non-entity annotations or declare neither/both canonical and NIL
  resolution;
- dependency graphs with dangling nodes, cross-sentence heads, duplicate dependent arcs, or cycles;
- span targets whose offsets fall outside `textLengthCU`;
- overlapping active span annotations inside a layer unless that layer declares
  `allowSpanOverlap: true`; and
- supersession graphs that do not resolve bidirectionally between the older annotation and its
  active replacement.

Deterministic ordering is preserved by the serialized array order for `views`, `layers`, and
`annotations`, and by explicit ascending `rank` values for annotation alternatives.

Negative controls for those failures live under
[`../../fixtures/textdoc/invalid/`](../../fixtures/textdoc/invalid/).
The extension-id negative control proves that extension annotations require a declared scheme-like
identifier instead of an unscoped label.

## Stand-off annotation round trip

The package-level annotation-bundle API exports annotations as stand-off records with document id,
revision, layer id, annotation id, representative target, and full annotation payload. The import
path applies those records to an existing document skeleton and rejects duplicate ids, layer/kind
mismatches, document or revision mismatch, and representative-target drift.

The committed protocol envelope
[`../../fixtures/textdoc/roundtrip/document-annotation-model-annotation-bundle.v1.json`](../../fixtures/textdoc/roundtrip/document-annotation-model-annotation-bundle.v1.json)
is generated from the structural example and validated against
[`../../schemas/textprotocol-annotation-bundle-v1.schema.json`](../../schemas/textprotocol-annotation-bundle-v1.schema.json).
It is ecosystem-style interchange evidence for the committed fixture only; it is not an external
document-model external result.

## Result-envelope requirements

Any `textdoc` document emitted as a repository-level result must be serializable as:

- a `textdoc` payload validated by
  [`../../schemas/textdoc-document-v1.schema.json`](../../schemas/textdoc-document-v1.schema.json);
- a `textprotocol` result envelope validated by
  [`../../schemas/textprotocol-result-envelope-v1.schema.json`](../../schemas/textprotocol-result-envelope-v1.schema.json);
  and
- a `textconformance` report validated by
  [`../../schemas/textconformance-report-v1.schema.json`](../../schemas/textconformance-report-v1.schema.json).

## Verification

`npm run -s check:fixtures` validates the structural example, negative controls, lifecycle rules,
deterministic ordering expectations, result-envelope/conformance compatibility, and the stand-off
annotation-bundle round trip.
