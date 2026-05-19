# Task evidence tiers

- **Status:** Draft 0.1
- **Scope:** Public task-evidence tier and fixture-split policy
- **Data:** [`fixtures/evidence/task-evidence-tier-policy.v1.json`](../../fixtures/evidence/task-evidence-tier-policy.v1.json)
- **Schema:** [`schemas/task-evidence-tier-policy-v1.schema.json`](../../schemas/task-evidence-tier-policy-v1.schema.json)

## Why this document exists

Package installability does not prove broad NLP task capability. This policy keeps each task claim tied to the strongest evidence tier that is actually present.

## Tier order

- `fixture-proven` — committed fixtures and expected outputs prove only declared examples.
- `comparator-backed` — at least one executed external comparator or validator capture exists, with version and difference policy.
- `corpus-backed` — committed or reproducibly fetched corpus slices, provenance, expected outputs, and conformance reports exist.
- `broad-multilingual` — corpus-backed evidence spans declared language/script families and includes holdout evidence.
- `release-stable` — broad evidence is backed by API compatibility, performance regression gates, release checks, and limitation review.

## Split roles

Every task policy distinguishes:

- `development` fixtures used to shape behavior;
- `validation` fixtures used to verify declared behavior;
- `holdout` fixtures not used to tune implementation;
- `negative-control` fixtures that prove rejection, limitation, or non-match behavior;
- external comparator, corpus, performance, and conformance evidence refs when they exist.

Frozen examples can prove regression stability. They cannot by themselves prove broad capability.

## Verification

Run `node tools/validate-task-evidence-tiers.mjs` and `npm run -s check:status-docs`.
