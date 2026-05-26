# Dependency parser readiness

## Why this document exists

Dependency parsing is a downstream behavior gate, not a side effect of CoNLL-U import/export.
This document freezes the minimum public contract required before parser code is allowed.

## Status

- Task id: `nlp-dependency-parser`
- Owning packages: `textrules`, `textpipeline`, `textdoc`, `textconformance`
- Current verification: expected dependency arcs over frozen repository-authored CoNLL-U fixtures, one direct UD/CoNLL-U validator capture, and negative controls inherited from the CoNLL-U invalid fixtures
- Current non-verification: no trained parser model, broad UD corpus support, or broad UD treebank coverage

## Input slices

The frozen slices live in `fixtures/dependency-parser/slices.json`.

- `en-basic` covers a short English transitive sentence with root, subject, object, and punctuation arcs.
- `es-mwt` covers Spanish multiword-token rows, morphological features, oblique relation, and punctuation.
- `ar-nonlatin` covers Arabic non-Latin right-to-left script with root, subject, object, and punctuation arcs.

Negative controls live in the same manifest and point to invalid CoNLL-U fixtures for invalid heads,
dangling heads, missing roots, and multiple roots. They are parser-readiness controls for rejecting
invalid dependency structures.

The slices intentionally reuse `fixtures/conllu-dependency/valid/*.conllu` so the parser-readiness
contract is tied to the existing dependency annotation model.

## Expected-output format

Expected arcs live under `fixtures/dependency-parser/expected/*.json` and validate against
`schemas/dependency-parser-expected-v1.schema.json`.

Each expected file records:

- the source CoNLL-U fixture path;
- sentence id and integer word-token order;
- basic dependency arcs as `dependent`, `head`, and `relation`;
- exactly one root for the frozen sentence;
- a support boundary stating that parser behavior is limited to the frozen slice.

## Standards and validation sources

Standards metadata lives in `fixtures/dependency-parser/tool-versions.json`.

This gate records:

- Universal Dependencies format and guideline sources;
- an executed UniversalDependencies/tools validation capture for the frozen CoNLL-U rows.

The next feature gate must extend product expected outputs with broader corpus and language slices before broader parser behavior.

## Documented non-failure differences

See `docs/decisions/dependency-parser-output-differences.md`.

## Verification

Run:

```sh
node tools/validate-dependency-parser-readiness.mjs
npm run -s check:fixtures
```

The validator checks schema validity, expected-arc consistency with the source CoNLL-U rows, negative
controls, remaining gap records, and the fixture boundary.
