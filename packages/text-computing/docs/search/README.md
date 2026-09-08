# `@ismail-elkorchi/text-computing/search`

engine for analyzers, in-memory lexical indexes, structured queries,
ranking, filters, facets, highlights, suggestions, CQL parsing, and
explanations.

This is a public module of Text Computing. It can be used directly, without a Capability Pack.

## Install

```sh
npm install @ismail-elkorchi/text-computing
```

## Imports

```ts
import { createAnalyzer, createIndex, addToIndex, search } from "@ismail-elkorchi/text-computing/search";
import { parseCql } from "@ismail-elkorchi/text-computing/search/cql";
import { suggest } from "@ismail-elkorchi/text-computing/search/suggest";
```

Required subpaths are `/analyzer`, `/index`, `/query`, `/rank`, `/filter`, `/facet`, `/highlight`, `/suggest`, and `/cql`.

## Scope

`/search` works over caller-provided strings, final `TextDocument` values, and already loaded lexical resources. It preserves source documents and annotation evidence, uses UTF-16 offsets for match spans and highlights, and rejects non-JSON-safe metadata or payload values.

It does not read datasets, discover resource packages, persist filesystem indexes, perform entity linking, produce quality findings, run pipelines, train models, or provide neural/vector search.

## Example

```ts
const analyzer = createAnalyzer([
  { kind: "tokenizer", mode: "unicode-word" },
  { kind: "normalizer", form: "nfkc-casefold" },
]);

let index = createIndex({
  fields: {
    body: { source: { kind: "view", viewId: "raw" }, analyzer, highlight: true },
    domain: { source: { kind: "metadata", key: "domain" }, facetable: true },
  },
});

for (const doc of documents) index = addToIndex(index, doc);

const query = parseCql('body:contract AND "legal contract"');
const results = search(index, query, {
  ranking: { kind: "bm25" },
  facets: [{ metadataKey: "domain" }],
  highlight: true,
});
```

See the `docs/` folder for package-specific usage notes.
