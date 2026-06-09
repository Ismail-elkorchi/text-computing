# text-computing

`text-computing` is the public workspace for deterministic text computing packages.

## Packages

- `@ismail-elkorchi/textfacts` — deterministic, Unicode-pinned text facts.
- `@ismail-elkorchi/textdoc` — document annotation container package.
- `@ismail-elkorchi/textpack` — text resource package.
- `@ismail-elkorchi/textlex` — lexical resources and deterministic lookup engines.
- `@ismail-elkorchi/textfst` — finite-state automata and transducers for text processing.
- `@ismail-elkorchi/textrules` — deterministic rules package.
- `@ismail-elkorchi/textnorm` — resource-backed text normalization with final views and span maps.
- `@ismail-elkorchi/textclassical` — deterministic classical statistical NLP package.
- `@ismail-elkorchi/textpipeline` — deterministic processor contract package with stable trace output.
- `@ismail-elkorchi/textdata` — deterministic dataset, stream, split, and annotation-format reader/writer package.
- `@ismail-elkorchi/textcorpus` — corpus feature package.
- `@ismail-elkorchi/textsearch` — search analyzer, index, query, ranking, filter, facet, highlight, and suggestion package.
- `@ismail-elkorchi/textkb` — knowledge resources, entity linking, sense linking, terminology KB lookup, ontology, thesaurus, and semantic relation package.
- `@ismail-elkorchi/textquality` — text quality, noisy-text quality, OCR/ATR diagnostics, readability, style, corpus quality, annotation quality, and integrity package.
- `@ismail-elkorchi/textparallel` — parallel corpus, alignment, translation memory, bilingual terminology, bilingual lexicon, and rule-based transfer package.

## Generated textpacks

- `@ismail-elkorchi/textpack-language-registry` — Generated source-backed BCP 47 language registry foundation resources.
- `@ismail-elkorchi/textpack-unicode-17` — Generated source-backed Unicode 17 foundation resources.
- `@ismail-elkorchi/textpack-cldr-core` — Generated source-backed CLDR core foundation resources.
- `@ismail-elkorchi/textpack-ar-msa-morphology` — Generated source-backed Arabic MSA morphology resources from CAMeL Morph.
- `@ismail-elkorchi/textpack-en-syntax-ud-gumreddit` — Generated source-backed English UD annotation profiles from GUMReddit.
- `@ismail-elkorchi/textpack-wordnet-en` — Generated source-backed English lexical-semantic resources from Open English WordNet.
- `@ismail-elkorchi/textpack-foundation` — Generated source-backed foundation composite and language-support API.

Generated textpacks are non-publishable by default. A generated pack becomes an npm-publishable textpack only after the forge publishability gate records production-grade source coverage, audited license evidence, scoped capability claims, conformance/evaluation evidence, and generated reports. Sampled, demo, fixture-backed, and transitional packs are not part of the public package graph.

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
- [`packages/textpacks/`](packages/textpacks/) — generated `textpack-*` foundation and task package outputs.
