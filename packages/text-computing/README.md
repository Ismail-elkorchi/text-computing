# @ismail-elkorchi/text-computing

A modular TypeScript library for processing, analyzing, transforming,
searching, and learning from text. Direct algorithms, local classical learning,
and resource-backed analysis are equally supported. See the
[module guide](../../docs/modules.md) for the full library.

```ts
import { createNodeResourceReader, load } from "@ismail-elkorchi/text-computing/node";
import fr from "@ismail-elkorchi/textpack-fr";

const nlp = await load(fr, { reader: createNodeResourceReader() });
const doc = await nlp("L'Etat francais reconnait Paris.");

console.log(doc.tokens);
console.log(doc.searchTokens);
console.log(doc.evidence.map((item) => item.id));
```

This package owns all Text Computing runtime implementations. Capability Packs are
data-only inputs; they declare resources and artifacts semantically instead of
depending on the repository package that implements an executor. Document
analysis returns the canonical `TextDocument`, with typed convenience projections.
Use it directly with corpus, search, rules, and pipeline modules. Serialize it
with `toDocumentJson(doc)` or `JSON.stringify(doc)`; use `analysisOf(doc)` to
read a fresh projection after deserialization or downstream transformations.
Use the `/node` entrypoint for package-local
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
const index = nlp.search.addDocument(empty, lookupDoc);
const hits = nlp.search.query(index, "paris");
```

Entity linking consumes explicit mention spans or existing `entity.*`
annotations. Document analysis deliberately does not treat every KB alias as a
named entity:

```ts
import { createDocument } from "@ismail-elkorchi/text-computing/document";

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

The Arabic Capability Pack declares model-backed named entity recognition. The
178 MB ONNX artifact is deliberately not part of the npm package: download or
provision the pinned file, then supply both its location and the executor
explicitly.

```ts
import ar from "@ismail-elkorchi/textpack-ar";
import {
  createNodeArtifactReader,
  createNodeResourceReader,
  load,
} from "@ismail-elkorchi/text-computing/node";
import { createNodeOnnxEntityExecutor } from "@ismail-elkorchi/text-computing/onnx/node";

const artifactId =
  "artifact:text-computing:ner:bert-multilingual-cased-hrl:quantized";
const nlp = await load(ar, {
  reader: createNodeResourceReader(),
  artifactReader: createNodeArtifactReader({
    paths: { [artifactId]: "/models/model_quantized.onnx" },
  }),
  entityExecutor: createNodeOnnxEntityExecutor(),
});

const doc = await nlp("زار محمد القاهرة.", { tasks: ["entities"] });
console.log(doc.entities);
console.log(doc.evidence);
```

The pinned AQMAR gate measures exact PER, ORG, and LOC spans on 100 held-out
Arabic Wikipedia examples: precision 0.505263, recall 0.533333, and F1
0.518919. This establishes a real executable slice, not broad domain or
dialectal fitness.

Quality analysis is explicit with `tasks: ["quality"]`. Corpus analysis,
parallel text, dataset conversion, pipelines, and classical training are
ordinary public modules and do not require a Capability Pack.

The currently shipped Capability Packs and executors are suitable for controlled
workflows. Arabic NER is the first evaluated neural path; pretrained POS and parsing
resources, general coreference, embeddings, and broader model coverage remain
unavailable. The `/learning` module already implements trainable classical
sequence models and a projective dependency parser. Model-backed
capabilities may originate in any toolchain, but they become runnable only with
a compatible TypeScript executor, artifact identity, and held-out task evidence.
See the repository's
[evaluation report](../../docs/evaluation.md) before choosing a production
workload.

`nlp.support()` reports each slot's availability `status` separately from its linguistic `tier`.
Use the tier when choosing between a surface baseline, finite lookup, language-specific rules,
contextual inference, and evaluated model-backed inference; resource volume alone never raises it.
Every `task-slot` item in `doc.evidence` repeats both fields so serialized analysis results retain
the exact capability claim under which they were produced.
