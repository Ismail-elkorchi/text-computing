# Dependency parser readiness

## Why this document exists

Dependency parsing is a downstream behavior gate, not a side effect of CoNLL-U import/export.
This document freezes the minimum public contract required before parser code is allowed.

## Status

- Task id: `nlp-dependency-parser`
- Status: `readiness-only`
- Owning packages: `textrules`, `textpipeline`, `textdoc`, `textconformance`
- Current proof: expected dependency arcs over frozen repository-authored CoNLL-U fixtures plus one executed spaCy model-output capture
- Current non-proof: no parser model, heuristic parser, broad UD corpus support, broad UD treebank coverage, Stanza execution, or JavaScript parser comparator

## Input slices

The frozen slices live in `fixtures/dependency-parser/slices.json`.

- `en-basic` covers a short English transitive sentence with root, subject, object, and punctuation arcs.
- `es-mwt` covers Spanish multiword-token rows, morphological features, oblique relation, and punctuation.

The slices intentionally reuse `fixtures/conllu-dependency/valid/*.conllu` so the parser-readiness
contract is tied to the existing dependency annotation model without claiming a parser exists.

## Expected-output format

Expected arcs live under `fixtures/dependency-parser/expected/*.json` and validate against
`schemas/dependency-parser-expected-v1.schema.json`.

Each expected file records:

- the source CoNLL-U fixture path;
- sentence id and integer word-token order;
- basic dependency arcs as `dependent`, `head`, and `relation`;
- exactly one root for the frozen sentence;
- a support boundary stating that the file is readiness-only.

## Comparator freeze

Comparator metadata lives in `fixtures/dependency-parser/tool-versions.json`.

This gate records:

- Universal Dependencies format and guideline sources;
- an executed Python spaCy comparator capture with pinned runtime/model versions;
- a non-executed Stanza capability record;
- the absence of a committed JavaScript dependency-parser comparator for this gate;
- the rule that broader executed comparator outputs must be added before parser behavior is merged.

## Comparator outputs

Files under `fixtures/dependency-parser/comparisons/*.json` distinguish executed captures from capability
records and ecosystem gaps.

- `spacy-3.8.json` records executed outputs from pinned spaCy package and model versions.
- `stanza-1.11.json` records a non-executed Stanza capability surface.
- `javascript-gap-2026-05.json` records the absence of a committed JavaScript comparator for this gate.

The next feature gate must extend these records with broader executed captures before feature code.

## Documented non-failure differences

See `docs/decisions/dependency-parser-output-differences.md`.

## Verification

Run:

```sh
node tools/validate-dependency-parser-readiness.mjs
npm run -s check:fixtures
```

The validator checks schema validity, expected-arc consistency with the source CoNLL-U rows, executed
comparator output differences, remaining capability/gap records, and the support-status boundary.
