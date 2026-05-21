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

## Task evidence tiers

| Tier | Description | Minimum evidence |
| --- | --- | --- |
| `fixture-proven` | Committed fixtures and expected outputs prove only declared examples. | development fixture refs,validation fixture refs,negative controls,conformance report refs |
| `comparator-backed` | At least one executed external comparator or validator capture exists, with version and difference policy. | fixture-proven evidence,external comparator refs,difference policy or known-gap statement |
| `corpus-backed` | Committed or reproducibly fetched corpus slices, provenance, expected outputs, and conformance reports exist. | corpus slice policy,corpus provenance,expected outputs or qrels,conformance report refs |
| `broad-multilingual` | Corpus-backed evidence spans declared language/script families and includes holdout evidence. | corpus-backed evidence,language/script coverage matrix,holdout refs,negative controls by family |
| `release-stable` | Broad evidence is backed by API compatibility, performance regression gates, release checks, and limitation review. | broad-multilingual evidence when applicable,release gates,performance evidence,compatibility/deprecation policy |

## Package rows

| Package | Status | Evidence | Next gate |
| --- | --- | --- | --- |
| `@ismail-elkorchi/textconformance` | `alpha` | schemas/textconformance-report-v1.schema.json<br>packages/textconformance/src<br>packages/textconformance/package.json<br>docs/specs/public-vertical-slice-0.1.md<br>tools/smoke-public-vertical-slice.mjs | Keep broad benchmark-runner behavior as a beta limitation until broader benchmark evidence exists. |
| `@ismail-elkorchi/textcorpus` | `alpha` | docs/specs/textcorpus-collection-contract.md<br>fixtures/corpus-tfidf-bm25/slices.json<br>fixtures/retrieval/slices.json<br>fixtures/retrieval/expected/retrieval-licensed-news-bm25f.json<br>fixtures/performance/gates.v1.json<br>packages/textcorpus/src/index.ts<br>packages/textcorpus/test/index.test.ts<br>tools/check-workspace-pack-dry-run.mjs | Keep retrieval and corpus scoring bounded until external relevance datasets, streaming behavior, and durable index storage exist. |
| `@ismail-elkorchi/textdoc` | `alpha` | docs/specs/textdoc-document-annotation-model.md<br>packages/textdoc/src<br>packages/textdoc/package.json<br>docs/specs/public-vertical-slice-0.1.md<br>tools/smoke-public-vertical-slice.mjs | Keep task-specific graph semantics as a beta limitation until broader task graph evidence exists. |
| `@ismail-elkorchi/textfacts` | `beta` | packages/textfacts/package.json<br>packages/textfacts/test | Keep cross-package protocol, conformance, and resource growth outside textfacts. |
| `@ismail-elkorchi/textlab` | `alpha` | packages/textlab/src/index.ts<br>packages/textlab/src/cli.ts<br>packages/textlab/test/index.test.mjs<br>tools/smoke-public-vertical-slice.mjs<br>tools/check-workspace-pack-dry-run.mjs | Keep comparator execution, interactive views, and large-corpus browsing as beta limitations until broader inspection evidence exists. |
| `@ismail-elkorchi/textpack` | `alpha` | docs/specs/textpack-resource-manifest.md<br>packages/textpack/src<br>packages/textpack/package.json<br>docs/specs/public-vertical-slice-0.1.md<br>tools/smoke-public-vertical-slice.mjs | Keep multilingual pack breadth and resource-vetting workflow as beta limitations until broader resource evidence exists. |
| `@ismail-elkorchi/textpack-en-core` | `alpha` | packages/textpack-en-core/package.json<br>packages/textpack-en-core/pack.manifest.json<br>packages/textpack-en-core/resources<br>packages/textpack-en-core/test<br>tools/validate-textpack-packages.mjs<br>tools/check-workspace-pack-dry-run.mjs | Keep reference resources scoped until broader resource review and language coverage exist. |
| `@ismail-elkorchi/textpack-en-legal` | `alpha` | packages/textpack-en-legal/package.json<br>packages/textpack-en-legal/pack.manifest.json<br>packages/textpack-en-legal/resources<br>packages/textpack-en-legal/test<br>tools/validate-textpack-packages.mjs<br>tools/check-workspace-pack-dry-run.mjs | Keep legal-domain reference resources scoped until broader domain resource review and coverage exist. |
| `@ismail-elkorchi/textpack-fr-core` | `alpha` | packages/textpack-fr-core/package.json<br>packages/textpack-fr-core/pack.manifest.json<br>packages/textpack-fr-core/resources<br>packages/textpack-fr-core/test<br>tools/validate-textpack-packages.mjs<br>tools/check-workspace-pack-dry-run.mjs | Keep reference resources scoped until broader resource review and language coverage exist. |
| `@ismail-elkorchi/textpipeline` | `alpha` | docs/specs/textpipeline-processor-contract.md<br>tools/fuzz/semantic.mjs<br>packages/textpipeline/src/index.ts<br>packages/textpipeline/test/index.test.ts<br>tools/smoke-public-vertical-slice.mjs<br>tools/check-workspace-pack-dry-run.mjs | Keep remote orchestration, durable cache policy, worker execution, and long-running recovery as later limitations. |
| `@ismail-elkorchi/textprotocol` | `alpha` | schemas/textprotocol-result-envelope-v1.schema.json<br>packages/textprotocol/src<br>packages/textprotocol/package.json<br>docs/specs/public-vertical-slice-0.1.md<br>tools/smoke-public-vertical-slice.mjs | Keep beta and production-candidate limitations explicit until broader transport and compatibility evidence exists. |
| `@ismail-elkorchi/textrules` | `alpha` | fixtures/pos-morph-lemma/slices.json<br>fixtures/rule-backed-ner/slices.json<br>packages/textrules/src/index.ts<br>packages/textrules/test/index.test.ts<br>tools/smoke-public-vertical-slice.mjs<br>tools/check-workspace-pack-dry-run.mjs | Keep broader rule-backed task claims blocked until comparator-backed language slices and corpus evaluation expand. |

## Task rows

| Task | Status | Evidence tier | Language tier | Evidence | Next gate | Next evidence-tier blockers |
| --- | --- | --- | --- | --- | --- | --- |
| `nlp-tokenization-sbd` | `slice-proven` | `comparator-backed` | `comparator-backed` | docs/specs/tokenization-sbd-readiness.md<br>fixtures/reports/nlp-tokenization-sbd/conformance-report.json<br>docs/specs/task-evidence-tiers.md<br>fixtures/tokenization-sbd/corpus.v1.json<br>fixtures/tokenization-sbd/aggregate/ud-2.18.json<br>schemas/tokenization-sbd-corpus-aggregate-v1.schema.json | Expand multilingual fixtures and comparator replay breadth before broader claims. | Holdout slices now cover selected scripts and word-boundary regimes, but they remain repository-authored fixtures and are not sufficient for broad multilingual claims.<br>Comparator execution still depends on local availability of pinned external tools. |
| `nlp-document-annotation-model` | `slice-proven` | `fixture-proven` | `fixture-proven` | docs/specs/textdoc-document-annotation-model.md<br>fixtures/reports/nlp-document-annotation-model/conformance-report.json | Validate dependency, relation, entity-linking, and coreference graph examples. | No external document-model comparator or broad graph holdout suite is recorded. |
| `nlp-pack-resource-manifest` | `slice-proven` | `fixture-proven` | `resource-backed` | docs/specs/textpack-resource-manifest.md<br>fixtures/reports/nlp-pack-resource-manifest/conformance-report.json | Add public update workflow, broader reviewed resource catalog, and held-out pack authoring examples before broader pack-resource claims. | Broader pack-resource claims require a public update workflow, broader reviewed resource catalog, and additional held-out pack authoring examples. |
| `nlp-pos-morph-lemma` | `slice-proven` | `comparator-backed` | `comparator-backed` | docs/specs/pos-morph-lemma-readiness.md<br>fixtures/reports/nlp-pos-morph-lemma/conformance-report.json<br>fixtures/pos-morph-lemma/corpus/ud-style-slice-corpus.v1.json<br>fixtures/pos-morph-lemma/corpus/ud-style-slice-report.v1.json<br>schemas/pos-morph-lemma-corpus-evaluation-v1.schema.json<br>schemas/pos-morph-lemma-corpus-evaluation-report-v1.schema.json<br>tools/evaluate-pos-morph-lemma-corpus.mjs<br>fixtures/pos-morph-lemma/manifests/textpack-pos-fi-core.json<br>fixtures/pos-morph-lemma/expected/fi-rich-morphology.json | Add executed JavaScript comparator capture or reduce JavaScript comparator expectations. | UD-style corpus evaluation exists for committed slices only; broader UD treebank evidence, comparator execution for the added rich-morphology slice, and wider language coverage remain absent. |
| `nlp-rule-backed-ner` | `slice-proven` | `comparator-backed` | `comparator-backed` | docs/specs/rule-backed-ner-readiness.md<br>fixtures/reports/nlp-rule-backed-ner/conformance-report.json<br>fixtures/rule-backed-ner/slices.json<br>fixtures/rule-backed-ner/manifests/textpack-ner-core.json<br>fixtures/rule-backed-ner/resources/textpack-ner-core/gazetteer.json<br>fixtures/rule-backed-ner/expected/org-person-location-fr-paris.json<br>fixtures/rule-backed-ner/expected/person-location-ja-tokyo.json<br>fixtures/rule-backed-ner/expected/negative-lowercase-aliases.json | Add external NER corpus evaluation and comparator execution for added holdouts. | Large external licensed NER corpora, comparator execution for added holdouts, broader label taxonomies, and entity-linking evidence remain absent. |
| `nlp-corpus-tfidf-bm25` | `slice-proven` | `comparator-backed` | `comparator-backed` | docs/specs/corpus-tfidf-bm25-readiness.md<br>fixtures/reports/nlp-corpus-tfidf-bm25/conformance-report.json | Add external or reproducibly sourced corpus evidence, held-out corpus slices, and stable performance measurements before any broader corpus-backed ranking claim. | Corpus-backed claims require external or reproducibly sourced corpora, held-out corpus slices, and stable performance measurements beyond committed synthetic explicit-token fixtures. |
| `nlp-retrieval` | `slice-proven` | `corpus-backed` | `corpus-backed` | docs/specs/retrieval-readiness.md<br>fixtures/retrieval/slices.json<br>fixtures/retrieval/expected/retrieval-smoke.json<br>fixtures/retrieval/expected/retrieval-fielded-bm25f.json<br>fixtures/retrieval/expected/retrieval-licensed-news-bm25f.json<br>schemas/retrieval-expected-v1.schema.json<br>fixtures/reports/nlp-retrieval/conformance-report.json<br>tools/validate-retrieval-feature.mjs<br>fixtures/retrieval/qrels/retrieval-fielded-qrels.json<br>fixtures/retrieval/evaluation/retrieval-fielded-evaluation.json<br>fixtures/retrieval/qrels/retrieval-licensed-news-qrels.json<br>fixtures/retrieval/evaluation/retrieval-licensed-news-evaluation.json<br>fixtures/performance/gates.v1.json<br>schemas/retrieval-qrels-v1.schema.json<br>schemas/retrieval-evaluation-v1.schema.json | Add external relevance datasets, streaming behavior, filesystem-backed index storage, and broader multilingual retrieval fixtures. | No external relevance dataset, broad multilingual qrels set, streaming retrieval proof, or filesystem-backed index evidence is recorded. |
| `nlp-conllu-dependency-roundtrip` | `slice-proven` | `comparator-backed` | `comparator-backed` | docs/specs/conllu-dependency-readiness.md<br>fixtures/reports/nlp-conllu-dependency-roundtrip/conformance-report.json | Broaden invalid fixtures and keep parser behavior separate from format round-trip. | No broad UD treebank round-trip corpus evaluation is recorded. Parser behavior remains separate. |
| `nlp-dependency-parser` | `slice-proven` | `comparator-backed` | `comparator-backed` | docs/specs/dependency-parser-readiness.md<br>fixtures/dependency-parser/slices.json<br>fixtures/dependency-parser/comparisons/stanza-1.12.json<br>fixtures/reports/nlp-dependency-parser/conformance-report.json<br>tools/validate-dependency-parser-feature.mjs | Add broader UD treebank slices, performance thresholds, and JavaScript gap resolution before wider parser behavior. | No broad UD treebank parsing evaluation, JavaScript parser comparator, or parser performance threshold is recorded. |
| `nlp-relation-extraction` | `slice-proven` | `corpus-backed` | `corpus-backed` | docs/specs/relation-extraction-readiness.md<br>fixtures/relation-extraction/slices.json<br>fixtures/relation-extraction/expected/en-employment.json<br>fixtures/relation-extraction/expected/en-cross-sentence.json<br>fixtures/relation-extraction/expected/es-location.json<br>fixtures/relation-extraction/expected/ar-location.json<br>fixtures/relation-extraction/expected/en-no-relation.json<br>fixtures/reports/nlp-relation-extraction/conformance-report.json<br>packages/textrules/test/index.test.ts<br>tools/validate-relation-extraction-readiness.mjs | Add executed external comparator captures and larger corpus evaluation before wider relation extraction behavior. | No external comparator capture, larger corpus evaluation, or multilingual holdout relation corpus is recorded. |
| `nlp-coreference` | `slice-proven` | `corpus-backed` | `corpus-backed` | docs/specs/coreference-readiness.md<br>fixtures/coreference/slices.json<br>fixtures/coreference/expected/ar-pronoun.json<br>fixtures/coreference/expected/en-ambiguous.json<br>fixtures/coreference/expected/en-nominal.json<br>fixtures/coreference/expected/en-pronoun.json<br>fixtures/coreference/expected/es-pronoun.json<br>fixtures/reports/nlp-coreference/conformance-report.json<br>packages/textrules/test/index.test.ts<br>tools/validate-coreference-readiness.mjs | Add executed external comparator captures and larger corpus evaluation before wider coreference behavior. | No external comparator capture, larger corpus evaluation, or multilingual holdout coreference corpus is recorded. |

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
