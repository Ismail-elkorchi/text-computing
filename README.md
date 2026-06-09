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
- `@ismail-elkorchi/textpack-ar` — Generated private artifact-backed Arabic policy-expanded composite; currently 8/12 ready and blocked on local KB, corpus, parallel, and quality payloads.
- `@ismail-elkorchi/textpack-ar-core` — Generated source-backed Arabic core language profile from IANA, Unicode, and CLDR.
- `@ismail-elkorchi/textpack-ar-corpus` — Generated private artifact-backed Arabic Tatoeba corpus descriptor; not task-supported until local sentence rows or a corpus index are materialized.
- `@ismail-elkorchi/textpack-ar-kb` — Generated private artifact-backed Arabic KB composite over Arabic WordNet plus descriptor-only Wikidata metadata.
- `@ismail-elkorchi/textpack-ar-lexicon` — Generated source-backed Arabic MSA lexicon composite over Arabic WordNet and CAMeL Morph resources.
- `@ismail-elkorchi/textpack-ar-morphology` — Generated source-backed Arabic MSA morphology composite over CAMeL Morph resources.
- `@ismail-elkorchi/textpack-ar-msa-morphology` — Generated source-backed Arabic MSA morphology resources from CAMeL Morph.
- `@ismail-elkorchi/textpack-ar-normalization` — Generated source-backed Arabic MSA Unicode/CLDR/CAMeL normalization profile.
- `@ismail-elkorchi/textpack-ar-parallel` — Generated private artifact-backed Arabic Tatoeba parallel descriptors; not task-supported until local alignment rows or an alignment index are materialized.
- `@ismail-elkorchi/textpack-ar-quality` — Generated private artifact-backed Arabic quality wrapper; blocked until quality evidence covers materialized KB, corpus, and parallel payloads.
- `@ismail-elkorchi/textpack-ar-quality-sa` — Generated private artifact-backed Arabic quality composite over the share-alike syntax graph plus descriptor-only evidence.
- `@ismail-elkorchi/textpack-ar-sa` — Generated private artifact-backed Arabic share-alike composite; blocked on local KB, corpus, parallel, and quality payloads.
- `@ismail-elkorchi/textpack-ar-search` — Generated source-backed Arabic MSA search analyzer resources from CLDR, CAMeL Morph, and Arabic WordNet.
- `@ismail-elkorchi/textpack-ar-segmentation` — Generated source-backed Arabic MSA segmentation composite over CAMeL Morph tokenization resources.
- `@ismail-elkorchi/textpack-ar-syntax` — Generated policy-expanded Arabic syntax wrapper over the share-alike isolated UD NYUAD syntax graph.
- `@ismail-elkorchi/textpack-ar-syntax-sa` — Generated share-alike isolated Arabic syntax composite over UD NYUAD resources.
- `@ismail-elkorchi/textpack-ar-syntax-ud-nyuad-sa` — Generated source-backed, share-alike isolated Arabic UD NYUAD syntax and tagging resources without raw text fields.
- `@ismail-elkorchi/textpack-en` — Generated private artifact-backed English composite; currently 8/12 ready and blocked on local KB, corpus, parallel, and quality payloads.
- `@ismail-elkorchi/textpack-en-core` — Generated source-backed English core language profile from IANA, Unicode, CLDR, ESDB, and SCOWLv2.
- `@ismail-elkorchi/textpack-en-corpus` — Generated private artifact-backed English Tatoeba corpus descriptor; not task-supported until local sentence rows or a corpus index are materialized.
- `@ismail-elkorchi/textpack-en-inflection-scowl` — Generated source-backed English lookup analyzer/generator, POS, and inflection resources from SCOWLv2.
- `@ismail-elkorchi/textpack-en-kb` — Generated private artifact-backed English KB composite over Open English WordNet plus descriptor-only Wikidata metadata.
- `@ismail-elkorchi/textpack-en-lexicon` — Generated source-backed English lexicon composite over ESDB, SCOWLv2, and Open English WordNet components.
- `@ismail-elkorchi/textpack-en-morphology` — Generated source-backed English lookup morphology composite over SCOWLv2 analyzer/generator resources.
- `@ismail-elkorchi/textpack-en-normalization` — Generated source-backed English Unicode/CLDR normalization profile.
- `@ismail-elkorchi/textpack-en-parallel` — Generated private artifact-backed English Tatoeba parallel descriptors; not task-supported until local alignment rows or an alignment index are materialized.
- `@ismail-elkorchi/textpack-en-quality` — Generated private artifact-backed English quality composite; blocked until quality evidence covers materialized KB, corpus, and parallel payloads.
- `@ismail-elkorchi/textpack-en-segmentation` — Generated source-backed English Unicode/CLDR segmentation profile.
- `@ismail-elkorchi/textpack-en-search` — Generated source-backed English search composite over the ESDB analyzer-profile component.
- `@ismail-elkorchi/textpack-en-syntax` — Generated source-backed English syntax composite over the GUMReddit annotation-profile component.
- `@ismail-elkorchi/textpack-en-syntax-ud-gumreddit` — Generated source-backed English UD annotation profiles from GUMReddit.
- `@ismail-elkorchi/textpack-en-wordlist-esdb` — Generated source-backed English spelling wordlist and search-profile resources from ESDB wordlist-diff.
- `@ismail-elkorchi/textpack-wikidata-ar` — Generated private artifact-backed Arabic Wikidata descriptor; not task-supported until a local entity/alias/relation extract or index is materialized.
- `@ismail-elkorchi/textpack-wikidata-en` — Generated private artifact-backed English Wikidata descriptor; not task-supported until a local entity/alias/relation extract or index is materialized.
- `@ismail-elkorchi/textpack-wikidata-fr` — Generated private artifact-backed French Wikidata descriptor; not task-supported until a local entity/alias/relation extract or index is materialized.
- `@ismail-elkorchi/textpack-fr` — Generated private artifact-backed French policy-expanded composite; currently 8/12 ready and blocked on local KB, corpus, parallel, and quality payloads.
- `@ismail-elkorchi/textpack-fr-corpus` — Generated private artifact-backed French Tatoeba corpus descriptor; not task-supported until local sentence rows or a corpus index are materialized.
- `@ismail-elkorchi/textpack-fr-core` — Generated source-backed French core language profile from IANA, Unicode, and CLDR.
- `@ismail-elkorchi/textpack-fr-kb` — Generated private artifact-backed French KB composite over descriptor-only Wikidata metadata.
- `@ismail-elkorchi/textpack-fr-lexicon` — Generated policy-expanded French lexicon wrapper over the share-alike isolated Lexique component.
- `@ismail-elkorchi/textpack-fr-lexicon-sa` — Generated share-alike isolated French lexicon composite over Lexique 3.83 resources.
- `@ismail-elkorchi/textpack-fr-lexique-sa` — Generated source-backed, share-alike isolated French Lexique 3.83 lexicon, morphology, frequency, search, and quality resources.
- `@ismail-elkorchi/textpack-fr-morphology` — Generated policy-expanded French morphology wrapper over share-alike isolated Lexique and UniMorph components.
- `@ismail-elkorchi/textpack-fr-morphology-sa` — Generated share-alike isolated French morphology composite over Lexique 3.83 and UniMorph French resources.
- `@ismail-elkorchi/textpack-fr-normalization` — Generated source-backed French Unicode/CLDR normalization profile.
- `@ismail-elkorchi/textpack-fr-parallel` — Generated private artifact-backed French Tatoeba parallel descriptors; not task-supported until local alignment rows or an alignment index are materialized.
- `@ismail-elkorchi/textpack-fr-quality` — Generated private artifact-backed French quality wrapper; blocked until quality evidence covers materialized KB, corpus, and parallel payloads.
- `@ismail-elkorchi/textpack-fr-quality-sa` — Generated private artifact-backed French quality composite over share-alike components plus descriptor-only evidence.
- `@ismail-elkorchi/textpack-fr-sa` — Generated private artifact-backed French share-alike composite; blocked on local KB, corpus, parallel, and quality payloads.
- `@ismail-elkorchi/textpack-fr-search` — Generated policy-expanded French search wrapper over the share-alike isolated Lexique search component.
- `@ismail-elkorchi/textpack-fr-search-sa` — Generated share-alike isolated French search composite over Lexique 3.83 resources.
- `@ismail-elkorchi/textpack-fr-segmentation` — Generated source-backed French Unicode/CLDR segmentation profiles.
- `@ismail-elkorchi/textpack-fr-syntax` — Generated policy-expanded French syntax wrapper over the share-alike isolated UD GSD syntax graph.
- `@ismail-elkorchi/textpack-fr-syntax-sa` — Generated share-alike isolated French syntax composite over UD GSD resources.
- `@ismail-elkorchi/textpack-fr-syntax-ud-gsd-sa` — Generated source-backed, share-alike isolated French UD GSD syntax and tagging resources.
- `@ismail-elkorchi/textpack-fr-unimorph-sa` — Generated source-backed, share-alike isolated French UniMorph paradigm and lookup morphology resources.
- `@ismail-elkorchi/textpack-wordnet-ar` — Generated source-backed Arabic lexical-semantic resources from Arabic WordNet 4.1.0.
- `@ismail-elkorchi/textpack-wordnet-en` — Generated source-backed English lexical-semantic resources from Open English WordNet.
- `@ismail-elkorchi/textpack-foundation` — Generated source-backed foundation composite and language-support API.

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
- [`packages/textpacks/`](packages/textpacks/) — generated `textpack-*` foundation and task package outputs.
