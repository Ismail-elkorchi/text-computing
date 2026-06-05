# Bilingual Terms

`extractBilingualTerms` counts aligned span pairs across a `ParallelCorpus`.

```ts
import { extractBilingualTerms } from "@ismail-elkorchi/textparallel/bilingual-terms";

const terms = extractBilingualTerms(corpus, { minCount: 1 });
```

Stoplists from `textlex` may be supplied to remove function-word-only candidates.
