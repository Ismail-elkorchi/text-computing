# @ismail-elkorchi/textpack-ar

Generated Arabic recipe composite textpack.

```ts
import { loadArabic } from "@ismail-elkorchi/textpack-ar";

const pack = await loadArabic();
```

## Required Components

- `@ismail-elkorchi/textpack-foundation`
- `@ismail-elkorchi/textpack-ar-core`
- `@ismail-elkorchi/textpack-ar-normalization`
- `@ismail-elkorchi/textpack-ar-segmentation`
- `@ismail-elkorchi/textpack-ar-lexicon`
- `@ismail-elkorchi/textpack-ar-morphology`
- `@ismail-elkorchi/textpack-ar-syntax`
- `@ismail-elkorchi/textpack-ar-kb`
- `@ismail-elkorchi/textpack-ar-search`
- `@ismail-elkorchi/textpack-ar-corpus`
- `@ismail-elkorchi/textpack-ar-parallel`
- `@ismail-elkorchi/textpack-ar-quality`

## Optional Components

- None

## Policy Surface

This package is a policy-expanded wrapper. It contains no direct resource payloads, but it requires isolated component packages with non-default license policy. The manifest dependency graph and generated reports preserve the component package names, license policies, and full license expression.


## Publishability

Publishable: `false`
Status: `blocked`

- artifact-backed descriptors require local materialized payloads before publishability
- capability slot corpus is artifact-backed without local task-usable payloads
- capability slot kb is artifact-backed without local task-usable payloads
- capability slot parallel is artifact-backed without local task-usable payloads
- capability slot quality is artifact-backed without local task-usable payloads
- generated packs are non-publishable by default

