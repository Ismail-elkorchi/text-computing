# Coreference readiness

## Why this document exists

Coreference can silently erase ambiguity by forcing one antecedent where the text does not justify one.
This readiness gate records mention, chain, ambiguity, and loss policies before any behavior is added.

## Status

- Task id: `nlp-coreference`
- Status: `readiness-only`
- Owning packages: `textdoc`, `textrules`, `textconformance`
- Current proof: public schemas, readiness fixtures, negative controls, and conformance report exist
- Current non-proof: no coreference runtime behavior exists

## Target representation

The target representation is:

- `textdoc-document-v1` for mention spans and chain annotations;
- `coreference-expected-v1` for frozen expected outputs in a later feature gate;
- `textprotocol-result-envelope-v1` for serialized outputs; and
- `textconformance-report-v1` for machine-readable verification references.

## Mention and chain policy

The readiness mention kinds are:

- `proper`;
- `nominal`;
- `pronoun`;
- `singleton`.

Coreference chains must preserve mention ids and must not drop singleton mentions merely because they
are not linked. Unsupported split antecedents and ambiguous antecedents must become diagnostics.

## Ambiguity and loss policy

When a pronoun or nominal mention has multiple plausible antecedents, the output must preserve the
ambiguity until a slice-specific rule or expected artifact resolves it. Hidden recency preferences are
not valid readiness evidence.

## Allowed fixture policy

Only repository-authored short texts are used in the current readiness gate. Broader corpora require
license, provenance, redistribution, and comparator-output decisions before they enter required checks.

## Input slices

The canonical readiness slices live in
[`../../fixtures/coreference/slices.json`](../../fixtures/coreference/slices.json).

They cover:

- proper mentions;
- nominal mentions;
- pronoun links;
- singleton controls;
- ambiguous pronouns;
- unsupported split-antecedent controls;
- a non-English Latin-script slice; and
- a right-to-left non-Latin-script slice.

## Comparator and corpus freeze

This gate records comparator capability only. It does not commit executed comparator outputs.

Future feature work must freeze comparator versions and corpus slices before behavior is added. Candidate
comparators include mature NLP systems with coreference or mention-clustering surfaces, but their outputs
are diagnostic evidence and do not define repository semantics.

## Expected-output format

Future expected outputs must validate against
[`../../schemas/coreference-expected-v1.schema.json`](../../schemas/coreference-expected-v1.schema.json).

The schema requires mention ids, mention kinds, span targets, chain ids, chain membership, and optional
diagnostics.

## Verification

Run:

```sh
node tools/validate-coreference-readiness.mjs
npm run -s check:fixtures
```
