# @ismail-elkorchi/textpack-ar-sa

Generated ArabicShareAlike recipe composite textpack.

```ts
import { loadArabicShareAlike } from "@ismail-elkorchi/textpack-ar-sa";

const runtime = await loadArabicShareAlike({ reader });
const pack = runtime.pack;
```

## Fetch-Style Reader Example

Use this shape in runtimes where package resources are served at the URLs recorded by generated resource descriptors, such as browser, Worker, Bun, Deno, or CDN-hosted package execution. The fetch reader performs no hidden download policy; it only materializes declared file-backed resources requested by the task API.

```ts
import { createFetchResourceReader } from "@ismail-elkorchi/textpack";
import { loadArabicShareAlike } from "@ismail-elkorchi/textpack-ar-sa";

const reader = createFetchResourceReader({
	fetch: globalThis.fetch,
});

const runtime = await loadArabicShareAlike({
	reader,
});

const analysis = await runtime.document.analyzeText(
	"القاهرة مدينة ويكتب الناس عن الكتب.",
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
- `@ismail-elkorchi/textpack-ar-core`
- `@ismail-elkorchi/textpack-ar-normalization`
- `@ismail-elkorchi/textpack-ar-segmentation`
- `@ismail-elkorchi/textpack-ar-lexicon`
- `@ismail-elkorchi/textpack-ar-morphology`
- `@ismail-elkorchi/textpack-ar-syntax-sa`
- `@ismail-elkorchi/textpack-ar-kb`
- `@ismail-elkorchi/textpack-ar-search`
- `@ismail-elkorchi/textpack-ar-corpus`
- `@ismail-elkorchi/textpack-ar-parallel`
- `@ismail-elkorchi/textpack-ar-quality-sa`

## Optional Components

- None


## Publishability

Publishable: `true`
Status: `publishable`

- None

