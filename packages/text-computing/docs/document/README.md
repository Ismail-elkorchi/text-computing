# `@ismail-elkorchi/text-computing/document`

Canonical documents, views, spans, layers, annotations, graphs, and evidence for Text Computing.

This is a public module of Text Computing. It can be used directly, without a Capability Pack.

## Install

```sh
npm install @ismail-elkorchi/text-computing
```

## Imports

```ts
import {
  addAnnotation,
  addLayer,
  createDocument,
  selectAnnotations,
  toDocumentJson,
} from "@ismail-elkorchi/text-computing/document";
```

Focused entrypoints are also available:

- `@ismail-elkorchi/text-computing/document/document`
- `@ismail-elkorchi/text-computing/document/view`
- `@ismail-elkorchi/text-computing/document/span`
- `@ismail-elkorchi/text-computing/document/layer`
- `@ismail-elkorchi/text-computing/document/annotation`
- `@ismail-elkorchi/text-computing/document/graph`
- `@ismail-elkorchi/text-computing/document/query`
- `@ismail-elkorchi/text-computing/document/selection`
- `@ismail-elkorchi/text-computing/document/serialize`

## Create A Document

```ts
import { createDocument } from "@ismail-elkorchi/text-computing/document";

const doc = createDocument("Alice sees Bob.", {
  id: "doc:example",
  sourceId: "source:example",
  metadata: { language: "en" },
});
```

`createDocument` creates the source record and raw view only. It does not create token or sentence annotations.

## Add Annotations

```ts
import { addAnnotation, addLayer, createDocument } from "@ismail-elkorchi/text-computing/document";

const doc = addAnnotation(
  addLayer(createDocument("Alice"), {
    id: "tokens",
    type: "token.word",
    viewId: "raw",
    annotations: {},
  }),
  {
    id: "token:1",
    layer: "tokens",
    type: "token.word",
    spans: [{ viewId: "raw", span: { start: 0, end: 5, unit: "utf16-code-unit" } }],
    value: { index: 0, text: "Alice" },
    evidence: {
      mode: "algorithm",
      exactness: "E1",
      producer: "example",
      packageName: "example-package",
      packageVersion: "1.0.0",
      inputViewIds: ["raw"],
    },
  },
);
```

Annotations are generic records with typed values, features, evidence, and alternatives. Task packages decide annotation correctness; `/document` stores and queries the result.

## Stable JSON

```ts
import { fromDocumentJson, toDocumentJson } from "@ismail-elkorchi/text-computing/document";

const json = toDocumentJson(doc);
const roundTrip = fromDocumentJson(json);
```

JSON output is I-JSON safe and record keys are ordered deterministically by default.
