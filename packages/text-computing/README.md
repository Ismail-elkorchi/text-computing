# @ismail-elkorchi/text-computing

Single-entrypoint SDK for Text Computing NLP workflows.

```ts
import { createFetchResourceReader, load } from "@ismail-elkorchi/text-computing";
import fr from "@ismail-elkorchi/textpack-fr";

const nlp = await load(fr, { reader: createFetchResourceReader() });
const doc = await nlp("L'Etat francais reconnait Paris.");

console.log(doc.tokens);
console.log(doc.lemmas);
console.log(doc.quality.findingCount);
console.log(doc.evidence.map((item) => item.id));
```

`text-computing` is the developer-facing API package. `textpack-*` packages are data-only inputs, and expert users can still import lower-level runtime packages directly. Document analysis returns stable summaries plus evidence; use `doc.toTextDoc()` when you need the expert document object. Generated file-backed resources are materialized through an explicit resource reader; the default portable reader uses `fetch`, so browser, Worker, Deno, and Bun deployments can serve resource files without Node-only APIs in the SDK.
