# Imports

Use the root entrypoint for common APIs:

```ts
import { createCorpus, corpusQuery, concordance } from "@ismail-elkorchi/text-computing/corpus";
```

Use subpaths for focused tree-shakable imports:

```ts
import { keyness } from "@ismail-elkorchi/text-computing/corpus/keyness";
import { extractTerms } from "@ismail-elkorchi/text-computing/corpus/terms";
```
