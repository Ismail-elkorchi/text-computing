# @ismail-elkorchi/textpack-en-corpus

Generated corpus textpack.

This package is a generated data package. It exports structural textpack data only.
Use `@ismail-elkorchi/text-computing` for developer-facing NLP task APIs.
It is generated from pinned source snapshots by `tools/textpack-forge`.

```ts
import pack, { manifest, resources } from "@ismail-elkorchi/textpack-en-corpus";

console.log(manifest.packageName);
console.log(Object.keys(resources).length);
console.log(pack.manifest.resources.length);
```

## Resources

- `en-tatoeba-corpus-sentences` (corpus, text/tab-separated-values)
- `en-tatoeba-corpus-canonical` (corpus, json)
- `en-tatoeba-corpus-quality` (quality-profile, json)
- `en-tatoeba-corpus-quality-profile` (quality-profile, json)

## Publishability

Publishable: `true`
Status: `publishable`

- None

