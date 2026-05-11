# CoNLL-U dependency readiness

- **Status:** Readiness-only
- **Scope:** CoNLL-U / Universal Dependencies import-export and dependency-target annotation preparation
- **Owning packages:** `textdoc`, `textprotocol`, `textconformance`
- **No behavior claim:** This document does not implement a dependency parser, CoNLL-U importer, or CoNLL-U exporter.

## Why this document exists

Dependency parsing and CoNLL-U interchange require stronger contracts than prose examples. This readiness gate records the public standard sources, the minimal valid and invalid fixture shapes, and the target annotation contract that later implementation must satisfy before any parser or importer/exporter behavior is claimed.

## Readiness boundary

This gate freezes only:

- the public CoNLL-U fixture directory shape;
- valid and invalid smoke fixtures;
- the dependency-target annotation contract for `textdoc`;
- the planned round-trip evidence path through `textprotocol` and `textconformance`.

It does not freeze broad Universal Dependencies treebank coverage, parser accuracy, or language support.

## Fixture policy

Fixtures under `fixtures/conllu-dependency/valid/` are repository-authored smoke inputs. They exercise basic dependency trees, root arcs, punctuation arcs, enhanced dependency columns, morphology columns, and multiword tokens.

Fixtures under `fixtures/conllu-dependency/invalid/` are negative controls. They must fail for the declared reason before importer/exporter behavior can claim conformance.

## Dependency-target contract

The dependency-target readiness contract is `schemas/textdoc-dependency-target-v1.schema.json`. A dependency target maps one dependent token id to either a head token id or `null` for root. Each edge keeps its originating CoNLL-U sentence id, token id, HEAD, and DEPREL value.

The contract is intentionally separate from parser behavior. It defines what an imported or produced dependency edge must be able to express, not how that edge is inferred.

## Round-trip evidence plan

Later implementation must prove:

1. valid CoNLL-U fixtures import to deterministic `textdoc` token and dependency targets;
2. exported CoNLL-U preserves token ids, HEAD, DEPREL, and sentence boundaries for the declared fixture scope;
3. invalid fixtures fail with machine-readable diagnostics;
4. each round-trip proof is wrapped in `textprotocol` and reported through `textconformance`.

## Verification

The readiness artifacts are checked by:

```sh
node tools/validate-conllu-dependency-readiness.mjs
```

Repository fixture checks include this validator through:

```sh
npm run -s check:fixtures
```
