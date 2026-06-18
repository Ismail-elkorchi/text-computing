# @ismail-elkorchi/textpack-fr-sa

Generated FrenchShareAlike recipe composite textpack.

```ts
import { loadFrenchShareAlike } from "@ismail-elkorchi/textpack-fr-sa";

const runtime = await loadFrenchShareAlike({ reader });
const pack = runtime.pack;
```

## Fetch-Style Reader Example

Use this shape in runtimes where package resources are served at the URLs recorded by generated resource descriptors, such as browser, Worker, Bun, Deno, or CDN-hosted package execution. The fetch reader performs no hidden download policy; it only materializes declared file-backed resources requested by the task API.

```ts
import { createFetchResourceReader } from "@ismail-elkorchi/textpack";
import { loadFrenchShareAlike } from "@ismail-elkorchi/textpack-fr-sa";

const reader = createFetchResourceReader({
	fetch: globalThis.fetch,
});

const runtime = await loadFrenchShareAlike({
	reader,
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
- `@ismail-elkorchi/textpack-fr-lexicon-sa`
- `@ismail-elkorchi/textpack-fr-morphology-sa`
- `@ismail-elkorchi/textpack-fr-syntax-sa`
- `@ismail-elkorchi/textpack-fr-kb`
- `@ismail-elkorchi/textpack-fr-search-sa`
- `@ismail-elkorchi/textpack-fr-corpus`
- `@ismail-elkorchi/textpack-fr-parallel`
- `@ismail-elkorchi/textpack-fr-quality-sa`

## Optional Components

- None


## Publishability

Publishable: `true`
Status: `publishable`

- None

