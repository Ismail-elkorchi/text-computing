# Parallel Corpus

`ParallelDocument` pairs final source and target documents with sorted alignment links. `ParallelCorpus` groups document pairs and computes lightweight relation counts.

```ts
import {
	createParallelCorpus,
	createParallelDocument,
} from "@ismail-elkorchi/textparallel/parallel-corpus";

const pair = createParallelDocument(sourceDoc, targetDoc, { links });
const corpus = createParallelCorpus([pair], {
	sourceLanguage: "en",
	targetLanguage: "fr",
});
```

Use `parallelDocumentsFromRecords` for structural `textdata` parallel records. File reading remains owned by `textdata`.
