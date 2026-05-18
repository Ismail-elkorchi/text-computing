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

## Package gates

| Package | Track | Support | Readiness | Downstream API | Blockers |
| --- | --- | --- | --- | --- | --- |
| `@ismail-elkorchi/textfacts` | `public-beta` | `beta` | `publishable` | `not-required` | — |
| `@ismail-elkorchi/textdoc` | `private-unreleased` | `slice-proven` | `blocked` | `proven` | Graph annotation behavior is fixture-scope and does not yet have broad production validation.<br>Package-quality publication checks have not been promoted beyond private-unreleased status. |
| `@ismail-elkorchi/textpack` | `private-unreleased` | `slice-proven` | `blocked` | `proven` | Resource governance, multilingual pack coverage, and update workflow are not broad enough for package release.<br>Package-quality publication checks have not been promoted beyond private-unreleased status. |
| `@ismail-elkorchi/textrules` | `private-unreleased` | `slice-proven` | `blocked` | `blocked` | Rule-backed behavior remains frozen-slice only for POS, NER, dependency parsing, relation extraction, and coreference.<br>External comparator captures and corpus evaluation are incomplete for several implemented task surfaces.<br>Downstream API stability evidence is not recorded for this package release surface. |
| `@ismail-elkorchi/textpipeline` | `private-unreleased` | `slice-proven` | `blocked` | `blocked` | Remote orchestration, durable cache policy, worker execution, and long-running recovery semantics are not release-ready.<br>Package-quality publication checks have not been promoted beyond private-unreleased status.<br>Downstream API stability evidence is not recorded for this package release surface. |
| `@ismail-elkorchi/textcorpus` | `private-unreleased` | `slice-proven` | `blocked` | `blocked` | Retrieval and corpus scoring remain frozen-corpus only without large-corpus relevance or performance validation.<br>Package-quality publication checks have not been promoted beyond private-unreleased status.<br>Downstream API stability evidence is not recorded for this package release surface. |
| `@ismail-elkorchi/textprotocol` | `private-unreleased` | `slice-proven` | `blocked` | `proven` | Result envelope behavior is slice-proven, but version negotiation and transport compatibility policy are not release-ready.<br>Package-quality publication checks have not been promoted beyond private-unreleased status. |
| `@ismail-elkorchi/textconformance` | `private-unreleased` | `slice-proven` | `blocked` | `proven` | Conformance runner behavior is minimal and lacks broad diff, benchmark, and claim-registry workflows.<br>Package-quality publication checks have not been promoted beyond private-unreleased status. |
| `@ismail-elkorchi/textlab` | `private-unreleased` | `slice-proven` | `blocked` | `blocked` | Inspection tooling lacks comparator execution, interactive views, large-corpus browsing, and release-oriented CLI hardening.<br>Package-quality publication checks have not been promoted beyond private-unreleased status.<br>Downstream API stability evidence is not recorded for this package release surface. |

## Notes

- Private-unreleased packages are not adoption surfaces until a later release PR changes their releaseTrack.
- Claim hygiene is a release gate because package publication can amplify unsupported claims.
- Non-textfacts packages require downstream API stability evidence before their release track can change.

## Current boundary

Release readiness is dependency-based. A non-public package remains private until its declared downstream API and release-gate evidence passes.

## Verification

Run `npm run -s check:release-gates` and `npm run -s check:status-docs`.
