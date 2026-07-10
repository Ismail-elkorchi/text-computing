# @ismail-elkorchi/text-computing

Single-entrypoint SDK for Text Computing NLP workflows.

```ts
import { createNodeResourceReader, load } from "@ismail-elkorchi/text-computing/node";
import fr from "@ismail-elkorchi/textpack-fr";

const nlp = await load(fr, { reader: createNodeResourceReader() });
const doc = await nlp("L'Etat francais reconnait Paris.");

console.log(doc.tokens);
console.log(doc.lemmas);
console.log(doc.quality.findingCount);
console.log(doc.evidence.map((item) => item.id));
```

`text-computing` is the developer-facing API package. `textpack-*` packages are data-only inputs, and expert users can still import lower-level runtime packages directly. Document analysis returns stable summaries plus evidence; use `doc.toTextDoc()` when you need the expert document object. Use the `/node` entrypoint for package-local files in Node. Browser, Worker, Deno, and Bun deployments can import the root entrypoint and use `createFetchResourceReader()` with served package assets.
