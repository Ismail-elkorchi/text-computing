# Toolkit capability scorecard

Status: draft v1.

This document defines the public scorecard used to keep package and task claims tied to
evidence. The machine-readable source is
[`fixtures/capability-scorecard/toolkit-capability-scorecard.v1.json`](../../fixtures/capability-scorecard/toolkit-capability-scorecard.v1.json)
and the schema is
[`schemas/toolkit-capability-scorecard-v1.schema.json`](../../schemas/toolkit-capability-scorecard-v1.schema.json).

## Scope

The scorecard is not a ranking table. It is a gate that checks whether a package or NLP
task has enough evidence for its stated support status.

## Required dimensions

The scorecard tracks these dimensions:

- task coverage;
- language tier;
- comparator evidence;
- corpus evidence;
- conformance;
- API;
- performance;
- release readiness;
- security;
- reproducibility.

## Claim rule

Public claims must be support-graded. A claim may not move beyond the evidence in:

- [`docs/specs/support-status.v1.json`](support-status.v1.json);
- [`fixtures/reports/task-evidence-manifest.v1.json`](../../fixtures/reports/task-evidence-manifest.v1.json);
- linked schemas, fixtures, comparator captures, tests, and conformance reports.

The validator also rejects broad comparative marketing terms in authored public surfaces.
Technical lifecycle terms such as `superseded` remain allowed where schemas require them.

## Verification

Run:

```sh
npm run -s check:fixtures
npm run -s check:claims
```

The validator checks schema validity, support-status alignment, repository-relative
evidence paths, required scorecard axes, language-tier consistency, and claim hygiene.
