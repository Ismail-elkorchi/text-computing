# `@ismail-elkorchi/text-computing/pipeline`

Deterministic processor graph, planning, execution, streaming, cache, and pack-composition runtime for final `TextDocument` values.

`/pipeline` owns orchestration. Task algorithms live in processors supplied by callers, public modules, or later processor packages that implement the final `TextProcessor` contract.

This is a public module of Text Computing. It can be used directly, without a Capability Pack.

## Install

```sh
npm install @ismail-elkorchi/text-computing
```

## Imports

```ts
import {
	createPipeline,
	planPipeline,
	runPipeline,
	streamPipeline,
} from "@ismail-elkorchi/text-computing/pipeline";

import type { TextProcessor } from "@ismail-elkorchi/text-computing/pipeline/processor";
import { createMemoryPipelineCache } from "@ismail-elkorchi/text-computing/pipeline/cache";
import { createPipelineResourceRegistry } from "@ismail-elkorchi/text-computing/pipeline/pack";
```

## Processor

```ts
import type { TextProcessor } from "@ismail-elkorchi/text-computing/pipeline";

const processor: TextProcessor = {
	id: "example.identity",
	version: "1.0.0",
	requires: [{ viewKind: "raw" }],
	provides: [{ viewKind: "raw" }],
	process(document) {
		return document;
	},
};
```

## Run

```ts
import { createDocument } from "@ismail-elkorchi/text-computing/document";
import { createPipeline, runPipeline } from "@ismail-elkorchi/text-computing/pipeline";

const pipeline = createPipeline([processor]);
const output = await runPipeline(pipeline, createDocument("hello"));
```

## Stream

```ts
for await (const output of streamPipeline(pipeline, documents, {
	concurrency: 2,
	preserveOrder: true,
})) {
	console.log(output.id);
}
```

## Cache

Cache keys include the pipeline fingerprint, processor id/version, declared requirements and outputs, resource fingerprints, run options that affect output, and the full input document content fingerprint. A document revision is never used as the only freshness signal.

```ts
const cache = createMemoryPipelineCache({ namespace: "example" });
await runPipeline(pipeline, document, { cache });
```

## Resource Packs

`/pipeline` does not discover packs at runtime. Load or create final `/packs` values in caller code, then pass a registry into the pipeline.

```ts
const resources = createPipelineResourceRegistry({ packs: [pack] });
const pipeline = createPipeline([processor], { resources });
```

## Runtime Boundary

The package is ESM, side-effect-free, and free of Node-only runtime APIs in shipped source. Node scripts are used only for local verification.
