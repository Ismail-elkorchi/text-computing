# CoNLL-U dependency round-trip

- **Status:** Slice-validated for frozen fixtures
- **Scope:** CoNLL-U / Universal Dependencies import-export round-trip over repository-authored fixtures
- **Owning packages:** `textdoc`, `textprotocol`, `textconformance`
- **No parser scope:** This document does not implement a dependency parser or broad Universal Dependencies treebank support.

## Why this document exists

Dependency parsing and CoNLL-U interchange require stronger contracts than prose examples. This document records the public standard sources, the valid and invalid fixture shapes, the dependency annotation contract, and the fixture-scope import/export round-trip verification.

## Readiness boundary

This gate verifies only:

- the public CoNLL-U fixture directory shape;
- valid and invalid smoke fixtures;
- external CoNLL-U validator output for every frozen fixture;
- the dependency-target annotation contract for `textdoc`;
- the recorded round-trip evidence path through `textprotocol` and `textconformance`.

It does not verify broad Universal Dependencies treebank coverage, parser accuracy, or language support.

## Fixture policy

Fixtures under `fixtures/conllu-dependency/valid/` are repository-authored smoke inputs. They exercise basic dependency trees, root arcs, punctuation arcs, enhanced dependency columns, morphology columns, multiword tokens, and a non-Latin Arabic fixture.

Fixtures under `fixtures/conllu-dependency/invalid/` are negative controls. They must fail for the declared reason before importer/exporter behavior can declare conformance. The current negative controls cover dangling heads, malformed field counts, missing roots, multiple roots, invalid HEAD values, and missing dependency relations.

External validator captures live under `fixtures/conllu-dependency/validation/`. They record UniversalDependencies/tools outcomes for every frozen valid and invalid fixture.

## Dependency-target contract

The dependency-target contract is `schemas/textdoc-dependency-target-v1.schema.json`. A dependency target maps one dependent token id to either a head token id or `null` for root. Each edge keeps its originating CoNLL-U sentence id, token id, HEAD, and DEPREL value.

The contract is intentionally separate from parser behavior. It defines what an imported or produced dependency edge expresses, not how that edge is inferred.

## Round-trip evidence plan

Current fixture-scope implementation verifies:

1. valid CoNLL-U fixtures import to deterministic `textdoc` token, dependency-node, and dependency layers;
2. exported CoNLL-U preserves token ids, HEAD, DEPREL, DEPS, MWT rows, comments, and sentence boundaries for the declared fixture scope;
3. invalid fixtures fail with machine-readable diagnostics;
4. UniversalDependencies/tools accepts every valid fixture and rejects every invalid fixture;
5. each round-trip verification is wrapped in `textprotocol` and reported through `textconformance`.

## Verification

The readiness artifacts are checked by:

```sh
node tools/validate-conllu-dependency-readiness.mjs
```

Repository fixture checks include this validator through:

```sh
npm run -s check:fixtures
```
