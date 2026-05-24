# text-computing

`text-computing` is the public workspace for deterministic text computing packages.

## Packages

- `@ismail-elkorchi/textfacts` — deterministic, Unicode-pinned text facts.
- `@ismail-elkorchi/textdoc` — document annotation container package.
- `@ismail-elkorchi/textpack` — text resource package.
- `@ismail-elkorchi/textrules` — deterministic rules package.
- `@ismail-elkorchi/textpipeline` — deterministic processor contract package with stable trace output.
- `@ismail-elkorchi/textcorpus` — corpus feature package.
- `@ismail-elkorchi/textprotocol` — protocol schema and result envelope package.
- `@ismail-elkorchi/textconformance` — conformance report package.
- `@ismail-elkorchi/textlab` — inspection command package.

## Reference packs

- `@ismail-elkorchi/textpack-en-core` — English reference resources for alpha validation.
- `@ismail-elkorchi/textpack-en-legal` — English legal-domain reference resources for alpha validation.
- `@ismail-elkorchi/textpack-fr-core` — French reference resources for alpha validation.

## Development

Run repository checks from the workspace root:

```sh
npm run -s lint
npm run -s build
npm run -s schema:validate
npm run -s check:fixtures
npm run -s test:all
npm run -s coverage:all
npm run -s fuzz:all
```

## Repository structure

- [`.changeset/`](.changeset/) — release change note configuration and entries.
- [`docs/specs/`](docs/specs/) — public specifications and repository-level contracts.
- [`docs/rfcs/`](docs/rfcs/) — public design proposals before acceptance.
- [`docs/decisions/`](docs/decisions/) — accepted public technical decisions.
- [`fixtures/`](fixtures/) — repository-level fixture inputs, expected outputs, reports, generated artifacts, and quarantined inputs.
- [`schemas/`](schemas/) — repository-level JSON Schemas.
