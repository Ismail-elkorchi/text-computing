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
- entity spans; and
- corpus-feature annotations.

## Invalid-reference policy

The document model rejects:

- layer `viewId` values that do not resolve to a declared view id;
- view lineage references that do not resolve to an existing earlier view;
- annotation targets of kind `annotation` that do not resolve to an annotation id in the same
  document;
- span targets whose offsets fall outside `textLengthCU`;
- overlapping active span annotations inside a layer unless that layer declares
  `allowSpanOverlap: true`; and
- supersession graphs that do not resolve bidirectionally between the older annotation and its
  active replacement.

Deterministic ordering is preserved by the serialized array order for `views`, `layers`, and
`annotations`, and by explicit ascending `rank` values for annotation alternatives.

Negative controls for those failures live under
[`../../fixtures/textdoc/invalid/`](../../fixtures/textdoc/invalid/).

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
deterministic ordering expectations, and the result-envelope/conformance round trip.
