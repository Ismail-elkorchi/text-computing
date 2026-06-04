# Imports

Use the root entrypoint for common APIs:

```ts
import { createAnalyzer, createIndex, addToIndex, search } from "@ismail-elkorchi/textsearch";
```

Use focused subpaths for tree-shakable imports:

```ts
import { createAnalyzer } from "@ismail-elkorchi/textsearch/analyzer";
import { createIndex, termVector } from "@ismail-elkorchi/textsearch/index";
import { termQuery } from "@ismail-elkorchi/textsearch/query";
import { scoreBm25 } from "@ismail-elkorchi/textsearch/rank";
import { metadataFilter } from "@ismail-elkorchi/textsearch/filter";
import { facet } from "@ismail-elkorchi/textsearch/facet";
import { highlight } from "@ismail-elkorchi/textsearch/highlight";
import { parseCql } from "@ismail-elkorchi/textsearch/cql";
import { suggest } from "@ismail-elkorchi/textsearch/suggest";
```
