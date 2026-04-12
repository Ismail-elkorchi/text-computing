# Contributing

Thanks for helping improve text-computing. This repository is a TypeScript-first workspace.

The current publishable package is `textfacts`, with source and package-local tools under `packages/textfacts`.

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

**Tests**
```sh
npm -w textfacts run test:node
npm -w textfacts run test:bun
npm -w textfacts run test:deno
npm -w textfacts run test:browser
```

All tests run offline. Unicode conformance test files are vendored under `packages/textfacts/testdata/unicode/17.0.0`.

**Schema validation**
```sh
npm run schema:validate
```

Validates JSON Schemas against the 2020-12 meta-schema and enforces I-JSON safety.

**Documentation boundaries**
- `packages/textfacts/docs/` contains usage and reference documentation for `textfacts`.
- `packages/textfacts/src/`, `packages/textfacts/schemas/`, `packages/textfacts/interop/`, `packages/textfacts/scripts/`, `packages/textfacts/tools/`, `packages/textfacts/test/`, and `packages/textfacts/testdata/` contain implementation and verification.

**Interop suite**
```sh
npm -w textfacts exec -- node tools/interop/verify.mjs
```

Regenerating fixtures (dev-time):
```sh
npm run build
npm -w textfacts exec -- node tools/interop/verify.mjs --write
```

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

**Tests and conformance**
The UAX #29 conformance tests are derived from the official Unicode test files and must pass in Node, Bun, and Deno.
Normalization conformance tests use `NormalizationTest.txt` and must pass 100%.

**Pull request template**
- Use [`.github/pull_request_template.md`](.github/pull_request_template.md) for PR structure and required fields.
