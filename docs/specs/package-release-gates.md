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
| `@ismail-elkorchi/textconformance` | `beta` | Benchmark execution runner remains outside the alpha scope; benchmark report records are separate from pass/fail conformance reports. | Does not block alpha because alpha requires declared conformance reports, separated benchmark records, and checks, not benchmark execution. | packages/textconformance/src/index.ts<br>schemas/textconformance-benchmark-report-v1.schema.json<br>packages/textconformance/test |
| `@ismail-elkorchi/textcorpus` | `beta` | Corpus analysis, retrieval, and corpus scoring remain frozen-corpus only without external relevance datasets, streaming retrieval, or durable filesystem index storage. | Blocks broader corpus and retrieval release statements; it does not authorize task expansion during alpha foundation release. | packages/textcorpus/src/index.ts<br>packages/textcorpus/test |
| `@ismail-elkorchi/textdoc` | `beta` | Task-specific graph semantics remain limited beyond package-level graph integrity checks. | Does not block alpha because the alpha scope requires bounded document/container interoperation, not broad task graph semantics. | packages/textdoc/src/index.ts<br>packages/textdoc/test |
| `@ismail-elkorchi/textlab` | `beta` | Interactive views and large-corpus browsing remain outside alpha scope. | Blocks broader inspection-tooling statements; it does not block foundation alpha packages unless their smoke output cannot be inspected. | packages/textlab/src/index.ts<br>packages/textlab/test/index.test.mjs |
| `@ismail-elkorchi/textpack` | `beta` | Multilingual pack coverage and update workflow are not broad enough for package release. | Does not block alpha because alpha requires explicit fixture resources and exact declared lookup behavior, not broad resource-marketplace coverage. | packages/textpack/src/index.ts<br>packages/textpack/test |
| `@ismail-elkorchi/textpack` | `beta` | Reference packs exist for alpha validation; resource-vetting breadth remains limited. | Does not block alpha reference packs; it limits broad resource-catalog statements until review workflow and resource breadth expand. | packages/textpack/src/index.ts<br>tools/validate-textpack-packages.mjs |
| `@ismail-elkorchi/textpack-en-core` | `beta` | Reference English pack covers declared en-core resource families for deterministic workflows; comprehensive English lexicon and named-entity catalog coverage remains outside scope. | Does not block alpha because resource-family behavior is declared and comprehensive English coverage is not required for alpha package release. | packages/textpack-en-core/pack.manifest.json<br>packages/textpack-en-core/README.md |
| `@ismail-elkorchi/textpack-en-legal` | `beta` | Reference fixture pack for legal-domain resource loading; it is not broad legal coverage. | Does not block alpha because the reference pack is intentionally small and explicitly scoped. | packages/textpack-en-legal/pack.manifest.json<br>packages/textpack-en-legal/README.md |
| `@ismail-elkorchi/textpack-fr-core` | `beta` | Reference fixture pack for French resource loading; it is not broad language coverage. | Does not block alpha because the reference pack is intentionally small and explicitly scoped. | packages/textpack-fr-core/pack.manifest.json<br>packages/textpack-fr-core/README.md |
| `@ismail-elkorchi/textpipeline` | `production-candidate` | Remote orchestration, durable cache storage, distributed scheduling, worker execution, and recovery after a process boundary are not release-ready. | Does not block alpha; it limits production-candidate operational statements beyond deterministic local execution and caller-provided cache semantics. | packages/textpipeline/src/index.ts<br>packages/textpipeline/test |
| `@ismail-elkorchi/textrules` | `beta` | Rule-backed task behavior remains frozen-slice only for POS, NER, dependency parsing, relation extraction, and coreference. | Blocks broader task statements, not the foundation alpha package sequence; keep behavior slice-scoped. | packages/textrules/src/index.ts<br>packages/textrules/test |
| `@ismail-elkorchi/textrules` | `beta` | Corpus evaluation is incomplete for several implemented task surfaces. | Blocks broader behavior statements; keep task evidence tied to executable product oracles during alpha foundation release. | fixtures/relation-extraction/slices.json<br>fixtures/coreference/slices.json |

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
