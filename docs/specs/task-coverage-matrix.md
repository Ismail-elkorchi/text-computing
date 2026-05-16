# Task coverage matrix

This matrix is the public correction to broad “implemented” readings of the repository. A closed issue or merged pull request is not a field-coverage claim.

| Task surface | Current level | Evidence in repo | Known gap before broad parity |
| --- | --- | --- | --- |
| Unicode text facts | `beta` | Unicode-pinned `textfacts` implementation and multi-runtime tests | Locale tailoring breadth and broad applied NLP integration remain limited. |
| Tokenization/SBD | `slice-proven` | Frozen fixtures, expected outputs, and comparator captures | Needs larger multilingual, domain, script, emoji, and noisy-text benchmark suites. |
| Document annotation model | `slice-proven` | `textdoc` document model, lifecycle, graph annotation fixtures, invalid-reference tests | Needs broad production relation extraction, coreference resolution, entity linking, parser behavior, and confidence/loss conventions. |
| Resource packs | `slice-proven` | `textpack` manifests, fixture content loaders, license/provenance checks, overlay diagnostics | Needs public registry workflow, resource vetting, broad multilingual packs, and update policy. |
| POS/morph/lemma | `slice-proven` | Frozen issue `#10` slices and deterministic `textrules` tests | Needs UD-scale corpora, richer morphology, language packs, ambiguity policy, and comparator sweeps. |
| Rule-backed NER | `slice-proven` | Frozen issue `#13` slices and PER/ORG/LOC rule tests | Needs broader labels, nested/overlap policy at scale, gazetteer governance, multilingual datasets, and entity linking. |
| Corpus TF-IDF/BM25 | `slice-proven` | Frozen explicit-token corpus and comparator captures | Needs larger corpora, relevance-linked retrieval evaluation, field weighting, and performance tests. |
| Pipeline execution | `slice-proven` | Deterministic synchronous/async processor trace, batch/stream runners, cache-hit traces, cancellation, and continue-on-error traces | Needs remote orchestration, distributed scheduling, durable cache storage, worker pools, and long-running workflow semantics. |
| Conformance | `slice-proven` | Report schema, runtime guards, and minimal synchronous runner | Needs diff format, benchmark separation, claim registry, and broader suite orchestration. |
| Inspection tooling | `slice-proven` for support-status inspection only | `textlab` support-status summary API, CLI, and package tests | Needs conformance report rendering, corpus inspection, annotation querying, comparator replay, and LLM/agent evidence workflows. |
| Dependency parsing and CoNLL-U/UD interchange | `slice-proven` for CoNLL-U I/O and frozen parser arcs | CoNLL-U/UD research ledger, valid/invalid CoNLL-U fixtures, expected round-trip outputs, dependency-target contract, parser expected arcs, executed spaCy/Stanza captures, direct UD validation, and feature validation | Needs broader UD slices, performance thresholds, JavaScript gap resolution, and broader parser behavior. |
| Relation extraction | `slice-proven` | Typed relation schemas, frozen expected outputs, deterministic fixture behavior, negative controls, and conformance report | Needs executed comparator captures and corpus evaluation. |
| Coreference | `slice-proven` | Mention/chain schemas, frozen expected outputs, deterministic fixture behavior, negative controls, and conformance report | Needs executed comparator captures and corpus evaluation. |
| Entity linking | `scaffold` | No public task artifacts | Needs canonical entity id model, NIL policy, KB provenance, and benchmark freeze. |
| Classification/sentiment | `scaffold` | No public task artifacts | Needs label ontology, deterministic/resource-backed baseline, training/runtime boundary, and evaluation datasets. |
| Full retrieval | `slice-proven` | Explicit-token retrieval fixture, query parser, required/prohibited operators, metadata field filters, inverted-index lookup, BM25 ranking, snippets, explain output, index JSON round-trip tests, bounded large-corpus ordering tests, and conformance report | Needs relevance judgments, broader corpora, field weighting, streaming index behavior, and scale/performance budgets. |
