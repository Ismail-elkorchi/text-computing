# Word Alignment

`alignWords` aligns token spans from token layers or deterministic word segmentation.

```ts
import { alignWords } from "@ismail-elkorchi/textparallel/word-align";

const links = alignWords(sourceDoc, targetDoc, {
	dictionaries: [{ source: "Hello", target: "Bonjour", weight: 1 }],
});
```

Dictionary entries, lexicons, FSTs, and trained word-alignment models are caller-provided resources. Null links are explicit inserted or deleted links.
