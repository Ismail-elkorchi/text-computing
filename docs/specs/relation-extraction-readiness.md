# Relation extraction readiness

## Why this document exists

Relation extraction can be confused with cooccurrence, entity linking, event extraction, or learned
classification. This readiness gate records the typed relation surface before any behavior is added.

## Status

- Task id: `nlp-relation-extraction`
- Status: `readiness-only`
- Owning packages: `textrules`, `textdoc`, `textconformance`
- Current proof: public schemas, readiness fixtures, negative controls, and conformance report exist
- Current non-proof: no relation extraction runtime behavior exists

## Target representation

The target representation is:

- `textdoc-document-v1` for span-backed arguments and evidence spans;
- `relation-extraction-expected-v1` for frozen expected outputs in a later feature gate;
- `textprotocol-result-envelope-v1` for serialized outputs; and
- `textconformance-report-v1` for machine-readable verification references.

## Relation label policy

The readiness label set is intentionally narrow:

- `employed-by`;
- `located-in`;
- `part-of`;
- `no-relation`.

The `no-relation` label is a negative-control label. It prevents the fixture set from rewarding
cooccurrence-only extraction.

## Evidence-span policy

Every positive relation must identify:

- at least two span-backed arguments;
- role names for each argument;
- one or more evidence spans; and
- diagnostics when a relation is negated, ambiguous, or outside the current label policy.

## Allowed fixture policy

Only repository-authored short texts are used in the current readiness gate. Broader corpora require
license, provenance, redistribution, and comparator-output decisions before they enter required checks.

## Input slices

The canonical readiness slices live in
[`../../fixtures/relation-extraction/slices.json`](../../fixtures/relation-extraction/slices.json).

They cover:

- intra-sentence relation cues;
- cross-sentence evidence;
- appositive and prepositional cues;
- cooccurrence controls;
- negated relation controls;
- a non-English Latin-script slice; and
- a right-to-left non-Latin-script slice.

## Comparator and corpus freeze

This gate records comparator capability only. It does not commit executed comparator outputs.

Future feature work must freeze comparator versions and corpus slices before behavior is added. Candidate
comparators include mature NLP systems with relation or information-extraction surfaces, but their outputs
are diagnostic evidence and do not define repository semantics.

## Expected-output format

Future expected outputs must validate against
[`../../schemas/relation-extraction-expected-v1.schema.json`](../../schemas/relation-extraction-expected-v1.schema.json).

The schema requires relation ids, labels, span-backed arguments, and evidence spans.

## Verification

Run:

```sh
node tools/validate-relation-extraction-readiness.mjs
npm run -s check:fixtures
```
