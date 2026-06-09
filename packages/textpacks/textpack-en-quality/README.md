# @ismail-elkorchi/textpack-en-quality

Generated EnglishQuality recipe composite textpack.

```ts
import { loadEnglishQuality } from "@ismail-elkorchi/textpack-en-quality";

const pack = await loadEnglishQuality();
```

## Required Components

- `@ismail-elkorchi/textpack-en-core`
- `@ismail-elkorchi/textpack-en-normalization`
- `@ismail-elkorchi/textpack-en-segmentation`
- `@ismail-elkorchi/textpack-en-wordlist-esdb`
- `@ismail-elkorchi/textpack-en-inflection-scowl`
- `@ismail-elkorchi/textpack-en-syntax-ud-gumreddit`
- `@ismail-elkorchi/textpack-wordnet-en`
- `@ismail-elkorchi/textpack-wikidata-en`
- `@ismail-elkorchi/textpack-en-corpus`
- `@ismail-elkorchi/textpack-en-parallel`

## Optional Components

- None


## Publishability

Publishable: `false`
Status: `blocked`

- artifact-backed descriptors require local materialized payloads before publishability
- capability slot quality is artifact-backed without local task-usable payloads
- generated packs are non-publishable by default

