# Text Computing

Text Computing is an alpha, modular TypeScript library for processing,
analyzing, transforming, searching, and learning from text. Its direction is
to make TypeScript a first-class environment for this work, with reliable
composition, reproducible resources, and measurable quality.

The project has three concepts. Using the library does not require the other two.

## Text Computing

Install one library: `@ismail-elkorchi/text-computing`. Use its public modules
directly or compose their operations into document pipelines. Rules,
finite-state processing, corpus statistics, classical learning, and model
inference are all normal parts of the library.

```ts
import { createDocument } from "@ismail-elkorchi/text-computing/document";
import { applyRules, compileRuleSet } from "@ismail-elkorchi/text-computing/rules";

const rules = compileRuleSet({
  id: "project-mentions",
  version: "1",
  rules: [{
    id: "typescript",
    when: { kind: "char", text: "TypeScript" },
    action: [{
      kind: "annotate",
      layerId: "mentions",
      layerType: "entity.mention",
      value: { label: "technology" },
    }],
  }],
});

const doc = applyRules(createDocument("NLP in TypeScript."), rules);
console.log(doc.layers.mentions);
```

The same installation includes `/unicode`, `/document`, `/lexicon`,
`/finite-state`, `/rules`, `/normalization`, `/learning`, `/data`, `/corpus`,
`/search`, `/knowledge`, `/quality`, `/parallel`, `/pipeline`, and `/packs`.
Focused subpaths let applications select what they need. There is no separate
API tier and no requirement to route every operation through document analysis.

See the [module guide and capability inventory](docs/modules.md) for examples,
implemented algorithms, construction primitives, and current gaps.

## Capability Packs

Capability Packs are independently versioned, data-only resources: lexicons,
rules, tokenizers, indexes, model descriptors, and evaluation records. They
contain no runtime dependency, task implementation, or hidden download.
The `textpack` structural contract is available through the library's `/packs`
module. Plain caller-owned data is equally valid for direct module APIs.

The generated English, French, and Arabic packs support a convenient analysis
workflow:

```ts
import { createNodeResourceReader, load } from "@ismail-elkorchi/text-computing/node";
import fr from "@ismail-elkorchi/textpack-fr";

const nlp = await load(fr, { reader: createNodeResourceReader() });
const doc = await nlp("Les enfants jouent à Paris.", { preset: "lookup" });

console.log(doc.tokens);
console.log(doc.layers);   // The same document used by rules, corpora, and search.
console.log(doc.evidence);
```

Packs are optional for using the library. Large datasets and models are
explicit acquisition inputs, not default installation payloads.

## Textpack Forge

Textpack Forge builds audited Capability Packs from pinned source snapshots.
It owns acquisition, checksum and license checks, deterministic transforms,
evaluation reports, and generated distribution output. It is a build-time
tool, not a prerequisite for ordinary text processing or local training.

Normal builds do not download sources. Acquisition and snapshot updates are
explicit operations.

## Current readiness

Existing implementations include Unicode processing, lexical and morphology
lookup, rules, finite-state operations, classical classifiers and sequence
learners, a trainable projective dependency parser, corpus analysis, search,
knowledge linking, quality diagnostics, and parallel-text tools.

Implemented algorithms are not the same as evaluated language solutions.
The generated packs currently cover controlled English, French, and Modern
Standard Arabic workflows. Arabic NER is an opt-in ONNX slice with modest
held-out results. General pretrained POS/dependency models, broad coreference,
constituency parsing, and embedding workflows are not shipped solutions.

Read [Evaluation and readiness](docs/evaluation.md) before choosing a production
workload, and the [architecture](docs/specs/text-computing-platform.md) and
[roadmap](docs/roadmap.md) for boundaries and priorities.

## Development

```sh
npm ci
npm run -s lint
npm run -s build
npm run -s schema:validate
npm test
npm run -s test:forge
npm run -s test:nlp
```

See [CONTRIBUTING.md](CONTRIBUTING.md) for contribution routes and Forge commands.
