# Public modules and capability inventory

Install `@ismail-elkorchi/text-computing`. Every entry below is a public module
of that library, with the same support and release status. Import a module for
its operation; use the root when you want resource-backed document analysis.

| Module | Implemented operations | What the implementation does not establish |
| --- | --- | --- |
| `/unicode` | Pinned Unicode segmentation, normalization, case folding, bidi, collation, security, IDNA, hashing | Language-specific linguistic analysis |
| `/document` | Source/views, unit-labelled spans, layers, graphs, typed annotations, querying, JSON | Correctness of a task's predictions |
| `/lexicon` | Lexicons, gazetteers, tries, phrase/fuzzy lookup, morphology candidates and generation | Contextual disambiguation |
| `/finite-state` | Automata, weighted transducers, regex/lexicon compilation, rewrite and morphology operations | A complete linguistic grammar without supplied resources |
| `/rules` | Character/token/annotation/graph matching, cascades, constraints, annotation and rewrite actions | General coreference, quotation attribution, or event extraction from a factory name |
| `/normalization` | Profiles, variants, spelling/OCR/noisy-text candidates and mapped views | Automatic correction suitable for every domain |
| `/learning` | Features, vectorizers, classical classification; HMM, CRF, MEMM/perceptron sequence learning; n-gram LMs, LDA, clustering, trainable projective parsing, extractive summaries | Pretrained, evaluated language-specific tagging/parsing coverage |
| `/data` | Dataset readers/writers/streams/splits, CoNLL-U, sequence labels, TEI and parallel records | Model inference merely because annotated data is imported |
| `/corpus` | Stores, queries, concordance, frequency, n-grams, collocations, keyness, terminology, stylometry, reuse and diachrony | Final authorship or semantic conclusions |
| `/search` | Analysis, indexing, ranked queries, filtering, facets, highlighting and suggestions | An embedding-based retrieval solution |
| `/knowledge` | Knowledge bases, lexical senses, entity candidates, explicit-mention linking, semantic relations | Named entity detection from alias lookup alone |
| `/quality` | Document/corpus/annotation checks, OCR/noisy-text, readability and style diagnostics | Universal correctness or readability judgments |
| `/parallel` | Sentence/word alignment, translation memory, bilingual resources and shallow transfer | A general machine translation system |
| `/pipeline` | One processor contract, planning, execution, streams, cache, diagnostics and resource registry | Task algorithms without supplied processors |
| `/packs` | Structural pack contracts, validation, explicit resource/artifact readers, composition and integrity | An installed pack automatically executes every listed resource |

`/analysis` exposes typed projections and a processor for the resource-backed
workflow. `/node`, `/packs/node`, `/onnx/node`, and `/onnx/web` are explicit
environment/backend choices. Optional ONNX runtimes are not imported by
classical or Unicode module entrypoints.

Focused nested entrypoints are documented in the
[module references](../packages/text-computing/docs/). There are no public
`internal/*` imports.

## Composition, not a required facade

```ts
import { createDocument } from "@ismail-elkorchi/text-computing/document";
import { compileRuleSet, createRuleProcessor } from "@ismail-elkorchi/text-computing/rules";
import { createPipeline, runPipeline } from "@ismail-elkorchi/text-computing/pipeline";

const rules = compileRuleSet({
  id: "names", version: "1",
  rules: [{
    id: "alice", when: { kind: "char", text: "Alice" },
    action: [{ kind: "annotate", layerId: "mentions", layerType: "entity.mention" }],
  }],
});
const processor = createRuleProcessor(rules, {
  provides: [{ layer: "mentions" }],
});
const doc = await runPipeline(createPipeline([processor]), createDocument("Alice arrived."));
```

For direct rule application use `applyRules(doc, rules)`: it is the same
implementation used by the processor. Corpus stores, search indexes, feature
matrices, classifiers, and datasets keep their useful domain-specific types.

## Retired redundancy

Separate runtime package manifests, release/build scaffolding, conversion-only
document APIs, and rule factories that only changed a task label are removed.
No old package entrypoints or compatibility aliases are retained. Existing
algorithms, tests, Unicode conformance data, and practical documentation are
owned by the corresponding library modules.
