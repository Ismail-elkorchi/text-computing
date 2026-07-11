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

Targeted textpack lookup uses a canonical packed `lookup-index` when one is present, validates it
against the uncompressed source text, and parses only matching rows. Caller-authored packs without
that resource use a pack- and reader-scoped one-pass fallback index. Lookup keys use the pinned
Unicode 17 NFKC casefold contract. CAMeL morphology resources additionally compose compatible
prefix, stem, and suffix rows through their AB, BC, and AC tables.

## Boundaries

`textlex` performs lexical lookup and deterministic lookup-style morphology over caller-provided or textpack-backed resources. It does not perform entity linking, ontology reasoning, corpus term extraction, context-disambiguating morphology, or grapheme-to-phoneme inference.
