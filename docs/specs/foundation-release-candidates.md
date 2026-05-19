<!-- This file is generated. Do not edit it by hand. -->
<!-- Source: fixtures/package-release/foundation-release-candidates.v1.json -->

# Foundation release candidates

This document is generated from `fixtures/package-release/foundation-release-candidates.v1.json`.

## Boundary

Release-candidate work is not package publication. These packages remain private until blockers are removed by evidence and release gates are updated.

## Gate order

- `textprotocol` and `textconformance` — interchange and report contracts.
- `textdoc` — document and annotation container contracts.
- `textpack` — resource manifest, loading, and registry contracts.
- Dependent packages move only after their required foundation API evidence passes.

## Package candidates

| Package | State | Track | Readiness | Downstream dependents | Blockers |
| --- | --- | --- | --- | --- | --- |
| `@ismail-elkorchi/textprotocol` | `candidate-ready` | `private-unreleased` | `blocked` | @ismail-elkorchi/textpipeline<br>@ismail-elkorchi/textrules | Package-quality publication checks have not been promoted beyond private-unreleased status. |
| `@ismail-elkorchi/textconformance` | `candidate-ready` | `private-unreleased` | `blocked` | — | Benchmark runner is not release-ready.<br>Package-quality publication checks have not been promoted beyond private-unreleased status. |
| `@ismail-elkorchi/textdoc` | `candidate-ready` | `private-unreleased` | `blocked` | @ismail-elkorchi/textpipeline<br>@ismail-elkorchi/textcorpus<br>@ismail-elkorchi/textrules | Task-specific graph semantics remain limited beyond package-level graph integrity checks.<br>Package-quality publication checks have not been promoted beyond private-unreleased status. |
| `@ismail-elkorchi/textpack` | `candidate-ready` | `private-unreleased` | `blocked` | @ismail-elkorchi/textrules | Multilingual pack coverage and update workflow are not broad enough for package release.<br>Package-quality publication checks have not been promoted beyond private-unreleased status. |

## Notes

- This artifact defines remaining private foundation release candidates only; packages leave this list when alpha release gates pass.
- Foundational packages must stabilize before dependent package release-readiness can advance.
- Beta and production-candidate limitations remain recorded outside alpha release blockers.

## Verification

Run `node tools/validate-foundation-release-candidates.mjs` and `npm run -s check:status-docs`.
