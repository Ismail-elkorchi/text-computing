# Imports

Use the root entrypoint for common APIs:

```ts
import { createAnalyzer, createIndex, addToIndex, search } from "@ismail-elkorchi/text-computing/search";
```

Use focused subpaths for tree-shakable imports:

```ts
import { createAnalyzer } from "@ismail-elkorchi/text-computing/search/analyzer";
import { createIndex, termVector } from "@ismail-elkorchi/text-computing/search/index";
import { termQuery } from "@ismail-elkorchi/text-computing/search/query";
import { scoreBm25 } from "@ismail-elkorchi/text-computing/search/rank";
import { metadataFilter } from "@ismail-elkorchi/text-computing/search/filter";
import { facet } from "@ismail-elkorchi/text-computing/search/facet";
import { highlight } from "@ismail-elkorchi/text-computing/search/highlight";
import { parseCql } from "@ismail-elkorchi/text-computing/search/cql";
import { suggest } from "@ismail-elkorchi/text-computing/search/suggest";
```
