# @ismail-elkorchi/textpack-en-core

Generated language-concrete textpack.

This package is a generated data package. It exports structural textpack data only.
Use `@ismail-elkorchi/text-computing` for developer-facing NLP task APIs.
It is generated from pinned source snapshots by `tools/textpack-forge`.

```ts
import pack, { manifest, resources } from "@ismail-elkorchi/textpack-en-core";

console.log(manifest.packageName);
console.log(Object.keys(resources).length);
console.log(pack.manifest.resources.length);
```

## Resources

- `en-core-language-profile` (locale-profile, json)
- `en-core-orthography` (locale-profile, tsv)
- `en-core-punctuation` (locale-profile, tsv)
- `en-core-abbreviations` (abbreviation-table, tsv)
- `en-core-function-words` (stoplist, tsv)
- `en-core-basic-segmentation` (segmentation-profile, json)
- `en-core-quality` (quality-profile, json)
- `en-core-quality-profile` (quality-profile, json)

## Publishability

Publishable: `true`
Status: `publishable`

- None

