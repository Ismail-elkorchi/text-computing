# `@ismail-elkorchi/textdoc`

Document, view, span, layer, annotation, graph, and evidence substrate for the text-computing runtime packages.

This is an expert engine module. Applications should use `@ismail-elkorchi/text-computing` with generated Capability Packs.

## Install

```sh
npm install @ismail-elkorchi/textdoc
```

## Imports

```ts
import {
  addAnnotation,
  addLayer,
  createDocument,
  selectAnnotations,
  toTextDocJson,
} from "@ismail-elkorchi/textdoc";
```

Focused entrypoints are also available:

- `@ismail-elkorchi/textdoc/document`
- `@ismail-elkorchi/textdoc/view`
- `@ismail-elkorchi/textdoc/span`
- `@ismail-elkorchi/textdoc/layer`
- `@ismail-elkorchi/textdoc/annotation`
- `@ismail-elkorchi/textdoc/graph`
- `@ismail-elkorchi/textdoc/query`
- `@ismail-elkorchi/textdoc/selection`
- `@ismail-elkorchi/textdoc/serialize`

## Create A Document

```ts
import { createDocument } from "@ismail-elkorchi/textdoc";

const doc = createDocument("Alice sees Bob.", {
  id: "doc:example",
  sourceId: "source:example",
  metadata: { language: "en" },
});
```

`createDocument` creates the source record and raw view only. It does not create token or sentence annotations.

## Add Annotations

```ts
import { addAnnotation, addLayer, createDocument } from "@ismail-elkorchi/textdoc";

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

Annotations are generic records with typed values, features, evidence, and alternatives. Task packages decide annotation correctness; `textdoc` stores and queries the result.

## Stable JSON

```ts
import { fromTextDocJson, toTextDocJson } from "@ismail-elkorchi/textdoc";

const json = toTextDocJson(doc);
const roundTrip = fromTextDocJson(json);
```

JSON output is I-JSON safe and record keys are ordered deterministically by default.
