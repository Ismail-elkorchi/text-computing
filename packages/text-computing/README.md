# @ismail-elkorchi/text-computing

Application-facing TypeScript runtime for deployable, inspectable NLP
workflows.

```ts
import { createNodeResourceReader, load } from "@ismail-elkorchi/text-computing/node";
import fr from "@ismail-elkorchi/textpack-fr";

const nlp = await load(fr, { reader: createNodeResourceReader() });
const doc = await nlp("L'Etat francais reconnait Paris.");

console.log(doc.tokens);
console.log(doc.searchTokens);
console.log(doc.evidence.map((item) => item.id));
```

This package is the Text Computing product surface. Capability Packs are
data-only inputs; they declare resources and artifacts semantically instead of
depending on the repository package that implements an executor. Document
analysis returns stable summaries plus evidence; use `doc.toTextDoc()` when you
need the expert document object. Use the `/node` entrypoint for package-local
files in Node. Browser, Worker, Deno, and Bun deployments can import the root
entrypoint and use `createFetchResourceReader()` with served pack assets.

The default `core` preset runs segmentation, normalization, and search analysis.
The only broader preset is `lookup`:

```ts
const lookupDoc = await nlp("Les enfants jouent.", { preset: "lookup" });

for (const token of lookupDoc.tokens) {
  console.log(token.text, token.normalizedText, token.lemmas, token.morphology);
}
```

- `core` — segmentation, normalization, and search analysis.
- `lookup` — `core` plus lexicon and morphology lookup.

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
const index = nlp.search.addAnalysis(empty, lookupDoc);
const hits = nlp.search.query(index, "paris");
```

Entity linking consumes explicit mention spans or existing `entity.*`
annotations. Document analysis deliberately does not treat every KB alias as a
named entity:

```ts
import { createDocument } from "@ismail-elkorchi/textdoc";

const source = createDocument("Paris est en France.");
const linked = await nlp.document.analyzeDocument(source, {
  tasks: ["kb"],
  entityLinking: {
    mentionSpans: [
      {
        viewId: "raw",
        span: { start: 0, end: 5, unit: "utf16-code-unit" },
      },
    ],
  },
});
```

Quality analysis is likewise explicit with `tasks: ["quality"]`. Corpus,
parallel-text, syntax-dataset, and pipeline orchestration remain expert
extension APIs rather than ordinary application workflows.

The currently shipped Capability Packs and executors are suitable for controlled
deterministic workflows; they do not yet provide contextual NER, POS tagging,
parsing, or neural inference. This is a statement about current capabilities,
not an architectural exclusion. Model-backed capabilities may originate in any
toolchain, but they become runnable only with a compatible TypeScript executor,
artifact identity, and held-out task evidence. See the repository's
[evaluation report](../../docs/evaluation.md) before choosing a production
workload.

`nlp.support()` reports each slot's availability `status` separately from its linguistic `tier`.
Use the tier when choosing between a surface baseline, finite lookup, language-specific rules,
contextual inference, and evaluated model-backed inference; resource volume alone never raises it.
Every `task-slot` item in `doc.evidence` repeats both fields so serialized analysis results retain
the exact capability claim under which they were produced.
