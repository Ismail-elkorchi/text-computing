# text-computing

`text-computing` is the public workspace for deterministic text computing packages.

## Packages

- `@ismail-elkorchi/textfacts` — deterministic, Unicode-pinned text facts.
- `@ismail-elkorchi/textdoc` — document annotation container package.
- `@ismail-elkorchi/textpack` — text resource package.
- `@ismail-elkorchi/textlex` — lexical resources and deterministic lookup engines.
- `@ismail-elkorchi/textrules` — deterministic rules package.
- `@ismail-elkorchi/textpipeline` — deterministic processor contract package with stable trace output.
- `@ismail-elkorchi/textcorpus` — corpus feature package.

## Reference packs

- `@ismail-elkorchi/textpack-en-core` — English reference resources for alpha validation.
- `@ismail-elkorchi/textpack-en-legal` — English legal-domain reference resources for alpha validation.
- `@ismail-elkorchi/textpack-fr-core` — French reference resources for alpha validation.
- `@ismail-elkorchi/textpack-tr-morphology` — Turkish morphology resources for agglutinative-language coverage.
- `@ismail-elkorchi/textpack-ar-core` — Arabic core resources for Semitic/root-pattern and right-to-left script coverage.
- `@ismail-elkorchi/textpack-ja-segmentation` — Japanese segmentation resources for no-space text coverage.
- `@ismail-elkorchi/textpack-fr-historical` — French historical spelling and normalization resources.
- `@ismail-elkorchi/textpack-ocr-latin19c` — Latin nineteenth-century OCR/noisy-text resources.
- `@ismail-elkorchi/textpack-kb-demo` — Knowledge-base and ontology demo resources.
- `@ismail-elkorchi/textpack-corpus-demo-en` — Small English corpus and dataset demo resources.

## Development

Run repository checks from the workspace root:

```sh
npm run -s lint
npm run -s build
npm run -s schema:validate
```

## Repository structure

- [`.changeset/`](.changeset/) — release change note configuration and entries.
- [`docs/specs/`](docs/specs/) — public specifications and repository-level contracts.
- [`docs/rfcs/`](docs/rfcs/) — public design proposals before acceptance.
- [`docs/decisions/`](docs/decisions/) — accepted public technical decisions.
- [`fixtures/`](fixtures/) — repository-level fixture inputs, expected outputs, reports, generated artifacts, and quarantined inputs.
- [`schemas/`](schemas/) — repository-level JSON Schemas.
