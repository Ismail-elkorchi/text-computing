# Textpack Forge

This directory contains the generated-pack pipeline for `textpack-*` packages.

The active graph separates internal source transforms from public distribution. It emits exactly
three self-contained language packages: `textpack-en`, `textpack-fr`, and `textpack-ar`.

- internal build units read pinned local snapshots under
  `tools/textpack-forge/snapshots/data/*` and execute deterministic transforms from
  `tools/textpack-forge/resources/*`.
- language distribution specs under `tools/textpack-forge/composites/*` select build-unit resources
  and flatten them into one direct manifest and resource map per language.
- source policy specs under `tools/textpack-forge/source-policies/*`
  describe the metadata-only source universe for language and task ingestion.
- large corpus, parallel, and UD annotation payloads remain explicit acquisition inputs and are not
  installed with the ordinary language packages.

Generated packages are non-publishable by default. A package becomes publishable
only when its spec opts in and supplies production-grade source coverage,
audited license evidence, scoped capability claims, conformance/evaluation
evidence, and the standard generated reports. Sampled, demo, fixture-backed,
transitional, and descriptor-only artifact packs are excluded from the public package graph.

Normal `forge:build`, `forge:verify`, and `forge:drift` runs do not download upstream sources.
Snapshot acquisition is an explicit separate action. `forge:acquire` fetches only inputs selected
by the three distributions and verifies checksums; `forge:acquire --all` refreshes every declared
internal source input.
`forge:snapshot-update` recomputes snapshot descriptors, resource input
checksums, and snapshot locks after an intentional source refresh.
`forge:license-audit` validates source policy classes, package-name suffixes,
publishability posture, default-distribution eligibility, and build-unit license
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
docs/textpacks/language-distribution-readiness.generated.json
docs/textpacks/language-distribution-readiness.generated.md
tools/textpack-forge/source-policy.generated.json
tools/textpack-forge/reports/size-report.json
packages/textpacks/*/pack.manifest.json
packages/textpacks/*/src/index.ts
packages/textpacks/*/src/manifest.ts
packages/textpacks/*/src/resources.ts
packages/textpacks/*/resources/*
packages/textpacks/textpack-en/
packages/textpacks/textpack-fr/
packages/textpacks/textpack-ar/
packages/textpacks/*/LICENSE.generated.md
packages/textpacks/*/NOTICE.generated.md
packages/textpacks/*/SOURCES.generated.json
packages/textpacks/*/ATTRIBUTION.generated.md
packages/textpacks/*/COVERAGE.generated.json
packages/textpacks/*/EVALUATION.generated.json
packages/textpacks/*/QUALITY.generated.json
packages/textpacks/*/.textpack-generated.json
```
