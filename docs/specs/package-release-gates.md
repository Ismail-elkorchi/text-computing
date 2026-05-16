# Package release gates

- **Status:** Draft 0.1
- **Scope:** Public package release gate requirements
- **Data:** `fixtures/package-release/gates.v1.json`
- **Schema:** `schemas/package-release-gates-v1.schema.json`

## Why this document exists

Package metadata can look releasable before support claims, tests, schemas, quality checks, and
security checks are ready. This document records which packages are public surfaces and which remain
private-unreleased.

## Gate list

- `metadata` — package name, version, exports, files, side effects, and license are explicit.
- `tests` — package tests and repository tests cover the package surface.
- `schemas` — repository and package schemas validate under declared drafts.
- `package-quality` — pack, export, static, and package-quality checks pass where applicable.
- `security-review` — dependency and workflow changes are auditable.
- `claim-hygiene` — public claims remain support-graded and evidence-linked.

The gate list is the required checklist, not a release approval by itself. Each package also records a
`releaseReadiness` value:

- `publishable` — current metadata and checks permit the declared public release track;
- `blocked` — the package must remain private-unreleased, with explicit `releaseBlockers`.

## Current boundary

`@ismail-elkorchi/textfacts` is the only public-beta package. The other eight package workspaces are
private-unreleased even when their current slice behavior is implemented.

## Verification

Run:

```sh
node tools/validate-package-release-gates.mjs
npm run -s check:fixtures
```
