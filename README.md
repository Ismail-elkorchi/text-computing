# text-computing

`text-computing` is the public workspace for deterministic text computing packages.

The current non-private workspace package is `@ismail-elkorchi/textfacts`. Its implementation lives in `packages/textfacts`.
Current implementation status is tracked in [`docs/specs/support-status.md`](docs/specs/support-status.md).

## Packages

- `@ismail-elkorchi/textfacts` — deterministic, Unicode-pinned text facts.
- `@ismail-elkorchi/textdoc` — document annotation container package.
- `@ismail-elkorchi/textpack` — text resource package.
- `@ismail-elkorchi/textrules` — deterministic rules package.
- `@ismail-elkorchi/textpipeline` — deterministic processor contract package with stable trace output.
- `@ismail-elkorchi/textcorpus` — corpus feature package.
- `@ismail-elkorchi/textprotocol` — result envelope package.
- `@ismail-elkorchi/textconformance` — conformance report package.
- `@ismail-elkorchi/textlab` — inspection command package.

## Development

Run repository checks from the workspace root:

```sh
npm run -s lint
npm run -s build
npm run -s schema:validate
npm run -s check:fixtures
npm run -s test:all
```

## Repository structure

- [`.changeset/`](.changeset/) — release change note configuration and entries.
- [`docs/specs/`](docs/specs/) — public specifications and repository-level contracts.
- [`docs/rfcs/`](docs/rfcs/) — public design proposals before acceptance.
- [`docs/decisions/`](docs/decisions/) — accepted public technical decisions.
- [`fixtures/`](fixtures/) — repository-level fixture inputs, expected outputs, reports, generated artifacts, and quarantined inputs.
- [`schemas/`](schemas/) — repository-level JSON Schemas.
