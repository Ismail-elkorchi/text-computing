# @ismail-elkorchi/textpack-fr-lexique-sa

Generated language-concrete textpack.

This package is a generated data package. It exports structural textpack data only.
Use `@ismail-elkorchi/text-computing` for developer-facing NLP task APIs.
It is generated from pinned source snapshots by `tools/textpack-forge`.

```ts
import pack, { manifest, resources } from "@ismail-elkorchi/textpack-fr-lexique-sa";

console.log(manifest.packageName);
console.log(Object.keys(resources).length);
console.log(pack.manifest.resources.length);
```

## Resources

- `fr-lexique-entries` (lexicon, tsv+gzip+base64)
- `fr-lexique-lemmas` (lexicon, tsv+gzip+base64)
- `fr-lexique-pos-inventory` (morphology, tsv)
- `fr-lexique-lexicon-canonical` (lexicon, json)
- `fr-lexique-morphology-canonical` (morphology, json)
- `fr-lexique-search-profile` (search-profile, json)
- `fr-lexique-search-elision-prefixes` (search-profile, tsv)
- `fr-lexique-search-contraction-forms` (search-profile, tsv)
- `fr-lexique-search-gold-cases` (quality-profile, json)
- `fr-lexique-quality` (quality-profile, json)
- `fr-lexique-quality-profile` (quality-profile, json)

## Publishability

Publishable: `true`
Status: `publishable`

- None

