# @ismail-elkorchi/textpack-en

Generated self-contained English language textpack.

This package is a generated data package. It exports structural textpack data only.
Use `@ismail-elkorchi/text-computing` for developer-facing NLP task APIs.
It is generated from pinned source snapshots by `tools/textpack-forge`.
All resources are included directly; installing this package does not install component textpacks.


```ts
import pack, { manifest, resources } from "@ismail-elkorchi/textpack-en";

console.log(manifest.packageName);
console.log(Object.keys(resources).length);
console.log(pack.manifest.resources.length);
```

## Resources

- `bcp47-language-subtags` (language-registry, tsv)
- `bcp47-language-registry-summary` (language-registry, json)
- `unicode-17-blocks` (unicode-profile, tsv)
- `unicode-17-property-value-aliases` (unicode-profile, tsv)
- `unicode-17-scripts` (unicode-profile, tsv)
- `unicode-17-core-summary` (unicode-profile, json)
- `cldr-48-likely-subtags` (locale-profile, tsv)
- `cldr-48-locale-aliases` (locale-profile, tsv)
- `cldr-48-script-data` (locale-profile, tsv)
- `cldr-48-core-summary` (locale-profile, json)
- `en-core-language-profile` (locale-profile, json)
- `en-core-orthography` (locale-profile, tsv)
- `en-core-punctuation` (locale-profile, tsv)
- `en-core-abbreviations` (abbreviation-table, tsv)
- `en-core-function-words` (stoplist, tsv)
- `en-core-basic-segmentation` (segmentation-profile, json)
- `en-core-quality` (quality-profile, json)
- `en-core-quality-profile` (quality-profile, json)
- `en-normalization-rules` (normalization-profile, tsv)
- `en-normalization-profile` (normalization-profile, json)
- `en-normalization-quality` (quality-profile, json)
- `en-normalization-quality-profile` (quality-profile, json)
- `en-segmentation-boundary-properties` (segmentation-profile, tsv)
- `en-grapheme-segmentation-profile` (segmentation-profile, json)
- `en-word-segmentation-profile` (segmentation-profile, json)
- `en-sentence-segmentation-profile` (segmentation-profile, json)
- `en-segmentation-quality` (quality-profile, json)
- `en-segmentation-quality-profile` (quality-profile, json)
- `en-esdb-default-wordlists` (lexicon, tsv+gzip+base64)
- `en-esdb-default-profiles` (lexicon, tsv)
- `en-esdb-wordlist-lexicon-canonical` (lexicon, json)
- `en-esdb-wordlist-search-profile` (search-profile, json)
- `en-esdb-wordlist-quality` (quality-profile, json)
- `en-esdb-wordlist-quality-profile` (quality-profile, json)
- `en-scowl-inflection-entries` (morphology, tsv+gzip+base64)
- `en-scowl-pos-inventory` (morphology, tsv)
- `en-scowl-lookup-analyzer` (morphology, tsv+gzip+base64)
- `en-scowl-lookup-generator` (morphology, tsv+gzip+base64)
- `en-scowl-inflection-lexicon-canonical` (lexicon, json)
- `en-scowl-inflection-morphology-canonical` (morphology, json)
- `en-scowl-inflection-quality` (quality-profile, json)
- `en-scowl-inflection-quality-profile` (quality-profile, json)
- `wordnet-en-lexical-entries` (lexicon, tsv)
- `wordnet-en-senses` (knowledge-base, tsv)
- `wordnet-en-synsets` (knowledge-base, tsv)
- `wordnet-en-relations` (knowledge-base, tsv)
- `wordnet-en-quality` (quality-profile, json)
- `wordnet-en-lexicon-canonical` (lexicon, json)
- `wordnet-en-kb-canonical` (knowledge-base, json)
- `wordnet-en-quality-profile` (quality-profile, json)
- `wikidata-en-entities` (knowledge-base, text/tab-separated-values)
- `wikidata-en-aliases` (knowledge-base, text/tab-separated-values)
- `wikidata-en-relations` (knowledge-base, text/tab-separated-values)
- `wikidata-en-kb-canonical` (knowledge-base, json)
- `wikidata-en-quality` (quality-profile, json)
- `wikidata-en-quality-profile` (quality-profile, json)

## Publishability

Publishable: `true`
Status: `publishable`

- None

