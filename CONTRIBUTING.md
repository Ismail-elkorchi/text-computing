# Contributing

Thanks for helping improve text-computing. This repository is a TypeScript-first workspace.

Workspace package sources live under `packages/*`, with resource packs under `packages/textpacks/*`.

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

Validates repository-level schemas against their declared JSON Schema drafts, validates
`packages/textfacts/schemas/*.schema.json` against draft 2020-12, and enforces I-JSON safety.

**Documentation boundaries**
- `docs/specs/`, `docs/rfcs/`, and `docs/decisions/` contain repository-level public contracts, proposals, and decision records.
- `fixtures/` and `schemas/` contain repository-level validation material.
- `packages/textfacts/docs/` contains usage and reference documentation for `@ismail-elkorchi/textfacts`.
- `packages/textfacts/src/`, `packages/textfacts/schemas/`, `packages/textfacts/scripts/`, `packages/textfacts/tools/`, `packages/textfacts/test/`, and `packages/textfacts/testdata/` contain implementation and verification.

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

**Code style**
- ESM only
- Strict TypeScript
- No Node-only runtime APIs in shipped code
- Deterministic outputs: always define ordering and tie-breaks

**Pull request template**
- Use [`.github/pull_request_template.md`](.github/pull_request_template.md) for PR structure and required fields.
