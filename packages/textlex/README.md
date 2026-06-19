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

## Boundaries

`textlex` performs lexical lookup and deterministic lookup-style morphology over caller-provided or textpack-backed resources. It does not perform entity linking, ontology reasoning, corpus term extraction, context-disambiguating morphology, or grapheme-to-phoneme inference.
