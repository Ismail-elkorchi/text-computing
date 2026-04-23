# Task coverage matrix

This matrix is the public correction to broad “implemented” readings of the repository. A closed issue or merged pull request is not a field-coverage claim.

| Task surface | Current level | Evidence in repo | Known gap before broad parity |
| --- | --- | --- | --- |
| Unicode text facts | `beta` | Unicode-pinned `textfacts` implementation and multi-runtime tests | Locale tailoring breadth and broad applied NLP integration remain limited. |
| Tokenization/SBD | `slice-proven` | Frozen fixtures, expected outputs, and comparator captures | Needs larger multilingual, domain, script, emoji, and noisy-text benchmark suites. |
| Document annotation model | `slice-proven` | `textdoc` document model, lifecycle, invalid-reference tests | Needs dependency tree, constituency/chunk, relation, coreference, entity-linking, and confidence/loss conventions. |
| Resource packs | `slice-proven` | `textpack` manifests, license/provenance checks, overlay diagnostics | Needs public registry workflow, resource vetting, broad multilingual packs, and update policy. |
| POS/morph/lemma | `slice-proven` | Frozen issue `#10` slices and deterministic `textrules` tests | Needs UD-scale corpora, richer morphology, language packs, ambiguity policy, and comparator sweeps. |
| Rule-backed NER | `slice-proven` | Frozen issue `#13` slices and PER/ORG/LOC rule tests | Needs broader labels, nested/overlap policy at scale, gazetteer governance, multilingual datasets, and entity linking. |
| Corpus TF-IDF/BM25 | `slice-proven` | Frozen explicit-token corpus and comparator captures | Needs inverted index, query parser, field weighting, snippets, relevance judgments, and performance tests. |
| Pipeline execution | `slice-proven` | Deterministic synchronous processor trace | Needs streaming, batching, async, caching, error recovery, and long-running workflow semantics. |
| Conformance | `slice-proven` | Report schema, runtime guards, and minimal synchronous runner | Needs diff format, benchmark separation, claim registry, and broader suite orchestration. |
| Inspection tooling | `scaffold` | `textlab` workspace package only | Needs CLI/API for corpus inspection, annotation querying, comparator replay, and LLM/agent evidence workflows. |
| Dependency parsing | `scaffold` | No public task artifacts | Needs UD research ledger, CoNLL-U fixtures, comparator captures, and `textdoc` dependency schema. |
| Relation extraction | `scaffold` | No public task artifacts | Needs typed relation schema, evidence-span policy, negative controls, and comparator/corpus freeze. |
| Coreference | `scaffold` | No public task artifacts | Needs mention/chain schema, ambiguity/loss policy, language coverage, and comparator/corpus freeze. |
| Entity linking | `scaffold` | No public task artifacts | Needs canonical entity id model, NIL policy, KB provenance, and benchmark freeze. |
| Classification/sentiment | `scaffold` | No public task artifacts | Needs label ontology, deterministic/resource-backed baseline, training/runtime boundary, and evaluation datasets. |
| Full retrieval | `scaffold` | BM25 formula proof only | Needs indexing API, ranking API, explainability, evaluation harness, and scale/performance budgets. |
