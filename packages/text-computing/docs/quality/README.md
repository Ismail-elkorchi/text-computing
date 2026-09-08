# `@ismail-elkorchi/text-computing/quality`

Inspectable text quality diagnostics for final `TextDocument` values.

`/quality` reports Unicode integrity, OCR/ATR noise, noisy-token candidates, OOV and lexical coverage, language/script mix, morphology coverage, punctuation and whitespace issues, readability, lexical diversity, sentence and paragraph complexity, annotation coverage/conflicts, corpus balance, metadata coverage, style findings, and processing readiness. It returns stable `QualityReport` values and can add final `quality.*` annotations.

This is a public module of Text Computing. It can be used directly, without a Capability Pack.

## Install

```sh
npm install @ismail-elkorchi/text-computing
```

## Example

```ts
import { createDocument } from "@ismail-elkorchi/text-computing/document";
import { analyzeDocumentQuality } from "@ismail-elkorchi/text-computing/quality";

const doc = createDocument("Acme  Corp!!!\nqual-\nity", { id: "doc-a" });
const report = analyzeDocumentQuality(doc, {
	profile: { id: "review", thresholds: { "readiness.warning_count": 0 } },
	maxFindingsPerKind: 25,
});
```

## Public Imports

- `@ismail-elkorchi/text-computing/quality`
- `@ismail-elkorchi/text-computing/quality/document`
- `@ismail-elkorchi/text-computing/quality/corpus`
- `@ismail-elkorchi/text-computing/quality/ocr`
- `@ismail-elkorchi/text-computing/quality/noisy`
- `@ismail-elkorchi/text-computing/quality/readability`
- `@ismail-elkorchi/text-computing/quality/style`
- `@ismail-elkorchi/text-computing/quality/annotation`
- `@ismail-elkorchi/text-computing/quality/report`

## Boundaries

The runtime reports findings and candidates. It does not silently repair text, create corrected views, crawl resources, train models, run pipelines, load datasets, perform search ranking, link entities, or render dashboards.

Finding identifiers include the affected spans, metrics, and evidence, so
distinct occurrences remain distinct while duplicate diagnostics collapse.
Document reports cap each finding kind by default. Annotation overlap is checked
only for token layers or layers explicitly listed in
`annotation.nonOverlappingLayerIds`; overlapping morphology, entity, and other
alternative analyses are valid by default.

Published runtime code is ESM, side-effect-free, deterministic, and portable across Node.js, Deno, Bun, browsers, and Cloudflare Workers.
