# @ismail-elkorchi/textpack-ar-sa

Generated ArabicShareAlike recipe composite textpack.

```ts
import { loadArabicShareAlike } from "@ismail-elkorchi/textpack-ar-sa";

const pack = await loadArabicShareAlike();
```

## Required Components

- `@ismail-elkorchi/textpack-foundation`
- `@ismail-elkorchi/textpack-ar-core`
- `@ismail-elkorchi/textpack-ar-normalization`
- `@ismail-elkorchi/textpack-ar-segmentation`
- `@ismail-elkorchi/textpack-ar-lexicon`
- `@ismail-elkorchi/textpack-ar-morphology`
- `@ismail-elkorchi/textpack-ar-syntax-sa`
- `@ismail-elkorchi/textpack-ar-kb`
- `@ismail-elkorchi/textpack-ar-search`
- `@ismail-elkorchi/textpack-ar-corpus`
- `@ismail-elkorchi/textpack-ar-parallel`
- `@ismail-elkorchi/textpack-ar-quality-sa`

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

