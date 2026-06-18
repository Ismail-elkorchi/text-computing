# @ismail-elkorchi/textpack-ar

Generated Arabic recipe composite textpack.

```ts
import { loadArabic } from "@ismail-elkorchi/textpack-ar";

const runtime = await loadArabic({ reader });
const pack = runtime.pack;
```

## Fetch-Style Reader Example

Use this shape in runtimes where package resources are served at the URLs recorded by generated resource descriptors, such as browser, Worker, Bun, Deno, or CDN-hosted package execution. The fetch reader performs no hidden download policy; it only materializes declared file-backed resources requested by the task API.

```ts
import { createFetchResourceReader } from "@ismail-elkorchi/textpack";
import { loadArabic } from "@ismail-elkorchi/textpack-ar";

const reader = createFetchResourceReader({
	fetch: globalThis.fetch,
});

const runtime = await loadArabic({
	reader,
	licensePolicy: "allow-share-alike",
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
- `@ismail-elkorchi/textpack-ar-syntax`
- `@ismail-elkorchi/textpack-ar-kb`
- `@ismail-elkorchi/textpack-ar-search`
- `@ismail-elkorchi/textpack-ar-corpus`
- `@ismail-elkorchi/textpack-ar-parallel`
- `@ismail-elkorchi/textpack-ar-quality`

## Optional Components

- None

## Policy Surface

This package is a policy-expanded wrapper. It contains no direct resource payloads, but it requires isolated component packages with non-default license policy. The manifest dependency graph and generated reports preserve the component package names, license policies, and full license expression.


## Publishability

Publishable: `true`
Status: `publishable`

- None

