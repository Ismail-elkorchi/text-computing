# Relation extraction readiness

## Why this document exists

Relation extraction can be confused with cooccurrence, entity linking, event extraction, or learned
classification. This gate records the typed relation surface for the current frozen behavior slice.

## Status

- Task id: `nlp-relation-extraction`
- Status: `slice-validated`
- Owning packages: `textrules`, `textdoc`, `textconformance`
- Current verification: public schemas, frozen fixtures, committed corpus evidence, recorded expected outputs, package behavior, negative controls, and conformance report exist
- Current non-verification: no broad corpus benchmark exists

## Target representation

The target representation is:

- `textdoc-document-v1` for span-backed arguments and evidence spans;
- `relation-extraction-expected-v1` for frozen expected outputs;
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

Only repository-authored short texts are used in the current gate. Broader corpora require
license, provenance, and redistribution decisions before they enter required checks.

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

## Corpus boundary

This gate records a committed repository-authored corpus slice in
[`../../fixtures/relation-extraction/slices.json`](../../fixtures/relation-extraction/slices.json).
The corpus evidence records fixture ids, source hashes, expected-output paths, split policy, and negative-control
roles. It is corpus-backed evidence for this frozen slice only.

Future broadening work must add larger corpus slices before wider behavior is added.

## Expected-output format

Expected outputs validate against
[`../../schemas/relation-extraction-expected-v1.schema.json`](../../schemas/relation-extraction-expected-v1.schema.json).

The schema requires relation ids, labels, span-backed arguments, and evidence spans.
Recorded expected outputs live in
[`../../fixtures/relation-extraction/expected/`](../../fixtures/relation-extraction/expected/).

## Verification

Run:

```sh
node tools/validate-relation-extraction-readiness.mjs
npm run -s check:fixtures
```
