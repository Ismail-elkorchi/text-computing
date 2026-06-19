# `@ismail-elkorchi/textquality`

Inspectable text quality diagnostics for final `TextDocument` values.

`textquality` reports Unicode integrity, OCR/ATR noise, noisy-token candidates, OOV and lexical coverage, language/script mix, morphology coverage, punctuation and whitespace issues, readability, lexical diversity, sentence and paragraph complexity, annotation coverage/conflicts, corpus balance, metadata coverage, style findings, and processing readiness. It returns stable `QualityReport` values and can add final `quality.*` annotations.

This is an expert runtime package. Use `@ismail-elkorchi/text-computing` as the ordinary NLP entrypoint when you want task workflows over generated `textpack-*` data packages.

## Install

```sh
npm install @ismail-elkorchi/textquality
```

## Example

```ts
import { createDocument } from "@ismail-elkorchi/textdoc";
import { analyzeDocumentQuality } from "@ismail-elkorchi/textquality";

const doc = createDocument("Acme  Corp!!!\nqual-\nity", { id: "doc-a" });
const report = analyzeDocumentQuality(doc, {
	profile: { id: "review", thresholds: { "readiness.warning_count": 0 } },
});
```

## Public Imports

- `@ismail-elkorchi/textquality`
- `@ismail-elkorchi/textquality/document`
- `@ismail-elkorchi/textquality/corpus`
- `@ismail-elkorchi/textquality/ocr`
- `@ismail-elkorchi/textquality/noisy`
- `@ismail-elkorchi/textquality/readability`
- `@ismail-elkorchi/textquality/style`
- `@ismail-elkorchi/textquality/annotation`
- `@ismail-elkorchi/textquality/report`

## Boundaries

The runtime reports findings and candidates. It does not silently repair text, create corrected views, crawl resources, train models, run pipelines, load datasets, perform search ranking, link entities, or render dashboards.

Published runtime code is ESM, side-effect-free, deterministic, and portable across Node.js, Deno, Bun, browsers, and Cloudflare Workers.
