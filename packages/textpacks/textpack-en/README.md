# @ismail-elkorchi/textpack-en

Generated English recipe composite textpack.

```ts
import { loadEnglish } from "@ismail-elkorchi/textpack-en";

const pack = await loadEnglish();
```

## Required Components

- `@ismail-elkorchi/textpack-foundation`
- `@ismail-elkorchi/textpack-en-core`
- `@ismail-elkorchi/textpack-en-normalization`
- `@ismail-elkorchi/textpack-en-segmentation`
- `@ismail-elkorchi/textpack-en-lexicon`
- `@ismail-elkorchi/textpack-en-morphology`
- `@ismail-elkorchi/textpack-en-syntax`
- `@ismail-elkorchi/textpack-en-kb`
- `@ismail-elkorchi/textpack-en-search`
- `@ismail-elkorchi/textpack-en-corpus`
- `@ismail-elkorchi/textpack-en-parallel`
- `@ismail-elkorchi/textpack-en-quality`

## Optional Components

- None


## Publishability

Publishable: `false`
Status: `blocked`

- artifact-backed descriptors require local materialized payloads before publishability
- capability slot corpus is artifact-backed without local task-usable payloads
- capability slot kb is artifact-backed without local task-usable payloads
- capability slot parallel is artifact-backed without local task-usable payloads
- capability slot quality is artifact-backed without local task-usable payloads
- generated packs are non-publishable by default

