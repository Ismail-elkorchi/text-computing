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
| `@ismail-elkorchi/textconformance` | `beta` | Benchmark threshold policy evaluation exists for deterministic benchmark reports; broad cross-host benchmark calibration remains outside the alpha scope. | Does not block alpha because alpha requires declared conformance reports, separated benchmark records, local threshold evaluation, and package checks, not cross-host calibration. | packages/textconformance/src/index.ts<br>schemas/textconformance-benchmark-report-v1.schema.json<br>schemas/textconformance-benchmark-threshold-policy-v1.schema.json<br>schemas/textconformance-benchmark-threshold-evaluation-v1.schema.json<br>packages/textconformance/test<br>examples/textconformance-benchmark-runner-consumer.mjs |
| `@ismail-elkorchi/textcorpus` | `beta` | Corpus analysis, retrieval, and corpus scoring remain frozen-corpus only without external relevance datasets or learned relevance-calibrated weighting. | Blocks broader corpus and retrieval release statements; it does not authorize task expansion during alpha foundation release. | packages/textcorpus/src/index.ts<br>packages/textcorpus/test<br>examples/textcorpus-retrieval-index-storage-consumer.mjs<br>examples/textcorpus-field-weighting-consumer.mjs |
| `@ismail-elkorchi/textlab` | `beta` | Interactive views and standalone external-tool execution remain outside alpha scope; corpus artifact browsing is bounded to deterministic API and CLI pagination. | Blocks broader inspection-tooling statements; it does not block foundation alpha packages unless their smoke output cannot be inspected. | packages/textlab/src/index.ts<br>packages/textlab/test/index.test.mjs<br>examples/textlab-corpus-artifact-consumer.mjs |
| `@ismail-elkorchi/textpack` | `beta` | Catalog update plans and authoring transactions exist; multilingual pack coverage remains limited to reference packs. | Does not block alpha because alpha requires explicit fixture resources, deterministic update planning, and exact declared lookup behavior, not broad resource-marketplace coverage. | packages/textpack/src/index.ts<br>packages/textpack/test<br>schemas/textpack-catalog-update-plan-v1.schema.json<br>examples/textpack-catalog-update-plan-consumer.mjs |
| `@ismail-elkorchi/textpack` | `beta` | Reference packs and review-report workflow exist for alpha validation; external resource-vetting breadth remains limited. | Does not block alpha reference packs; it limits broad resource-catalog statements until resource breadth and external review evidence expand. | packages/textpack/src/index.ts<br>schemas/textpack-review-report-v1.schema.json<br>fixtures/textpack/review-report.v1.json<br>tools/validate-textpack-packages.mjs |
| `@ismail-elkorchi/textpack-en-core` | `beta` | Reference English pack covers declared en-core resource families for deterministic workflows; comprehensive English lexicon and named-entity catalog coverage remains outside scope. | Does not block alpha because resource-family behavior is declared and comprehensive English coverage is not required for alpha package release. | packages/textpack-en-core/pack.manifest.json<br>packages/textpack-en-core/README.md |
| `@ismail-elkorchi/textpack-en-legal` | `beta` | Reference fixture pack for legal-domain resource loading; it is not broad legal coverage. | Does not block alpha because the reference pack is intentionally small and explicitly scoped. | packages/textpack-en-legal/pack.manifest.json<br>packages/textpack-en-legal/README.md |
| `@ismail-elkorchi/textpack-fr-core` | `beta` | Reference fixture pack for French resource loading; it is not broad language coverage. | Does not block alpha because the reference pack is intentionally small and explicitly scoped. | packages/textpack-fr-core/pack.manifest.json<br>packages/textpack-fr-core/README.md |
| `@ismail-elkorchi/textpipeline` | `production-candidate` | Snapshot-backed cache import/export and caller-provided worker execution exist; remote orchestration, distributed scheduling, worker-pool management, and automatic recovery coordination are not release-ready. | Does not block alpha; it limits production-candidate operational statements beyond deterministic local execution, caller-managed cache snapshot semantics, and caller-provided worker adapters. | packages/textpipeline/src/index.ts<br>packages/textpipeline/test<br>examples/textpipeline-cache-snapshot-consumer.mjs<br>examples/textpipeline-worker-batch-consumer.mjs<br>schemas/textpipeline-worker-run-report-v1.schema.json |
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
