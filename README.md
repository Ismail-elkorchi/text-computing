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
- `@ismail-elkorchi/text-computing` — single developer-facing SDK over runtime engines and generated textpack data packages.

## Developer entrypoint

Use `@ismail-elkorchi/text-computing` as the ordinary NLP entrypoint. Generated `textpack-*` packages are data-only inputs.

```ts
import { createNodeResourceReader, load } from "@ismail-elkorchi/text-computing/node";
import fr from "@ismail-elkorchi/textpack-fr";

const nlp = await load(fr, { reader: createNodeResourceReader() });
const doc = await nlp("L'Etat francais reconnait Paris.");
```

## Generated textpacks

The forge publishes three self-contained language data packages:

- `@ismail-elkorchi/textpack-en` — English resources for ordinary document NLP.
- `@ismail-elkorchi/textpack-fr` — French resources for ordinary document NLP, including its declared share-alike data.
- `@ismail-elkorchi/textpack-ar` — Arabic MSA resources for ordinary document NLP.

Capability slices and source transforms are internal forge build units, not npm packages. Large corpus, parallel, and UD annotation datasets remain explicit acquisition inputs instead of default language-package payloads.

Generated textpacks are non-publishable by default. A generated pack becomes an npm-publishable textpack only after the forge publishability gate records production-grade source coverage, audited license evidence, scoped capability claims, conformance/evaluation evidence, and generated reports. Descriptor-only packs are `artifact-backed`, not `task-supported`; sampled, demo, fixture-backed, and transitional packs are not part of the public package graph.

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
- [`packages/textpacks/`](packages/textpacks/) — the three generated language distribution outputs.
