# @ismail-elkorchi/text-computing

Single-entrypoint SDK for Text Computing NLP workflows.

```ts
import { createNodeResourceReader, load } from "@ismail-elkorchi/text-computing/node";
import fr from "@ismail-elkorchi/textpack-fr";

const nlp = await load(fr, { reader: createNodeResourceReader() });
const doc = await nlp("L'Etat francais reconnait Paris.");

console.log(doc.tokens);
console.log(doc.searchTokens);
console.log(doc.evidence.map((item) => item.id));
```

`text-computing` is the developer-facing API package. `textpack-*` packages are data-only inputs, and expert users can still import lower-level runtime packages directly. Document analysis returns stable summaries plus evidence; use `doc.toTextDoc()` when you need the expert document object. Use the `/node` entrypoint for package-local files in Node. Browser, Worker, Deno, and Bun deployments can import the root entrypoint and use `createFetchResourceReader()` with served package assets.

The default `core` preset runs segmentation, normalization, and search analysis.
Expensive resource lookups are explicit:

```ts
const lookupDoc = await nlp("Les enfants jouent.", { preset: "lookup" });
const fullDoc = await nlp("Paris est en France.", { preset: "full" });

for (const token of lookupDoc.tokens) {
  console.log(token.text, token.normalizedText, token.lemmas, token.morphology);
}
```

- `core` — segmentation, normalization, and search analysis.
- `lookup` — `core` plus lexicon and morphology lookup.
- `full` — `lookup` plus entity linking and document quality analysis.

Passing `tasks` selects an explicit task set instead of a preset; segmentation and normalization
remain foundational. Token, lemma, and morphology results are also written to
`token.text-computing`, `lemma.text-computing`, and `morph.text-computing` layers in the returned
`TextDocument`.

Raw token spans and IDs stay stable when lookup uses a normalized form. Lemma and morphology
summaries expose `queryForm`, and search token offsets identify their normalized text view through
`viewId`.

Search indexes are persistent values: create one, add documents or analyses, and keep the returned
index before querying it.

```ts
const empty = await nlp.search.createIndex();
const index = nlp.search.addAnalysis(empty, fullDoc);
const hits = nlp.search.query(index, "paris");
```

`nlp.support()` reports each slot's availability `status` separately from its linguistic `tier`.
Use the tier when choosing between a surface baseline, finite lookup, language-specific rules,
contextual inference, and evaluated model-backed inference; resource volume alone never raises it.
Every `task-slot` item in `doc.evidence` repeats both fields so serialized analysis results retain
the exact capability claim under which they were produced.
