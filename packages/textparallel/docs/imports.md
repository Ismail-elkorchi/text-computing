# Imports

The root import exposes the complete final public API:

```ts
import {
	alignSentences,
	alignWords,
	buildTranslationMemory,
	createParallelCorpus,
	createParallelDocument,
	searchTranslationMemory,
	shallowTransfer,
} from "@ismail-elkorchi/textparallel";
```

Focused subpaths are available for tree-shaped imports:

```ts
import { buildAlignmentLink } from "@ismail-elkorchi/textparallel/alignment";
import { alignSentences } from "@ismail-elkorchi/textparallel/sentence-align";
import { alignWords } from "@ismail-elkorchi/textparallel/word-align";
import { buildTranslationMemory } from "@ismail-elkorchi/textparallel/translation-memory";
```
