# Sentence Alignment

`alignSentences` aligns sentence spans from existing layers or deterministic `textfacts` segmentation.

```ts
import { createDocument } from "@ismail-elkorchi/textdoc";
import { alignSentences } from "@ismail-elkorchi/textparallel/sentence-align";

const source = createDocument("Hello world. Good day.", { id: "en" });
const target = createDocument("Bonjour monde. Bon jour.", { id: "fr" });
const links = alignSentences(source, target);
```

Caller-provided anchors and sentence-alignment models can be passed as explicit options. The package does not discover resources.
