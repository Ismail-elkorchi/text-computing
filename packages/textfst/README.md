# @ismail-elkorchi/textfst

Finite-state automata and transducers for deterministic TypeScript text processing.

## Quick Start

```ts
import { applyDown, compileLexicon, compileRegex } from "@ismail-elkorchi/textfst";

const acceptor = compileRegex("c(a|o)t");
const matches = applyDown(acceptor, "cat");

const morph = compileLexicon({
	entries: [{ surface: "walked", analysis: "walk+V+PST" }],
});
const forms = applyDown(morph, "walk+V+PST");
```

## Entry Points

- `@ismail-elkorchi/textfst`
- `@ismail-elkorchi/textfst/automaton`
- `@ismail-elkorchi/textfst/transducer`
- `@ismail-elkorchi/textfst/compile`
- `@ismail-elkorchi/textfst/regex`
- `@ismail-elkorchi/textfst/rewrite`
- `@ismail-elkorchi/textfst/lexc`
- `@ismail-elkorchi/textfst/twol`
- `@ismail-elkorchi/textfst/apply`
- `@ismail-elkorchi/textfst/weight`
- `@ismail-elkorchi/textfst/morph`
- `@ismail-elkorchi/textfst/spell`

## Boundary

`textfst` owns finite-state runtime and compiler behavior over strings. It does not mutate
documents, run annotation cascades, compute corpus statistics, perform knowledge-base reasoning, or
schedule pipelines.
