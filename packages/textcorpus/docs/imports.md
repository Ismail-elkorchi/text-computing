# Imports

Use the root entrypoint for common APIs:

```ts
import { createCorpus, corpusQuery, concordance } from "@ismail-elkorchi/textcorpus";
```

Use subpaths for focused tree-shakable imports:

```ts
import { keyness } from "@ismail-elkorchi/textcorpus/keyness";
import { extractTerms } from "@ismail-elkorchi/textcorpus/terms";
```
