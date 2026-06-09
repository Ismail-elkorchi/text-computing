# Textpack Forge

This directory contains the generated-pack pipeline for `textpack-*` packages.

The current active graph contains source-backed foundation packs, the foundation composite, and a
small set of source-backed task slices:

- source-backed foundation packs read pinned local snapshots under
  `tools/textpack-forge/snapshots/data/*` and execute deterministic transforms from
  `tools/textpack-forge/resources/*`.
- source-backed task slices use audited source snapshots for narrow production components, such as
  English WordNet lexical-semantic resources and SCOWLv2 inflection inventory resources.
- source policy specs under `tools/textpack-forge/source-policies/*`
  describe the metadata-only source universe for language and task ingestion.
- the foundation composite spec under `tools/textpack-forge/composites/*`
  generates the foundation recipe package and language-support API.
- descriptor-only Tatoeba and Wikidata packs are private `artifact-backed` outputs until local
  sentence rows, alignment rows, entity extracts, indexes, databases, or equivalent task-usable
  payloads are materialized.

Generated packages are non-publishable by default. A package becomes publishable
only when its spec opts in and supplies production-grade source coverage,
audited license evidence, scoped capability claims, conformance/evaluation
evidence, and the standard generated reports. Sampled, demo, fixture-backed,
transitional, and descriptor-only artifact packs are excluded from the public package graph.

Normal `forge:build`, `forge:verify`, and `forge:drift` runs do not download upstream sources.
Snapshot acquisition is an explicit separate action. `forge:acquire` re-fetches
the files declared by snapshot descriptors and verifies existing checksums.
`forge:snapshot-update` recomputes snapshot descriptors, resource input
checksums, and snapshot locks after an intentional source refresh.
`forge:license-audit` validates source policy classes, package-name suffixes,
publishability posture, default-composite exclusion, and component license
policy.

Commands:

```sh
npm run -s forge:build
npm run -s forge:acquire
npm run -s forge:snapshot-update
npm run -s forge:license-audit
npm run -s forge:verify
npm run -s forge:drift
npm run -s forge:inventory
npm run -s forge:size
```

Generated outputs:

```text
docs/textpacks/generated-inventory.json
docs/textpacks/generated-inventory.md
docs/textpacks/source-readiness.generated.md
docs/textpacks/language-composite-readiness.generated.json
docs/textpacks/language-composite-readiness.generated.md
tools/textpack-forge/source-policy.generated.json
tools/textpack-forge/reports/size-report.json
packages/textpacks/*/pack.manifest.json
packages/textpacks/*/src/index.ts
packages/textpacks/*/src/manifest.ts
packages/textpacks/*/src/resources.ts
packages/textpacks/*/resources/*
packages/textpacks/textpack-language-registry/
packages/textpacks/textpack-unicode-17/
packages/textpacks/textpack-cldr-core/
packages/textpacks/textpack-foundation/
packages/textpacks/*/LICENSE.generated.md
packages/textpacks/*/NOTICE.generated.md
packages/textpacks/*/SOURCES.generated.json
packages/textpacks/*/ATTRIBUTION.generated.md
packages/textpacks/*/COVERAGE.generated.json
packages/textpacks/*/EVALUATION.generated.json
packages/textpacks/*/QUALITY.generated.json
packages/textpacks/*/.textpack-generated.json
```
