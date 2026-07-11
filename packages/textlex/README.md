# @ismail-elkorchi/textlex

Deterministic lexical, morphology-row, gazetteer, term, trie, phrase, fuzzy, and lookup engines for text-computing packages.

This is an expert runtime package. Use `@ismail-elkorchi/text-computing` as the ordinary NLP entrypoint when you want task workflows over generated `textpack-*` data packages.

```ts
import { buildLexicon, lookup } from "@ismail-elkorchi/textlex";

const lexicon = buildLexicon([
	{ id: "analysis", forms: ["analysis"], aliases: ["study"] },
]);

lookup(lexicon, "analysis");
```

## Imports

```ts
import { buildLexicon } from "@ismail-elkorchi/textlex";
import { buildGazetteer } from "@ismail-elkorchi/textlex/gazetteer";
import { buildTrie } from "@ismail-elkorchi/textlex/trie";
```

The package also exposes `./lexicon`, `./gazetteer`, `./term`, `./trie`, `./phrase`, `./fuzzy`, `./annotate`, and generated textpack resource adapters.

Targeted textpack lookup requires the canonical resource's generated v2 `lookup-index`, opens only
the matching key and row buckets, and never materializes the full referenced table. Exact,
normalized, and casefold modes use column-scoped Unicode 17 NFKC-casefold keys; prefix, suffix, and
fuzzy expert modes use the lexicon's raw pattern buckets and preserve their public matching
semantics. Packs that expose targeted canonical table references without their required indexed
lookup view are invalid rather than silently falling back to a full-resource scan. The logical
source and lookup view share one physical indexed-table store, so full expert APIs remain available
without shipping duplicate rows. CAMeL morphology resources additionally compose compatible
prefix, stem, and suffix rows through their AB, BC, and AC tables.

## Boundaries

`textlex` performs lexical lookup and deterministic lookup-style morphology over caller-provided or textpack-backed resources. It does not perform entity linking, ontology reasoning, corpus term extraction, context-disambiguating morphology, or grapheme-to-phoneme inference.
