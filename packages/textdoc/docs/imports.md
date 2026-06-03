# Imports

The root entrypoint exports the final public API:

```ts
import { createDocument, addAnnotation, selectAnnotations } from "@ismail-elkorchi/textdoc";
```

Use subpaths when a package wants a narrower dependency:

```ts
import { createDocument } from "@ismail-elkorchi/textdoc/document";
import { mapSpan } from "@ismail-elkorchi/textdoc/span";
import { toTextDocJson } from "@ismail-elkorchi/textdoc/serialize";
```
