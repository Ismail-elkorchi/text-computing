<!-- This file is generated. Do not edit it by hand. -->
<!-- Source: fixtures/capability-scorecard/toolkit-capability-scorecard.v1.json -->

# Toolkit capability scorecard

This document is generated from `fixtures/capability-scorecard/toolkit-capability-scorecard.v1.json`.

## Claim policy

Public capability claims must stay support-graded and evidence-linked. Broad comparative marketing terms are not permitted in authored public surfaces.

Blocked term set: `comparative-marketing-v1`.

## Axes

| Axis | Measurement | Gate | Evidence |
| --- | --- | --- | --- |
| `task-coverage` — Task coverage | Each NLP task has a declared support status and linked evidence. | No task claim may exceed its support status in support-status.v1.json. | docs/specs/support-status.v1.json,fixtures/reports/task-evidence-manifest.v1.json |
| `language-tier` — Language tier | Each task states the strongest language tier supported by current evidence. | A language tier requires the minimum evidence listed in this scorecard. | docs/specs/multilingual-support-tiers.md,fixtures/multilingual-support/tier-matrix.v1.json |
| `comparator-evidence` — Comparator evidence | Comparator captures name tool versions, fixture inputs, outputs, and differences. | Comparator-backed claims require replayable capture artifacts. | fixtures/evidence/valid/evidence-ledger.v1.json,tools/compare/run.mjs |
| `corpus-evidence` — Corpus evidence | Corpus-backed claims name corpus provenance, slice policy, and conformance reports. | Corpus-backed claims require persisted corpus slices or reproducible fetch instructions. | docs/specs/task-coverage-matrix.md,fixtures/reports/task-evidence-manifest.v1.json |
| `conformance` — Conformance | Machine-readable reports connect claims to checks and evidence. | Implemented task claims require conformance reports. | schemas/textconformance-report-v1.schema.json,fixtures/reports/task-evidence-manifest.v1.json |
| `api` — API | Public APIs are exported from package entrypoints and covered by tests. | Package rows cannot advance without exported runtime and type surfaces. | packages/textfacts/package.json,tools/validate-package-readiness.mjs |
| `performance` — Performance | Throughput, memory, and scale thresholds are declared before broad operational claims. | Broad corpus or pipeline claims require performance regression thresholds. | docs/specs/performance-gates.md,fixtures/performance/gates.v1.json,tools/validate-performance-gates.mjs,tools/check-coverage.mjs,tools/fuzz/semantic.mjs |
| `release-readiness` — Release readiness | Packages record metadata, build, export, package-quality checks, release-readiness state, and release blockers. | Package adoption claims require release-readiness evidence, not only a gate-name checklist. | docs/specs/package-release-gates.md,fixtures/package-release/gates.v1.json,tools/validate-package-release-gates.mjs,tools/validate-package-readiness.mjs,.changeset/config.json |
| `security` — Security | Dependency and generated-artifact changes are explicit and auditable. | New runtime dependencies require review and lockfile evidence. | package-lock.json,.github/workflows/ci.yml |
| `reproducibility` — Reproducibility | Evidence can be replayed from committed inputs and pinned commands. | Claims require deterministic replay or a documented blocker. | schemas/evidence-run-v1.schema.json,schemas/evidence-ledger-v1.schema.json,tools/validate-evidence-schemas.mjs |

## Language tiers

| Tier | Description | Minimum evidence |
| --- | --- | --- |
| `unicode-invariant` | Behavior is defined over Unicode code points or strings without language-specific claims. | schema or runtime tests,deterministic ordering tests |
| `fixture-proven` | Behavior is demonstrated only on committed fixture slices. | fixture inputs,expected outputs,validator or tests |
| `resource-backed` | Behavior depends on committed resources with license and provenance metadata. | resource manifest,license metadata,resource-backed tests |
| `comparator-backed` | Behavior or readiness has executed comparator captures with named versions and documented differences. | comparator version record,capture file,difference policy |
| `corpus-backed` | Behavior is evaluated against a committed or reproducibly fetched corpus slice with declared scope. | corpus slice policy,corpus provenance,conformance report |

## Package rows

| Package | Status | Evidence | Next gate |
| --- | --- | --- | --- |
| `@ismail-elkorchi/textfacts` | `beta` | packages/textfacts/package.json<br>packages/textfacts/test | Keep cross-package protocol, conformance, and resource growth outside textfacts. |
| `@ismail-elkorchi/textdoc` | `slice-proven` | docs/specs/textdoc-document-annotation-model.md<br>tools/validate-textdoc-document-model.mjs | Expand graph conventions only through validated fixtures and schemas. |
| `@ismail-elkorchi/textpack` | `slice-proven` | docs/specs/textpack-resource-manifest.md<br>tools/validate-textpack-resources.mjs | Add public resource review workflow before broad resource claims. |
| `@ismail-elkorchi/textrules` | `slice-proven` | fixtures/pos-morph-lemma/slices.json<br>fixtures/rule-backed-ner/slices.json | Keep rule behavior fixture-scoped until comparator-backed language slices expand. |
| `@ismail-elkorchi/textpipeline` | `slice-proven` | docs/specs/textpipeline-processor-contract.md<br>tools/fuzz/semantic.mjs | Define async, streaming, batching, and cache contracts before implementation. |
| `@ismail-elkorchi/textcorpus` | `slice-proven` | docs/specs/textcorpus-collection-contract.md<br>fixtures/corpus-tfidf-bm25/slices.json<br>fixtures/retrieval/slices.json<br>fixtures/retrieval/expected/retrieval-licensed-news-bm25f.json<br>fixtures/performance/gates.v1.json | Add external relevance datasets, streaming behavior, filesystem-backed index storage, and broader multilingual retrieval fixtures. |
| `@ismail-elkorchi/textprotocol` | `slice-proven` | schemas/textprotocol-result-envelope-v1.schema.json<br>packages/textprotocol/src | Add version negotiation only after a public contract exists. |
| `@ismail-elkorchi/textconformance` | `slice-proven` | schemas/textconformance-report-v1.schema.json<br>packages/textconformance/src | Add diff and report rendering before wider benchmark use. |
| `@ismail-elkorchi/textlab` | `slice-proven` | packages/textlab/src/index.ts<br>packages/textlab/test/index.test.mjs | Add evidence inspection for comparator drift, diffs, and support matrices. |

## Task rows

| Task | Status | Language tier | Evidence | Next gate |
| --- | --- | --- | --- | --- |
| `nlp-tokenization-sbd` | `slice-proven` | `comparator-backed` | docs/specs/tokenization-sbd-readiness.md<br>fixtures/reports/nlp-tokenization-sbd/conformance-report.json | Expand multilingual fixtures and comparator replay breadth before broader claims. |
| `nlp-document-annotation-model` | `slice-proven` | `fixture-proven` | docs/specs/textdoc-document-annotation-model.md<br>fixtures/reports/nlp-document-annotation-model/conformance-report.json | Validate dependency, relation, entity-linking, and coreference graph examples. |
| `nlp-pack-resource-manifest` | `slice-proven` | `resource-backed` | docs/specs/textpack-resource-manifest.md<br>fixtures/reports/nlp-pack-resource-manifest/conformance-report.json | Add public resource review and update policy. |
| `nlp-pos-morph-lemma` | `slice-proven` | `comparator-backed` | docs/specs/pos-morph-lemma-readiness.md<br>fixtures/reports/nlp-pos-morph-lemma/conformance-report.json | Add executed JavaScript comparator capture or reduce JavaScript comparator expectations. |
| `nlp-rule-backed-ner` | `slice-proven` | `comparator-backed` | docs/specs/rule-backed-ner-readiness.md<br>fixtures/reports/nlp-rule-backed-ner/conformance-report.json | Add multilingual negative controls and entity-linking readiness. |
| `nlp-corpus-tfidf-bm25` | `slice-proven` | `comparator-backed` | docs/specs/corpus-tfidf-bm25-readiness.md<br>fixtures/reports/nlp-corpus-tfidf-bm25/conformance-report.json | Add larger corpora, relevance-linked retrieval evaluation, field weighting, and performance thresholds. |
| `nlp-retrieval` | `slice-proven` | `corpus-backed` | docs/specs/retrieval-readiness.md<br>fixtures/retrieval/slices.json<br>fixtures/retrieval/expected/retrieval-smoke.json<br>fixtures/retrieval/expected/retrieval-fielded-bm25f.json<br>fixtures/retrieval/expected/retrieval-licensed-news-bm25f.json<br>schemas/retrieval-expected-v1.schema.json<br>fixtures/reports/nlp-retrieval/conformance-report.json<br>tools/validate-retrieval-feature.mjs<br>fixtures/retrieval/qrels/retrieval-fielded-qrels.json<br>fixtures/retrieval/evaluation/retrieval-fielded-evaluation.json<br>fixtures/retrieval/qrels/retrieval-licensed-news-qrels.json<br>fixtures/retrieval/evaluation/retrieval-licensed-news-evaluation.json<br>fixtures/performance/gates.v1.json<br>schemas/retrieval-qrels-v1.schema.json<br>schemas/retrieval-evaluation-v1.schema.json | Add external relevance datasets, streaming behavior, filesystem-backed index storage, and broader multilingual retrieval fixtures. |
| `nlp-conllu-dependency-roundtrip` | `slice-proven` | `comparator-backed` | docs/specs/conllu-dependency-readiness.md<br>fixtures/reports/nlp-conllu-dependency-roundtrip/conformance-report.json | Broaden invalid fixtures and keep parser behavior separate from format round-trip. |
| `nlp-dependency-parser` | `slice-proven` | `comparator-backed` | docs/specs/dependency-parser-readiness.md<br>fixtures/dependency-parser/slices.json<br>fixtures/dependency-parser/comparisons/stanza-1.12.json<br>fixtures/reports/nlp-dependency-parser/conformance-report.json<br>tools/validate-dependency-parser-feature.mjs | Add broader UD treebank slices, performance thresholds, and JavaScript gap resolution before wider parser behavior. |
| `nlp-relation-extraction` | `slice-proven` | `corpus-backed` | docs/specs/relation-extraction-readiness.md<br>fixtures/relation-extraction/slices.json<br>fixtures/relation-extraction/expected/en-employment.json<br>fixtures/relation-extraction/expected/en-cross-sentence.json<br>fixtures/relation-extraction/expected/es-location.json<br>fixtures/relation-extraction/expected/ar-location.json<br>fixtures/relation-extraction/expected/en-no-relation.json<br>fixtures/reports/nlp-relation-extraction/conformance-report.json<br>packages/textrules/test/index.test.ts<br>tools/validate-relation-extraction-readiness.mjs | Add executed external comparator captures and larger corpus evaluation before wider relation extraction behavior. |
| `nlp-coreference` | `slice-proven` | `corpus-backed` | docs/specs/coreference-readiness.md<br>fixtures/coreference/slices.json<br>fixtures/coreference/expected/ar-pronoun.json<br>fixtures/coreference/expected/en-ambiguous.json<br>fixtures/coreference/expected/en-nominal.json<br>fixtures/coreference/expected/en-pronoun.json<br>fixtures/coreference/expected/es-pronoun.json<br>fixtures/reports/nlp-coreference/conformance-report.json<br>packages/textrules/test/index.test.ts<br>tools/validate-coreference-readiness.mjs | Add executed external comparator captures and larger corpus evaluation before wider coreference behavior. |

## Release gates

| Gate | Description | Evidence required |
| --- | --- | --- |
| `metadata` | Package metadata names, exports, files, side effects, and license are explicit. | package.json,tools/validate-package-readiness.mjs |
| `tests` | Package tests exercise runtime guards, schemas, and public examples. | package tests,npm run -s test:all |
| `schemas` | Repository and package schemas validate under the declared drafts. | npm run -s schema:validate,schemas/README.md |
| `package-quality` | Package-quality checks run before publication decisions. | npm run -s check:package-readiness,npm run -s check:quality |
| `security-review` | Dependency changes and workflow evidence are reviewed before release. | package-lock.json,.github/workflows/ci.yml |
| `claim-hygiene` | Public package claims remain support-graded and evidence-linked before release. | tools/check-public-claims.mjs,fixtures/capability-scorecard/toolkit-capability-scorecard.v1.json |

## Verification

Run `npm run -s check:status-docs` and `npm run -s check:fixtures`.
