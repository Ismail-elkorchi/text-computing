# @ismail-elkorchi/textpack-fr

Generated French recipe composite textpack.

```ts
import { loadFrench } from "@ismail-elkorchi/textpack-fr";

const runtime = await loadFrench({ reader });
const pack = runtime.pack;
```

## Fetch-Style Reader Example

Use this shape in runtimes where package resources are served at the URLs recorded by generated resource descriptors, such as browser, Worker, Bun, Deno, or CDN-hosted package execution. The fetch reader performs no hidden download policy; it only materializes declared file-backed resources requested by the task API.

```ts
import { createFetchResourceReader } from "@ismail-elkorchi/textpack";
import { loadFrench } from "@ismail-elkorchi/textpack-fr";

const reader = createFetchResourceReader({
	fetch: globalThis.fetch,
});

const runtime = await loadFrench({
	reader,
	licensePolicy: "allow-share-alike",
});

const analysis = await runtime.document.analyzeText(
	"En France, j'aime apprendre chaque jour.",
	{
		entityLanguage: runtime.languageTag,
	},
);

console.log(analysis.searchTokens.map((token) => token.term));
```

The same example is included as `examples/fetch-style-reader.ts`.

## Pipeline Facade

`runtime.pipeline.runText(...)` and `runtime.pipeline.runDocument(...)` wrap the document-analysis facade in a real `@ismail-elkorchi/textpipeline` execution. Use `runtime.pipeline.createDocumentAnalysisPipeline(...)` when you need the underlying `TextPipeline` for planning or inspection. Use the task groups directly when you need partial workflows such as only segmentation, search, KB lookup, corpus rows, or parallel rows.

## Required Components

- `@ismail-elkorchi/textpack-foundation`
- `@ismail-elkorchi/textpack-fr-core`
- `@ismail-elkorchi/textpack-fr-normalization`
- `@ismail-elkorchi/textpack-fr-segmentation`
- `@ismail-elkorchi/textpack-fr-lexicon`
- `@ismail-elkorchi/textpack-fr-morphology`
- `@ismail-elkorchi/textpack-fr-syntax`
- `@ismail-elkorchi/textpack-fr-kb`
- `@ismail-elkorchi/textpack-fr-search`
- `@ismail-elkorchi/textpack-fr-corpus`
- `@ismail-elkorchi/textpack-fr-parallel`
- `@ismail-elkorchi/textpack-fr-quality`

## Optional Components

- None

## Policy Surface

This package is a policy-expanded wrapper. It contains no direct resource payloads, but it requires isolated component packages with non-default license policy. The manifest dependency graph and generated reports preserve the component package names, license policies, and full license expression.


## Publishability

Publishable: `true`
Status: `publishable`

- None

