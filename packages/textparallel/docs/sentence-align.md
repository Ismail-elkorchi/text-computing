# Sentence Alignment

`alignSentences` aligns sentence spans from existing layers or deterministic `textfacts` segmentation.

```ts
import { createDocument } from "@ismail-elkorchi/textdoc";
import { alignSentences } from "@ismail-elkorchi/textparallel/sentence-align";

const source = createDocument("Hello world. Good day.", { id: "en" });
const target = createDocument("Bonjour monde. Bon jour.", { id: "fr" });
const links = alignSentences(source, target);
```

Alignment uses dynamic programming over 1:1, insertion, deletion, 1:2, and 2:1 transitions. Length
scores use the trained model's target/source length ratio, while `lengthWeight` and `lexicalWeight`
control the objective. Caller-provided anchors are fixed monotonic constraints rather than extra
links appended after alignment. The package does not discover resources.
