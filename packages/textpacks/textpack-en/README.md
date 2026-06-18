# @ismail-elkorchi/textpack-en

Generated English recipe composite textpack.

```ts
import { loadEnglish } from "@ismail-elkorchi/textpack-en";

const runtime = await loadEnglish({ reader });
const pack = runtime.pack;
```

## Fetch-Style Reader Example

Use this shape in runtimes where package resources are served at the URLs recorded by generated resource descriptors, such as browser, Worker, Bun, Deno, or CDN-hosted package execution. The fetch reader performs no hidden download policy; it only materializes declared file-backed resources requested by the task API.

```ts
import { createFetchResourceReader } from "@ismail-elkorchi/textpack";
import { loadEnglish } from "@ismail-elkorchi/textpack-en";

const reader = createFetchResourceReader({
	fetch: globalThis.fetch,
});

const runtime = await loadEnglish({
	reader,
});

const analysis = await runtime.document.analyzeText(
	"Paris is a city, and people walk through its museums.",
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
- `@ismail-elkorchi/textpack-en-core`
- `@ismail-elkorchi/textpack-en-normalization`
- `@ismail-elkorchi/textpack-en-segmentation`
- `@ismail-elkorchi/textpack-en-lexicon`
- `@ismail-elkorchi/textpack-en-morphology`
- `@ismail-elkorchi/textpack-en-syntax`
- `@ismail-elkorchi/textpack-en-kb`
- `@ismail-elkorchi/textpack-en-search`
- `@ismail-elkorchi/textpack-en-corpus`
- `@ismail-elkorchi/textpack-en-parallel`
- `@ismail-elkorchi/textpack-en-quality`

## Optional Components

- None


## Publishability

Publishable: `true`
Status: `publishable`

- None

