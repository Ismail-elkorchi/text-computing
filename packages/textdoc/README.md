# `@ismail-elkorchi/textdoc`

Document annotation container package.

## Raw text document creation

`createTextDocDocumentFromText()` and `createTextDocDocumentFromTextSync()` create a
`TextDocDocumentV1` from a raw JavaScript string using `@ismail-elkorchi/textfacts` UAX #29 word and
sentence segmentation. The produced document preserves UTF-16 offsets, source text by default,
Unicode version metadata, token and sentence layers, and source provenance.

Use the async helper when a runtime SHA-256 source digest is required. The sync helper accepts a
caller-provided `sourceSha256` and otherwise leaves the digest absent. Both helpers return
diagnostics for malformed UTF-16 such as lone surrogates.

Batch helpers are also available:

- `createTextDocDocumentsFromTexts`
- `createTextDocDocumentsFromTextsSync`

## Document annotation model

The public contract now includes a repository-level document schema,
[`../../schemas/textdoc-document-v1.schema.json`](../../schemas/textdoc-document-v1.schema.json),
for deterministic annotation containers with:

- document ids, revisions, and UTF-16 text offsets;
- raw, normalized, tailored, task, imported, and extension views with explicit parent lineage;
- span-map records for view-to-view offset mapping, lifecycle, and loss accounting;
- stable layer ids for token, sentence, POS, lemma, morphology, entity, corpus-feature, dependency-node, dependency, and extension layers;
- span, document, and annotation-reference targets;
- lifecycle state for active, superseded, and retracted annotations;
- provenance links and ordered alternatives.

The package does not perform tokenization, tagging, or entity extraction. It defines the container
shape that other packages serialize through `@ismail-elkorchi/textprotocol`.

Use `validateTextDocDocumentV1()` after runtime shape validation when reference integrity matters.
The validator checks view parents, span maps, layer references, duplicate ids, span ranges, target
view ids, annotation targets, lifecycle links, relation arguments, coreference chains, dependency
node links, dependency self-loops, dependency sentence consistency, ambiguity-set consistency, loss
provenance, and reference-kind integrity.

`exportTextDocAnnotationBundlePayloadV1()` exports a document's annotations as deterministic
stand-off records keyed by document id, revision, layer id, annotation id, representative target, and
the full annotation object. `applyTextDocAnnotationBundlePayloadV1()` restores those records onto an
existing document skeleton and rejects duplicate annotation ids, layer/kind mismatches, document or
revision mismatch, and representative-target drift.

`exportTextDocDocumentBundlePayloadV1()` exports one or more validated `TextDocDocumentV1` records
as the payload shape used by the `textprotocol` document-bundle schema family.
`importTextDocDocumentBundlePayloadV1()` imports that payload shape back into validated textdoc
documents and rejects empty payloads, malformed document entries, invalid documents, and duplicate
document revisions. The helpers do not add a `textprotocol` dependency to `textdoc`; applications can
wrap the payload with `textprotocol` transport helpers when exchange envelopes are needed.

`exportTextDocMappingLossReportPayloadV1()` exports view, span-map, span-map segment, and annotation
loss markers as the payload shape used by the `textprotocol` mapping-loss-report schema family.
`isTextDocMappingLossReportPayloadV1()` validates the payload shape without adding a `textprotocol`
dependency to this package.

## Extension annotations

Core annotation kinds are reserved for cross-package semantics that this package can validate without
knowing a producer-specific task. Package-specific or domain-specific annotation payloads use
`kind: "extension"` with:

- a URI-like `extensionId`;
- optional `extensionSchema` metadata naming the package-specific schema;
- declared span, document, or annotation targets; and
- the same lifecycle, provenance, confidence, loss, ambiguity-set, and external-document reference
  fields as core annotations.

A new annotation kind belongs in `textdoc` core only when multiple packages need the same stable
interchange semantics and `textdoc` can validate the required invariants. Otherwise it belongs in a
package-specific schema carried by an extension annotation.

## CoNLL-U round-trip

The package exposes fixture-scope CoNLL-U import/export helpers:

- `importConlluToTextDocDocumentV1`
- `exportTextDocDocumentV1ToConllu`
- `TextDocConlluError`

These helpers preserve the frozen repository-authored CoNLL-U fixture rows and dependency arcs. They
do not implement dependency parsing or broad Universal Dependencies treebank support.

## Token and sentence compatibility

[`toTextDocDocumentV1`](./src/index.ts) converts the earlier token/sentence annotation set into the
document model without widening `@ismail-elkorchi/textfacts`.

## Runnable examples

- [`../../examples/textdoc-document-bundle-consumer.mjs`](../../examples/textdoc-document-bundle-consumer.mjs)
  exports textdoc documents as a document-bundle payload, wraps the payload in textprotocol
  schema-family JSON transport, and imports the payload back through textdoc.
- [`../../examples/textdoc-annotation-bundle-consumer.mjs`](../../examples/textdoc-annotation-bundle-consumer.mjs)
  exports textdoc annotations as an annotation-bundle payload, wraps the payload in textprotocol
  schema-family JSON transport, and applies the parsed payload back onto a document skeleton.
- [`../../examples/textdoc-mapping-loss-report-consumer.mjs`](../../examples/textdoc-mapping-loss-report-consumer.mjs)
  exports textdoc loss markers as a mapping-loss-report payload, wraps the payload in textprotocol
  schema-family JSON transport, and inspects the parsed envelope through textlab.
