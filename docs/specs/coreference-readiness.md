# Coreference readiness

## Why this document exists

Coreference can silently erase ambiguity by forcing one antecedent where the text does not justify one.
This gate records mention, chain, ambiguity, and loss policies and validates frozen-slice behavior against
recorded expected outputs.

## Status

- Task id: `nlp-coreference`
- Status: `slice-validated`
- Owning packages: `textdoc`, `textrules`, `textconformance`
- Current verification: public schemas, frozen fixtures, committed corpus evidence, recorded expected outputs, package tests, and a conformance report exist
- Current non-verification: broad corpus benchmark is not implemented

## Target representation

The target representation is:

- `textdoc-document-v1` for mention spans and chain annotations;
- `coreference-expected-v1` for frozen expected outputs;
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
license, provenance, and redistribution decisions before they enter required checks.

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

## Corpus boundary

This gate records a committed repository-authored corpus slice in
[`../../fixtures/coreference/slices.json`](../../fixtures/coreference/slices.json). The corpus evidence records
fixture ids, source hashes, expected-output paths, split policy, and negative-control roles. It is corpus-backed
evidence for this frozen slice only.

Future expansion must add larger corpus slices before wider behavior is added.

## Expected-output format

Expected outputs validate against
[`../../schemas/coreference-expected-v1.schema.json`](../../schemas/coreference-expected-v1.schema.json).

The schema requires mention ids, mention kinds, span targets, chain ids, chain membership, and optional
diagnostics.

## Verification

Run:

```sh
node tools/validate-coreference-readiness.mjs
npm run -s check:fixtures
```
