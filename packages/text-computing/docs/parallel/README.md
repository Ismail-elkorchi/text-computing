# `@ismail-elkorchi/text-computing/parallel`

Inspectable non-neural parallel-text workflows for final `TextDocument` values.

`/parallel` represents aligned documents and corpora, aligns sentences and words, builds and searches local translation memories, extracts bilingual terminology, induces bilingual lexicon candidates, compares aligned collocations, and runs rule-backed shallow transfer from caller-provided lexicons, FSTs, and rules.

This is a public module of Text Computing. It can be used directly, without a Capability Pack.

## Install

```sh
npm install @ismail-elkorchi/text-computing
```

## Example

```ts
import { createDocument } from "@ismail-elkorchi/text-computing/document";
import {
	alignSentences,
	buildTranslationMemory,
	createParallelDocument,
	searchTranslationMemory,
} from "@ismail-elkorchi/text-computing/parallel";

const source = createDocument("Hello world.", { id: "en" });
const target = createDocument("Bonjour le monde.", { id: "fr" });
const links = alignSentences(source, target);
const doc = createParallelDocument(source, target, { id: "pair", links });
const tm = buildTranslationMemory([doc]);
const hits = searchTranslationMemory(tm, "hello world");
```

## Public Imports

- `@ismail-elkorchi/text-computing/parallel`
- `@ismail-elkorchi/text-computing/parallel/alignment`
- `@ismail-elkorchi/text-computing/parallel/sentence-align`
- `@ismail-elkorchi/text-computing/parallel/word-align`
- `@ismail-elkorchi/text-computing/parallel/translation-memory`
- `@ismail-elkorchi/text-computing/parallel/bilingual-lexicon`
- `@ismail-elkorchi/text-computing/parallel/bilingual-terms`
- `@ismail-elkorchi/text-computing/parallel/transfer`
- `@ismail-elkorchi/text-computing/parallel/parallel-corpus`

## Boundaries

The runtime is local, deterministic, and resource-backed. It does not fetch translation services, discover packs, own file readers, replace `/lexicon`/`/finite-state`/`/rules`, or bundle machine translation models.
