# Bilingual Terms

`extractBilingualTerms` projects contiguous source n-grams onto aligned target spans and ranks the
resulting phrase pairs with Dice association, occurrence count, and document support.

```ts
import { extractBilingualTerms } from "@ismail-elkorchi/textparallel/bilingual-terms";

const terms = extractBilingualTerms(corpus, { minCount: 1 });
```

Stoplists from `textlex` may be supplied to remove function-word-only candidates.
`maxTermTokens` bounds source and target phrase length and defaults to three.
