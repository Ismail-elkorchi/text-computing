# Bilingual Lexicon

`induceBilingualLexicon` ranks candidate word pairs from aligned documents and optional dictionary/FST hints.

```ts
import { induceBilingualLexicon } from "@ismail-elkorchi/textparallel/bilingual-lexicon";

const candidates = induceBilingualLexicon(corpus, {
	dictionaries: [{ source: "world", target: "monde" }],
});
```

Candidate scores are finite association scores and all features are JSON-safe.
