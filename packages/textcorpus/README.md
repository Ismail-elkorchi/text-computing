# `@ismail-elkorchi/textcorpus`

Final runtime package for corpus stores, structured corpus queries, corpus linguistics, terminology, lexicography, stylometry features, reuse detection, and diachronic trend tables.

This is an expert runtime package. Use `@ismail-elkorchi/text-computing` as the ordinary NLP entrypoint when you want task workflows over generated `textpack-*` data packages.

## Install

```sh
npm install @ismail-elkorchi/textcorpus
```

## Imports

```ts
import { createCorpus, corpusQuery, concordance } from "@ismail-elkorchi/textcorpus";
import { frequency } from "@ismail-elkorchi/textcorpus/frequency";
import { collocations } from "@ismail-elkorchi/textcorpus/collocation";
```

Required subpaths are `/store`, `/query`, `/concordance`, `/frequency`, `/ngram`, `/collocation`, `/keyness`, `/dispersion`, `/terms`, `/lexicography`, `/stylometry`, `/reuse`, and `/diachronic`.

## Scope

`textcorpus` works over final `TextDocument` values with explicit `token.*` layers. It preserves source documents, annotation evidence, alternatives, graphs, metadata, and span references. It rejects unsafe span slicing when token text must be recovered from non-UTF-16 coordinates.

Structured corpus queries match documents by token, lemma, annotation, metadata, partition, document id, and simple boolean combinations. Ranked search engines, query languages, model training, file-format loading, and final authorship decisions belong to other runtime packages.

## Example

```ts
const corpus = createCorpus(documents, {
  id: "legal-corpus",
  partitionKeys: ["year", "domain"],
});

const hits = corpusQuery(corpus, { kind: "lemma", lemma: "contract" });
const lines = concordance(corpus, { kind: "lemma", lemma: "contract" });
const terms = frequency(corpus, { minCount: 2 });
```

See the `docs/` folder for package-specific usage notes.
