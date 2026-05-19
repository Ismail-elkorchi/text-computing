<!-- This file is generated. Do not edit it by hand. -->
<!-- Source: fixtures/package-release/gates.v1.json -->

# Package release gates

This document is generated from `fixtures/package-release/gates.v1.json`.

## Why this document exists

Package metadata can look releasable before support claims, tests, schemas, quality checks, and security checks are ready.

## Gate list

The gate list is the required checklist, not a release approval by itself.

## Required gates

- `metadata`
- `tests`
- `schemas`
- `package-quality`
- `security-review`
- `claim-hygiene`
- `downstream-api-stability`

## Alpha phase evidence

Phase: `alpha-foundation-release-0.1`.

Claim boundary: Public Vertical Slice 0.1 proves bounded external installability and package interoperation, not broad task support.

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
| `0` | `@ismail-elkorchi/textfacts` | packages/textfacts/package.json<br>tools/check-public-claims.mjs | Existing public beta package anchor; future non-textfacts package releases depend on declared package API evidence rather than schedule order. |
| `1` | `@ismail-elkorchi/textconformance`<br>`@ismail-elkorchi/textdoc`<br>`@ismail-elkorchi/textlab`<br>`@ismail-elkorchi/textpack`<br>`@ismail-elkorchi/textprotocol` | tools/validate-package-readiness.mjs<br>tools/check-workspace-pack-dry-run.mjs<br>fixtures/package-release/gates.v1.json | Packages without workspace package dependencies may advance only after package metadata, documentation, dry-run packaging, claim hygiene, and package-specific blockers pass. |
| `2` | `@ismail-elkorchi/textcorpus`<br>`@ismail-elkorchi/textpipeline`<br>`@ismail-elkorchi/textrules` | fixtures/package-release/downstream-api-stability.v1.json<br>tools/check-downstream-api-stability.mjs<br>tools/check-workspace-pack-dry-run.mjs<br>fixtures/package-release/gates.v1.json | Packages with workspace package dependencies may advance only after their dependency packages have earlier-stage release evidence and downstream API smoke evidence remains current. |

## Package gates

| Package | Track | Support | Readiness | Downstream API | Blockers |
| --- | --- | --- | --- | --- | --- |
| `@ismail-elkorchi/textfacts` | `public-beta` | `beta` | `publishable` | `not-required` | — |
| `@ismail-elkorchi/textdoc` | `public-alpha` | `alpha` | `publishable` | `proven` | — |
| `@ismail-elkorchi/textpack` | `public-alpha` | `alpha` | `publishable` | `proven` | — |
| `@ismail-elkorchi/textrules` | `private-unreleased` | `slice-proven` | `blocked` | `blocked` | Rule-backed behavior remains frozen-slice only for POS, NER, dependency parsing, relation extraction, and coreference.<br>External comparator captures and corpus evaluation are incomplete for several implemented task surfaces.<br>Downstream API stability evidence is not recorded for this package release surface. |
| `@ismail-elkorchi/textpipeline` | `private-unreleased` | `slice-proven` | `blocked` | `blocked` | Remote orchestration, durable cache policy, worker execution, and long-running recovery semantics are not release-ready.<br>Package-quality publication checks have not been promoted beyond private-unreleased status.<br>Downstream API stability evidence is not recorded for this package release surface. |
| `@ismail-elkorchi/textcorpus` | `private-unreleased` | `slice-proven` | `blocked` | `blocked` | Retrieval and corpus scoring remain frozen-corpus only without external relevance datasets, streaming retrieval, or durable index storage.<br>Package-quality publication checks have not been promoted beyond private-unreleased status.<br>Downstream API stability evidence is not recorded for this package release surface. |
| `@ismail-elkorchi/textprotocol` | `public-alpha` | `alpha` | `publishable` | `proven` | — |
| `@ismail-elkorchi/textconformance` | `private-unreleased` | `slice-proven` | `blocked` | `proven` | Benchmark runner is not release-ready.<br>Package-quality publication checks have not been promoted beyond private-unreleased status. |
| `@ismail-elkorchi/textlab` | `private-unreleased` | `slice-proven` | `blocked` | `blocked` | Inspection tooling lacks comparator execution, interactive views, large-corpus browsing, and release-oriented CLI hardening.<br>Package-quality publication checks have not been promoted beyond private-unreleased status.<br>Downstream API stability evidence is not recorded for this package release surface. |

## Blocker maturity

| Package | Maturity | Blocker | Decision | Evidence |
| --- | --- | --- | --- | --- |
| `@ismail-elkorchi/textdoc` | `beta` | Task-specific graph semantics remain limited beyond package-level graph integrity checks. | Does not block alpha because the alpha scope requires bounded document/container interoperation, not broad task graph semantics. | packages/textdoc/src/index.ts<br>packages/textdoc/test<br>docs/specs/support-status.v1.json |
| `@ismail-elkorchi/textpack` | `beta` | Multilingual pack coverage and update workflow are not broad enough for package release. | Does not block alpha because alpha requires explicit fixture resources and exact declared lookup behavior, not broad resource-marketplace coverage. | packages/textpack/src/index.ts<br>packages/textpack/test<br>docs/specs/support-status.v1.json |
| `@ismail-elkorchi/textrules` | `beta` | Rule-backed behavior remains frozen-slice only for POS, NER, dependency parsing, relation extraction, and coreference. | Blocks broader task claims, not the foundation alpha package sequence; keep behavior slice-scoped. | packages/textrules/src/index.ts<br>packages/textrules/test<br>docs/specs/support-status.v1.json |
| `@ismail-elkorchi/textrules` | `beta` | External comparator captures and corpus evaluation are incomplete for several implemented task surfaces. | Blocks broader task evidence claims; does not authorize new comparator matrices during alpha foundation release. | fixtures/reports/task-evidence-manifest.v1.json<br>docs/specs/support-status.v1.json |
| `@ismail-elkorchi/textrules` | `alpha` | Downstream API stability evidence is not recorded for this package release surface. | Blocks any textrules alpha release until its release surface has stable API evidence or an explicit no-dependent integration artifact. | fixtures/package-release/downstream-api-stability.v1.json<br>tools/check-downstream-api-stability.mjs |
| `@ismail-elkorchi/textpipeline` | `production-candidate` | Remote orchestration, durable cache policy, worker execution, and long-running recovery semantics are not release-ready. | Does not block alpha; it limits production-candidate operational claims beyond deterministic local execution. | packages/textpipeline/src/index.ts<br>packages/textpipeline/test<br>docs/specs/support-status.v1.json |
| `@ismail-elkorchi/textpipeline` | `alpha` | Package-quality publication checks have not been promoted beyond private-unreleased status. | Blocks textpipeline alpha until package metadata, tarball dry-run, support status, and external smoke evidence pass for the declared scope. | fixtures/package-release/gates.v1.json<br>tools/validate-package-release-gates.mjs<br>tools/check-workspace-pack-dry-run.mjs<br>docs/specs/public-vertical-slice-0.1.md |
| `@ismail-elkorchi/textpipeline` | `alpha` | Downstream API stability evidence is not recorded for this package release surface. | Blocks textpipeline alpha until its release surface has stable API evidence or an explicit no-dependent integration artifact. | fixtures/package-release/downstream-api-stability.v1.json<br>tools/check-downstream-api-stability.mjs |
| `@ismail-elkorchi/textcorpus` | `beta` | Retrieval and corpus scoring remain frozen-corpus only without external relevance datasets, streaming retrieval, or durable index storage. | Blocks broader corpus and retrieval release claims; it does not authorize task expansion during alpha foundation release. | packages/textcorpus/src/index.ts<br>packages/textcorpus/test<br>docs/specs/support-status.v1.json |
| `@ismail-elkorchi/textcorpus` | `alpha` | Package-quality publication checks have not been promoted beyond private-unreleased status. | Blocks textcorpus alpha until package metadata, tarball dry-run, support status, and external smoke evidence pass for the declared scope. | fixtures/package-release/gates.v1.json<br>tools/validate-package-release-gates.mjs<br>tools/check-workspace-pack-dry-run.mjs<br>docs/specs/public-vertical-slice-0.1.md |
| `@ismail-elkorchi/textcorpus` | `alpha` | Downstream API stability evidence is not recorded for this package release surface. | Blocks textcorpus alpha until its release surface has stable API evidence or an explicit no-dependent integration artifact. | fixtures/package-release/downstream-api-stability.v1.json<br>tools/check-downstream-api-stability.mjs |
| `@ismail-elkorchi/textconformance` | `beta` | Benchmark runner is not release-ready. | Does not block alpha because alpha requires declared conformance reports and checks, not a broad benchmark runner. | packages/textconformance/src/index.ts<br>packages/textconformance/test<br>docs/specs/support-status.v1.json |
| `@ismail-elkorchi/textconformance` | `alpha` | Package-quality publication checks have not been promoted beyond private-unreleased status. | Blocks textconformance alpha until package metadata, tarball dry-run, support status, and external smoke evidence pass for the declared scope. | fixtures/package-release/gates.v1.json<br>tools/validate-package-release-gates.mjs<br>tools/check-workspace-pack-dry-run.mjs<br>docs/specs/public-vertical-slice-0.1.md |
| `@ismail-elkorchi/textlab` | `beta` | Inspection tooling lacks comparator execution, interactive views, large-corpus browsing, and release-oriented CLI hardening. | Blocks broader inspection-tooling claims; it does not block foundation alpha packages unless their smoke output cannot be inspected. | packages/textlab/src/index.ts<br>packages/textlab/test/index.test.mjs<br>docs/specs/support-status.v1.json |
| `@ismail-elkorchi/textlab` | `alpha` | Package-quality publication checks have not been promoted beyond private-unreleased status. | Blocks textlab alpha until package metadata, tarball dry-run, support status, and external smoke evidence pass for the declared scope. | fixtures/package-release/gates.v1.json<br>tools/validate-package-release-gates.mjs<br>tools/check-workspace-pack-dry-run.mjs<br>docs/specs/public-vertical-slice-0.1.md |
| `@ismail-elkorchi/textlab` | `alpha` | Downstream API stability evidence is not recorded for this package release surface. | Blocks textlab alpha until its release surface has stable API evidence or an explicit no-dependent integration artifact. | fixtures/package-release/downstream-api-stability.v1.json<br>tools/check-downstream-api-stability.mjs |

## Notes

- Private-unreleased packages are not adoption surfaces until a later release PR changes their releaseTrack.
- Claim hygiene is a release gate because package publication can amplify unsupported claims.
- Non-textfacts packages require downstream API stability evidence before their release track can change.
- Release ordering is dependency-based: a package cannot advance past private-unreleased while any workspace package dependency is in a later or missing release stage.
- Beta and production-candidate blocker classifications remain explicit limitations; they do not block public-alpha publication when alpha blockers pass.
- Public Vertical Slice 0.1 external-smoke evidence is the phase-completion proof for alpha foundation release classification.

## Current boundary

Release readiness is dependency-based. A non-public package remains private until its declared downstream API and release-gate evidence passes.

## Verification

Run `npm run -s check:release-gates` and `npm run -s check:status-docs`.
