# POS, morphology, and lemma readiness

## Why this document exists

Issue `#10` does not permit behavior until the repository records tag mapping policy, input slices,
 expected-output format, and documented output differences. This document defines that readiness
 gate.

## Target representation

The readiness target is:

- `textdoc-document-v1` for stored annotations;
- `textprotocol-result-envelope-v1` for serialized outputs; and
- ambiguity-preserving alternatives for POS, lemma, and morphology annotations.

## Tag mapping policy

- The target POS inventory is Universal Dependencies `UPOS`.
- Morphology uses Universal Dependencies feature names and values.
- Comparators with finer-grained or incompatible tag inventories are mapped explicitly to the target
  representation instead of silently collapsed in code.
- Lemma ambiguity remains explicit: multiple alternatives are ranked, not discarded.
- Unknown words, historical spellings, and code-switched tokens may legitimately keep multiple
  alternatives or unresolved analyses; those cases are recorded as output differences, not hidden.

## Input slices

The canonical readiness slices live in
[`../../fixtures/pos-morph-lemma/slices.json`](../../fixtures/pos-morph-lemma/slices.json).

They cover:

- unknown words;
- multiword tokens;
- clitics;
- historical spellings; and
- code switching.

## Expected-output format

Future recorded outputs must validate against
[`../../schemas/pos-morph-lemma-expected-v1.schema.json`](../../schemas/pos-morph-lemma-expected-v1.schema.json),
which wraps a `textdoc` document containing token, sentence, POS, lemma, and morphology layers for a
single slice.

## Comparator freeze

Frozen comparator versions live in
[`../../fixtures/pos-morph-lemma/tool-versions.json`](../../fixtures/pos-morph-lemma/tool-versions.json).

## Verification

`npm run -s check:fixtures` validates the slice manifest, comparator/version freeze, expected-output
schema, and required readiness documentation headings before any feature PR for issue `#10`.
