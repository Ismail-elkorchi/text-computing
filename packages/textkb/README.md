# `@ismail-elkorchi/textkb`

Knowledge-backed NLP for final `TextDocument` values.

`textkb` creates deterministic in-memory knowledge bases, builds alias indexes, performs entity linking, links terms to KB ids, performs sense linking for word-sense resources, queries semantic relations, traverses ontology/thesaurus links, creates lexical chain features, and writes final `textdoc` annotations with KB evidence.

## Install

```sh
npm install @ismail-elkorchi/textkb
```

## Example

```ts
import { createDocument } from "@ismail-elkorchi/textdoc";
import { createKnowledgeBase, linkEntities } from "@ismail-elkorchi/textkb";

const kb = createKnowledgeBase({
  id: "demo",
  entities: [
    {
      id: "Q1",
      labels: { en: ["Acme Corp"] },
      aliases: { en: ["Acme"] },
      types: ["Organization"],
    },
  ],
});

const doc = createDocument("Acme signed the contract.", { id: "doc-a" });
const linked = linkEntities(doc, kb);
```

## Public Imports

- `@ismail-elkorchi/textkb`
- `@ismail-elkorchi/textkb/kb`
- `@ismail-elkorchi/textkb/entity`
- `@ismail-elkorchi/textkb/sense`
- `@ismail-elkorchi/textkb/term`
- `@ismail-elkorchi/textkb/ontology`
- `@ismail-elkorchi/textkb/thesaurus`
- `@ismail-elkorchi/textkb/link`
- `@ismail-elkorchi/textkb/disambiguate`
- `@ismail-elkorchi/textkb/semantic-relations`

## Boundaries

The runtime accepts caller-provided records, loaded resource rows, and final `TextDocument` values. It does not scan packages, read filesystem resources, fetch external KBs, train models, use embeddings, or replace corpus terminology extraction.

Published runtime code is ESM, side-effect-free, deterministic, and portable across Node.js, Deno, Bun, browsers, and Cloudflare Workers.
