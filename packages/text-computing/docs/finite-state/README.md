# @ismail-elkorchi/text-computing/finite-state

Finite-state automata and transducers for deterministic TypeScript text processing.

This is a public module of Text Computing. It can be used directly, without a Capability Pack.

## Quick Start

```ts
import { applyDown, compileLexicon, compileRegex } from "@ismail-elkorchi/text-computing/finite-state";

const acceptor = compileRegex("c(a|o)t");
const matches = applyDown(acceptor, "cat");

const morph = compileLexicon({
	entries: [{ surface: "walked", analysis: "walk+V+PST" }],
});
const forms = applyDown(morph, "walk+V+PST");
```

## Entry Points

- `@ismail-elkorchi/text-computing/finite-state`
- `@ismail-elkorchi/text-computing/finite-state/automaton`
- `@ismail-elkorchi/text-computing/finite-state/transducer`
- `@ismail-elkorchi/text-computing/finite-state/compile`
- `@ismail-elkorchi/text-computing/finite-state/regex`
- `@ismail-elkorchi/text-computing/finite-state/rewrite`
- `@ismail-elkorchi/text-computing/finite-state/lexc`
- `@ismail-elkorchi/text-computing/finite-state/twol`
- `@ismail-elkorchi/text-computing/finite-state/apply`
- `@ismail-elkorchi/text-computing/finite-state/weight`
- `@ismail-elkorchi/text-computing/finite-state/morph`
- `@ismail-elkorchi/text-computing/finite-state/spell`

## Boundary

`/finite-state` owns finite-state runtime and compiler behavior over strings. It does not mutate
documents, run annotation cascades, compute corpus statistics, perform knowledge-base reasoning, or
schedule pipelines.
