# Imports

The root entrypoint exports the final public API:

```ts
import { createDocument, addAnnotation, selectAnnotations } from "@ismail-elkorchi/text-computing/document";
```

Use subpaths when a package wants a narrower dependency:

```ts
import { createDocument } from "@ismail-elkorchi/text-computing/document/document";
import { mapSpan } from "@ismail-elkorchi/text-computing/document/span";
import { toDocumentJson } from "@ismail-elkorchi/text-computing/document/serialize";
```
