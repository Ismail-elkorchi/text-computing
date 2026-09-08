# Translation Memory

Translation memories are built from final `ParallelDocument` values.

```ts
import {
	buildTranslationMemory,
	searchTranslationMemory,
} from "@ismail-elkorchi/text-computing/parallel/translation-memory";

const tm = buildTranslationMemory([parallelDoc], { id: "tm-en-fr" });
const hits = searchTranslationMemory(tm, "hello world");
```

Rows keep source and target document ids, source and target text, final evidence, relation data, and JSON-safe metadata.
