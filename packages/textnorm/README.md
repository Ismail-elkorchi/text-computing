# @ismail-elkorchi/textnorm

`textnorm` creates resource-backed normalized views without overwriting source text. It emits final
`textdoc` `TextView` and `SpanMap` values, evidence-bearing normalization candidates, and stable
variant graphs for spelling, historical, OCR/ATR, noisy, dialectal, transliteration, punctuation,
spacing, and casing normalization.

This is an expert runtime package. Use `@ismail-elkorchi/text-computing` as the ordinary NLP entrypoint when you want task workflows over generated `textpack-*` data packages.

```ts
import { createDocument } from "@ismail-elkorchi/textdoc";
import {
	buildSpellingMap,
	normalizeDocument,
} from "@ismail-elkorchi/textnorm";

const doc = createDocument("ye olde shoppe", { id: "example" });
const spelling = buildSpellingMap([
	{ source: "olde", candidates: ["old"] },
	{ source: "shoppe", candidates: ["shop"] },
]);

const result = normalizeDocument(doc, {
	modes: ["spelling"],
	resources: { spellingMaps: [spelling] },
	targetViewId: "normalized",
});

console.log(result.view.text);
```

The package does not discover resource packs, read local files, fetch resources, or own hidden
normalization resources. Callers provide already loaded lexicons, FSTs, rule sets, maps, profiles, or
explicit `textpack` values with manifest task bindings.

See [docs/INDEX.md](docs/INDEX.md) for focused import, mode, resource, view, annotation, and
boundary notes.
