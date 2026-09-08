# @ismail-elkorchi/text-computing/lexicon

Deterministic lexical, morphology-row, gazetteer, term, trie, phrase, fuzzy, and lookup engines for text-computing packages.

This is a public module of Text Computing. It can be used directly, without a Capability Pack.

```ts
import { buildLexicon, lookup } from "@ismail-elkorchi/text-computing/lexicon";

const lexicon = buildLexicon([
	{ id: "analysis", forms: ["analysis"], aliases: ["study"] },
]);

lookup(lexicon, "analysis");
```

## Imports

```ts
import { buildLexicon } from "@ismail-elkorchi/text-computing/lexicon";
import { buildGazetteer } from "@ismail-elkorchi/text-computing/lexicon/gazetteer";
import { buildTrie } from "@ismail-elkorchi/text-computing/lexicon/trie";
```

The package also exposes `./lexicon`, `./gazetteer`, `./term`, `./trie`, `./phrase`, `./fuzzy`, `./annotate`, and generated textpack resource adapters.

Targeted textpack lookup requires the canonical resource's generated v1 `lookup-index`, opens only
the matching key and row buckets, and never materializes the full referenced table. Exact,
normalized, and casefold modes use column-scoped Unicode 17 NFKC-casefold keys; prefix, suffix, and
fuzzy modes use the lexicon's raw pattern buckets and preserve their public matching
semantics. Packs that expose targeted canonical table references without their required indexed
lookup view are invalid rather than silently falling back to a full-resource scan. The logical
source and lookup view share one physical indexed-table store, so full APIs remain available
without shipping duplicate rows. CAMeL morphology resources additionally compose compatible
prefix, stem, and suffix rows through their AB, BC, and AC tables.

## Boundaries

`/lexicon` performs lexical lookup and deterministic lookup-style morphology over caller-provided or textpack-backed resources. It does not perform entity linking, ontology reasoning, corpus term extraction, context-disambiguating morphology, or grapheme-to-phoneme inference.
