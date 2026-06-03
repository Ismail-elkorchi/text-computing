# @ismail-elkorchi/textlex

Deterministic lexical resources and lookup engines for text-computing packages.

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

The package also exposes `./lexicon`, `./gazetteer`, `./term`, `./trie`, `./phrase`, `./fuzzy`, and `./annotate`.

## Boundaries

`textlex` performs lexical lookup. It does not perform entity linking, ontology reasoning, corpus term extraction, morphology analysis, or grapheme-to-phoneme inference.
