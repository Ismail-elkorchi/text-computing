<!-- This file is generated. Do not edit it by hand. -->
<!-- Source: fixtures/package-release/gates.v1.json -->

# Package release gates

This document is generated from `fixtures/package-release/gates.v1.json`.

## Why this document exists

Package metadata can look releasable before support statements, tests, schemas, quality checks, and security checks are ready.

## Gate list

The gate list is the required checklist, not a release approval by itself.

## Required gates

- `metadata`
- `tests`
- `schemas`
- `package-quality`
- `security-review`
- `public-wording`
- `downstream-api-stability`

## Alpha phase evidence

Phase: `alpha-foundation-release-0.1`.

Statement boundary: Public Vertical Slice 0.1 verifies bounded external installability and package interoperation, not broad task support.

Evidence:

- docs/specs/public-vertical-slice-0.1.md
- tools/smoke-public-vertical-slice.mjs
- package.json

Commands:

- `npm run -s smoke:public-vertical-slice`
- `npm run -s check:release-gates`

## Dependency release order

A package can advance only after the package APIs it depends on have compatible release-gate evidence.

| Stage | Packages | Evidence | Policy |
| --- | --- | --- | --- |
| `0` | `@ismail-elkorchi/textfacts` | packages/textfacts/package.json<br>tools/check-public-language.mjs | Existing public beta package anchor; future non-textfacts package releases depend on declared package API evidence rather than schedule order. |
| `1` | `@ismail-elkorchi/textconformance`<br>`@ismail-elkorchi/textdoc`<br>`@ismail-elkorchi/textpack`<br>`@ismail-elkorchi/textprotocol` | tools/validate-package-readiness.mjs<br>tools/check-workspace-pack-dry-run.mjs<br>fixtures/package-release/gates.v1.json | Packages without workspace package dependencies may advance only after package metadata, documentation, dry-run packaging, public wording hygiene, and package-specific blockers pass. |
| `2` | `@ismail-elkorchi/textcorpus`<br>`@ismail-elkorchi/textpack-en-core`<br>`@ismail-elkorchi/textpack-en-legal`<br>`@ismail-elkorchi/textpack-fr-core`<br>`@ismail-elkorchi/textpipeline`<br>`@ismail-elkorchi/textrules` | fixtures/package-release/downstream-api-stability.v1.json<br>tools/check-downstream-api-stability.mjs<br>tools/check-workspace-pack-dry-run.mjs<br>fixtures/package-release/gates.v1.json | Packages with workspace package dependencies may advance only after their dependency packages have earlier-stage release evidence and downstream API smoke evidence remains current. |
| `3` | `@ismail-elkorchi/textlab` | fixtures/package-release/downstream-api-stability.v1.json<br>tools/check-downstream-api-stability.mjs<br>tools/check-workspace-pack-dry-run.mjs<br>fixtures/package-release/gates.v1.json | Inspection tooling advances after the package APIs it inspects have earlier-stage release evidence and downstream API smoke evidence remains current. |

## Package gates

| Package | Track | Support | Readiness | Downstream API | Blockers |
| --- | --- | --- | --- | --- | --- |
| `@ismail-elkorchi/textconformance` | `public-alpha` | `alpha` | `publishable` | `validated` | — |
| `@ismail-elkorchi/textcorpus` | `public-alpha` | `alpha` | `publishable` | `validated` | — |
| `@ismail-elkorchi/textdoc` | `public-alpha` | `alpha` | `publishable` | `validated` | — |
| `@ismail-elkorchi/textfacts` | `public-beta` | `beta` | `publishable` | `not-required` | — |
| `@ismail-elkorchi/textlab` | `public-alpha` | `alpha` | `publishable` | `validated` | — |
| `@ismail-elkorchi/textpack` | `public-alpha` | `alpha` | `publishable` | `validated` | — |
| `@ismail-elkorchi/textpack-en-core` | `public-alpha` | `alpha` | `publishable` | `not-required` | — |
| `@ismail-elkorchi/textpack-en-legal` | `public-alpha` | `alpha` | `publishable` | `not-required` | — |
| `@ismail-elkorchi/textpack-fr-core` | `public-alpha` | `alpha` | `publishable` | `not-required` | — |
| `@ismail-elkorchi/textpipeline` | `public-alpha` | `alpha` | `publishable` | `validated` | — |
| `@ismail-elkorchi/textprotocol` | `public-alpha` | `alpha` | `publishable` | `validated` | — |
| `@ismail-elkorchi/textrules` | `public-alpha` | `alpha` | `publishable` | `validated` | — |

## Blocker maturity

| Package | Maturity | Blocker | Decision | Evidence |
| --- | --- | --- | --- | --- |
| `@ismail-elkorchi/textconformance` | `beta` | Benchmark threshold policy evaluation and cross-host calibration reports exist for deterministic benchmark reports over caller-provided host reports; host provisioning and broad production benchmark matrices remain outside the alpha scope. | Does not block alpha because alpha requires declared conformance reports, separated benchmark records, local threshold evaluation, caller-provided calibration reports, and package checks, not host provisioning or broad production benchmark matrices. | packages/textconformance/src/index.ts<br>schemas/textconformance-benchmark-report-v1.schema.json<br>schemas/textconformance-benchmark-calibration-report-v1.schema.json<br>schemas/textconformance-benchmark-threshold-policy-v1.schema.json<br>schemas/textconformance-benchmark-threshold-evaluation-v1.schema.json<br>packages/textconformance/test<br>examples/textconformance-benchmark-runner-consumer.mjs<br>examples/textconformance-benchmark-calibration-consumer.mjs |
| `@ismail-elkorchi/textcorpus` | `beta` | Corpus analysis, retrieval, and corpus scoring remain bounded to committed/caller-provided qrels; deterministic relevance-calibration and field-weight learning exist for explicit evaluations and BM25F search spaces, but broad external relevance benchmarks remain out of scope. | Blocks broader corpus and retrieval release statements; it does not authorize task expansion during alpha foundation release. | packages/textcorpus/src/index.ts<br>packages/textcorpus/test<br>examples/textcorpus-retrieval-index-storage-consumer.mjs<br>examples/textcorpus-field-weighting-consumer.mjs<br>examples/textcorpus-relevance-calibration-consumer.mjs<br>examples/textcorpus-field-weight-learning-consumer.mjs<br>schemas/retrieval-calibration-report-v1.schema.json |
| `@ismail-elkorchi/textlab` | `beta` | Standalone external-tool execution reports and deterministic inspection-session models exist; terminal interactive views remain outside alpha scope, and corpus artifact browsing is bounded to deterministic API and CLI pagination. | Blocks broader inspection-tooling statements; it does not block foundation alpha packages unless their smoke output cannot be inspected. | packages/textlab/src/index.ts<br>packages/textlab/test/index.test.mjs<br>examples/textlab-corpus-artifact-consumer.mjs<br>examples/textlab-external-tool-consumer.mjs<br>examples/textlab-inspection-session-consumer.mjs<br>schemas/textlab-external-tool-execution-report-v1.schema.json<br>schemas/textlab-inspection-session-v1.schema.json |
| `@ismail-elkorchi/textpack` | `beta` | Catalog update plans and authoring transactions exist; multilingual pack coverage remains limited to reference packs. | Does not block alpha because alpha requires explicit fixture resources, deterministic update planning, and exact declared lookup behavior, not broad resource-marketplace coverage. | packages/textpack/src/index.ts<br>packages/textpack/test<br>schemas/textpack-catalog-update-plan-v1.schema.json<br>examples/textpack-catalog-update-plan-consumer.mjs |
| `@ismail-elkorchi/textpack` | `beta` | Reference packs and review-report workflow exist for alpha validation; external resource-vetting breadth remains limited. | Does not block alpha reference packs; it limits broad resource-catalog statements until resource breadth and external review evidence expand. | packages/textpack/src/index.ts<br>schemas/textpack-review-report-v1.schema.json<br>fixtures/textpack/review-report.v1.json<br>tools/validate-textpack-packages.mjs |
| `@ismail-elkorchi/textpack-en-core` | `beta` | Reference English pack covers every textpack resource family for deterministic workflows; comprehensive English lexicon and named-entity catalog coverage remains outside scope. | Does not block alpha because every textpack resource family is declared and validated; comprehensive English coverage is not required for alpha package release. | packages/textpack-en-core/pack.manifest.json<br>packages/textpack-en-core/resources<br>packages/textpack-en-core/README.md |
| `@ismail-elkorchi/textpack-en-legal` | `beta` | Reference legal-domain pack covers every textpack resource family for deterministic workflows; comprehensive legal-domain coverage remains outside scope. | Does not block alpha because every textpack resource family is declared and validated; comprehensive legal-domain coverage is not required for alpha package release. | packages/textpack-en-legal/pack.manifest.json<br>packages/textpack-en-legal/resources<br>packages/textpack-en-legal/README.md |
| `@ismail-elkorchi/textpack-fr-core` | `beta` | Reference French pack covers every textpack resource family for deterministic workflows; comprehensive French language coverage remains outside scope. | Does not block alpha because every textpack resource family is declared and validated; comprehensive French coverage is not required for alpha package release. | packages/textpack-fr-core/pack.manifest.json<br>packages/textpack-fr-core/resources<br>packages/textpack-fr-core/README.md |
| `@ismail-elkorchi/textpipeline` | `production-candidate` | Snapshot-backed cache import/export, caller-provided worker execution, deterministic worker-pool assignment reports, distributed schedule plans, caller-managed recovery plans, and automatic local recovery execution exist; remote orchestration is not release-ready. | Does not block alpha; it limits production-candidate operational statements beyond deterministic local execution, caller-managed cache snapshot semantics, caller-provided worker adapters, deterministic local worker-pool assignment, caller-declared distributed schedule plans, recovery-plan metadata, and automatic local recovery execution. | packages/textpipeline/src/index.ts<br>packages/textpipeline/test<br>examples/textpipeline-cache-snapshot-consumer.mjs<br>examples/textpipeline-worker-batch-consumer.mjs<br>examples/textpipeline-worker-pool-consumer.mjs<br>examples/textpipeline-distributed-schedule-consumer.mjs<br>examples/textpipeline-recovery-plan-consumer.mjs<br>examples/textpipeline-recovery-execution-consumer.mjs<br>schemas/textpipeline-worker-run-report-v1.schema.json<br>schemas/textpipeline-worker-pool-run-report-v1.schema.json<br>schemas/textpipeline-distributed-schedule-plan-v1.schema.json<br>schemas/textpipeline-recovery-plan-v1.schema.json<br>schemas/textpipeline-recovery-execution-report-v1.schema.json |
| `@ismail-elkorchi/textrules` | `beta` | Rule-backed task behavior remains frozen-slice only for POS, NER, dependency parsing, relation extraction, and coreference. | Blocks broader task statements, not the foundation alpha package sequence; keep behavior slice-scoped. | packages/textrules/src/index.ts<br>packages/textrules/test |
| `@ismail-elkorchi/textrules` | `beta` | Corpus evaluation aggregation exists for implemented task conformance reports; broad external corpus/task coverage remains limited. | Blocks broader behavior statements; keep task evidence tied to executable product oracles during alpha foundation release. | packages/textrules/src/index.ts<br>packages/textrules/test<br>examples/textrules-corpus-evaluation-consumer.mjs |

## Notes

- Private-unreleased packages are not adoption surfaces until a later release PR changes their releaseTrack.
- Public wording hygiene is a release gate because package publication can amplify unsupported statements.
- Non-textfacts packages require downstream API stability evidence before their release track can change.
- Release ordering is dependency-based: a package cannot advance past private-unreleased while any workspace package dependency is in a later or missing release stage.
- Beta and production-candidate blocker classifications remain explicit limitations; they do not block public-alpha publication when alpha blockers pass.
- Public Vertical Slice 0.1 external-smoke evidence is the phase-completion verification for alpha foundation release classification.

## Current boundary

Release readiness is dependency-based. A non-public package remains private until its declared downstream API and release-gate evidence passes.

## Verification

Run `npm run -s check:release-gates`.
