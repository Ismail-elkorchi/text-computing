# `@ismail-elkorchi/textparallel`

Inspectable non-neural parallel-text workflows for final `TextDocument` values.

`textparallel` represents aligned documents and corpora, aligns sentences and words, builds and searches local translation memories, extracts bilingual terminology, induces bilingual lexicon candidates, compares aligned collocations, and runs rule-backed shallow transfer from caller-provided lexicons, FSTs, and rules.

This is an expert runtime package. Use `@ismail-elkorchi/text-computing` as the ordinary NLP entrypoint when you want task workflows over generated `textpack-*` data packages.

## Install

```sh
npm install @ismail-elkorchi/textparallel
```

## Example

```ts
import { createDocument } from "@ismail-elkorchi/textdoc";
import {
	alignSentences,
	buildTranslationMemory,
	createParallelDocument,
	searchTranslationMemory,
} from "@ismail-elkorchi/textparallel";

const source = createDocument("Hello world.", { id: "en" });
const target = createDocument("Bonjour le monde.", { id: "fr" });
const links = alignSentences(source, target);
const doc = createParallelDocument(source, target, { id: "pair", links });
const tm = buildTranslationMemory([doc]);
const hits = searchTranslationMemory(tm, "hello world");
```

## Public Imports

- `@ismail-elkorchi/textparallel`
- `@ismail-elkorchi/textparallel/alignment`
- `@ismail-elkorchi/textparallel/sentence-align`
- `@ismail-elkorchi/textparallel/word-align`
- `@ismail-elkorchi/textparallel/translation-memory`
- `@ismail-elkorchi/textparallel/bilingual-lexicon`
- `@ismail-elkorchi/textparallel/bilingual-terms`
- `@ismail-elkorchi/textparallel/transfer`
- `@ismail-elkorchi/textparallel/parallel-corpus`

## Boundaries

The runtime is local, deterministic, and resource-backed. It does not fetch translation services, discover packs, own file readers, replace `textlex`/`textfst`/`textrules`, or bundle machine translation models.
