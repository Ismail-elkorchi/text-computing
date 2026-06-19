# Contributing

Thanks for helping improve text-computing. This repository is a TypeScript-first workspace.

Workspace package sources live under `packages/*`. Generated resource packages
live under `packages/textpacks/*` and are produced by `tools/textpack-forge`.

**Prerequisites**
- Node.js 24+
- Bun 1.3+
- Deno 2.6+

**Install**
```sh
npm ci
```

**Build**
```sh
npm run build
```

Build emits `.d.ts` via TypeScript and ESM JS via esbuild.

**Schema validation**
```sh
npm run schema:validate
```

Validates repository-level schemas against their declared JSON Schema drafts,
validates generated textpack packages, validates package schema registries such
as `packages/textfacts/schemas/*.schema.json`, and enforces I-JSON safety.

**Documentation boundaries**
- `docs/specs/`, `docs/rfcs/`, and `docs/decisions/` contain repository-level public contracts, proposals, and decision records.
- `fixtures/` and `schemas/` contain repository-level validation material.
- `packages/*/README.md` and `packages/*/docs/` contain package-level usage and reference documentation.
- `packages/textpacks/*` packages are generated data packages. Do not add handwritten runtime facades, loaders, processors, or task engines there.
- `@ismail-elkorchi/text-computing` is the ordinary developer-facing NLP entrypoint. Runtime packages remain expert engines.

**Formatting and linting (Biome)**
```sh
npm run lint
npm run format
```

**Static checks**
```sh
npm run check:static
```

Runs TypeScript static checks for shipped source (`noUnusedLocals` + `noUnusedParameters`) without emitting artifacts.

**Updating Unicode tables**
```sh
npm run gen:unicode
```

That script downloads the pinned Unicode data files (17.0.0) and regenerates compact tables under:
- `packages/textfacts/src/unicode/generated` (UAX #29 + emoji + Indic)
- `packages/textfacts/src/normalize/generated` (UAX #15 normalization data)

**Updating generated textpacks**
```sh
npm run forge:build
npm run forge:verify
```

The forge owns generated textpack package contents, reports, source evidence,
and drift checks. Edit forge specs, source policy, schemas, or transforms
instead of manually changing generated package resources.

**Code style**
- ESM only
- Strict TypeScript
- No Node-only runtime APIs in shipped code
- Deterministic outputs: always define ordering and tie-breaks
- No backward compatibility layers for removed alpha APIs unless a public
  release contract explicitly requires them.

**Pull request template**
- Use [`.github/pull_request_template.md`](.github/pull_request_template.md) for PR structure and required fields.
