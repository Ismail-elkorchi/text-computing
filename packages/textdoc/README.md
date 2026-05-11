# `@ismail-elkorchi/textdoc`

Document annotation container package.

## Document annotation model

The public contract now includes a repository-level document schema,
[`../../schemas/textdoc-document-v1.schema.json`](../../schemas/textdoc-document-v1.schema.json),
for deterministic annotation containers with:

- document ids, revisions, and UTF-16 text offsets;
- source and analysis views with explicit lineage;
- stable layer ids for token, sentence, POS, lemma, morphology, entity, corpus-feature, dependency-node, and dependency layers;
- span, document, and annotation-reference targets;
- lifecycle state for active, superseded, and retracted annotations;
- provenance links and ordered alternatives.

The package does not perform tokenization, tagging, or entity extraction. It defines the container
shape that other packages serialize through `@ismail-elkorchi/textprotocol`.

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
