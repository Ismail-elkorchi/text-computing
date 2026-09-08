# Contributing

Thanks for helping improve Text Computing. The repository is organized around
three concepts: the Text Computing runtime, data-only Capability Packs, and the
Textpack Forge supply chain.

All runtime implementation work belongs in `packages/text-computing/src/<domain>/`.
Its public subpaths are one supported library. Capability Pack contracts live in
`packages/text-computing/src/packs/`; generated data packages live in
`packages/textpacks/*`. Forge owns their generated output.

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

Build emits ESM JavaScript, declarations, and source maps with TypeScript. Relative source imports use `.ts`; the compiler rewrites extensions in emitted code.
Builds consume committed pack data; they do not regenerate source snapshots.
Run `npm run forge:verify` for the separate supply-chain drift check, also run in CI.

**Schema validation**
```sh
npm run schema:validate
```

Validates repository-level schemas against their declared JSON Schema drafts,
validates generated Capability Packs, validates engine schema registries such
as `packages/text-computing/schemas/*.schema.json`, and enforces I-JSON safety.

**Multilingual NLP evaluation**
```sh
npm run test:nlp
```

Runs the committed English, French, and Arabic task cases, the frozen external
Tatoeba robustness sample, and isolated cold-start gates through the ordinary
`@ismail-elkorchi/text-computing` entrypoint. Update task expectations only when
the task contract changes. External evaluation text must remain separated from
forge inputs and must retain source, license, selection, and contributor
metadata.

To rebuild the frozen external fixture from the three checksummed Tatoeba
exports (`eng.tsv.bz2`, `fra.tsv.bz2`, and `ara.tsv.bz2`):

```sh
node tools/build-external-nlp-evaluation.mjs <download-directory> fixtures/nlp-benchmarks/external-tatoeba-v1.json
```

**Architecture and documentation boundaries**

- `docs/specs/text-computing-platform.md` is the normative product boundary.
- `docs/specs/`, `docs/rfcs/`, and `docs/decisions/` contain repository-level public contracts, proposals, and decision records.
- `fixtures/` and `schemas/` contain repository-level validation material.
- `packages/*/README.md` and `packages/*/docs/` contain package-level usage and reference documentation.
- `packages/textpacks/*` packages are generated, data-only Capability Packs. Do not add handwritten runtime facades, loaders, processors, task engines, or network behavior there.
- The root and public modules are equally supported APIs. Keep implementation imports relative and cross-domain dependencies acyclic. Use one `TextDocument` and one `TextProcessor` contract.
- Capability bindings identify slots, roles, schemas, and resources. They must
  not encode the npm package that implements an executor.

**Linting (Biome)**
```sh
npm run lint
```

**Static checks**
```sh
npm run check:static
```

Runs TypeScript static checks for shipped source (`noUnusedLocals` + `noUnusedParameters`) without emitting artifacts.

**Runtime regression tests**

```sh
npm test
npm -w @ismail-elkorchi/text-computing run test:browser
npm -w @ismail-elkorchi/text-computing run test:workers
npm run check:pack
```

The unified runner preserves the module suites. Packaging checks exercise the
published export map in an isolated consumer; bundle checks keep optional
inference backends out of unrelated imports.
Browser and Worker smoke bundles run in isolated Web-API contexts without
Node globals or network access. They do not replace deployment testing in an
actual browser or edge runtime.

**Updating Unicode tables**
```sh
npm run gen:unicode
```

That script downloads the pinned Unicode data files (17.0.0) and regenerates compact tables under:
- `packages/text-computing/src/unicode/unicode/generated` (UAX #29 + emoji + Indic)
- `packages/text-computing/src/unicode/normalize/generated` (UAX #15 normalization data)

**Updating Capability Packs**
```sh
npm run forge:build
npm run forge:verify
```

The forge owns generated Capability Pack contents, reports, source evidence,
and drift checks. Edit forge specs, source policy, schemas, or transforms
instead of manually changing generated resources. Deployable artifacts created
by external toolchains enter through the same explicit snapshot, provenance,
license, evaluation, and integrity gates.

**Code style**
- ESM only
- Strict TypeScript
- No Node-only runtime APIs in shipped code
- Deterministic outputs: always define ordering and tie-breaks
- No backward compatibility layers or dead transitional code for removed alpha APIs.

**Pull request template**
- Use [`.github/pull_request_template.md`](.github/pull_request_template.md) for PR structure and required fields.
