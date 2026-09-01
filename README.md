# Text Computing

Text Computing is an alpha TypeScript platform for deploying, integrating,
auditing, and operating NLP systems. It makes capabilities explicit: an
application loads a versioned pack, runs declared tasks through one API, and
receives text-aligned results with evidence about the resources and capability
tier used.

Model creation is an upstream concern rather than a platform boundary. Models,
tokenizers, rules, and data may originate in any suitable ecosystem; the
runtime cares that deployable artifacts have declared formats, versions,
checksums, provenance, licenses, runtime bindings, and evaluation evidence.

The project has three product concepts.

## Text Computing

`@ismail-elkorchi/text-computing` is the application-facing runtime. It owns
loading, task selection, document analysis, evidence, and portable resource I/O
across Node.js, Bun, Deno, browsers, and Workers.

```ts
import {
  createNodeResourceReader,
  load,
} from "@ismail-elkorchi/text-computing/node";
import fr from "@ismail-elkorchi/textpack-fr";

const nlp = await load(fr, { reader: createNodeResourceReader() });
const doc = await nlp("L'Etat francais reconnait Paris.", {
  preset: "lookup",
});

console.log(doc.tokens);
console.log(doc.evidence);
```

Applications start here. The lower-level engine workspaces are implementation
modules and expert extension APIs, not separate product surfaces that ordinary
users must assemble.

## Capability Packs

Capability Packs are immutable, data-only inputs to the runtime. A pack can
ship or reference language resources, rules, tokenizers, indexes, model
artifacts, and evaluation records without embedding loaders or executable task
facades. The current concrete format is `textpack`.

Every capability slot separates availability from inference depth. Shipping an
artifact does not claim that a task runs; a `model-backed` claim requires an
executing adapter and held-out task evidence.

The forge currently emits three self-contained language packs:

- `@ismail-elkorchi/textpack-en`
- `@ismail-elkorchi/textpack-fr`
- `@ismail-elkorchi/textpack-ar`

Large corpora, parallel data, and annotation datasets remain explicit
acquisition inputs instead of default deployment payloads.

## Textpack Forge

Textpack Forge is the audited build-time supply chain for Capability Packs. It
pins source snapshots, verifies checksums and licensing policy, runs
deterministic transforms, builds lookup stores, evaluates declared capability
claims, and emits data-only packages plus provenance and quality reports.

Normal builds do not download sources. Acquisition and snapshot updates are
explicit operations, so deployed NLP behavior does not depend on hidden network
access or mutable upstream state.

## Current readiness

The current packs support controlled English, French, and Modern Standard
Arabic workloads involving Unicode segmentation, normalization, lexical and
morphology lookup, search analysis, explicit-mention KB linking, and rule-based
quality diagnostics. They do not currently provide contextual NER, statistical
tagging, dependency parsing, coreference, embeddings, or neural inference.

See [Evaluation and readiness](docs/evaluation.md) for measured task,
real-text, latency, and memory results. See the
[platform architecture](docs/specs/text-computing-platform.md) for the
normative boundaries between the three concepts.

## Development

Run repository checks from the workspace root:

```sh
npm run -s lint
npm run -s build
npm run -s schema:validate
npm run -s test:nlp
```

Contribution routes and forge commands are documented in
[CONTRIBUTING.md](CONTRIBUTING.md).
