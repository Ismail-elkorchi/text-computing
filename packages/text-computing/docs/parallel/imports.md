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
} from "@ismail-elkorchi/text-computing/parallel";
```

Focused subpaths are available for tree-shaped imports:

```ts
import { buildAlignmentLink } from "@ismail-elkorchi/text-computing/parallel/alignment";
import { alignSentences } from "@ismail-elkorchi/text-computing/parallel/sentence-align";
import { alignWords } from "@ismail-elkorchi/text-computing/parallel/word-align";
import { buildTranslationMemory } from "@ismail-elkorchi/text-computing/parallel/translation-memory";
```
