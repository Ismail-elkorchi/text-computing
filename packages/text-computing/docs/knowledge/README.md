# `@ismail-elkorchi/text-computing/knowledge`

Knowledge-backed NLP for final `TextDocument` values.

`/knowledge` creates deterministic in-memory knowledge bases, builds alias indexes, performs entity linking, links terms to KB ids, performs sense linking for word-sense resources, queries semantic relations, traverses ontology/thesaurus links, creates lexical chain features, and writes final `/document` annotations with KB evidence.

This is a public module of Text Computing. It can be used directly, without a Capability Pack.

## Install

```sh
npm install @ismail-elkorchi/text-computing
```

## Example

```ts
import { createDocument } from "@ismail-elkorchi/text-computing/document";
import { createKnowledgeBase, linkEntities } from "@ismail-elkorchi/text-computing/knowledge";

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
const linked = linkEntities(doc, kb, {
  mentionSpans: [
    {
      viewId: "raw",
      span: { start: 0, end: 4, unit: "utf16-code-unit" },
    },
  ],
});
```

## Public Imports

- `@ismail-elkorchi/text-computing/knowledge`
- `@ismail-elkorchi/text-computing/knowledge/kb`
- `@ismail-elkorchi/text-computing/knowledge/entity`
- `@ismail-elkorchi/text-computing/knowledge/sense`
- `@ismail-elkorchi/text-computing/knowledge/term`
- `@ismail-elkorchi/text-computing/knowledge/ontology`
- `@ismail-elkorchi/text-computing/knowledge/thesaurus`
- `@ismail-elkorchi/text-computing/knowledge/link`
- `@ismail-elkorchi/text-computing/knowledge/disambiguate`
- `@ismail-elkorchi/text-computing/knowledge/semantic-relations`

## Boundaries

Canonical textpack KB slices prefer packed `lookup-index` resources for aliases, entities, and
relations, materializing only rows needed by the requested mentions and linked identifiers. The
generated v1 lookup view is required for targeted table references; no full-table fallback is
performed. The logical source and lookup view share one physical indexed-table store. Selected
buckets are checked when read, while the forge separately proves complete store/source
consistency. Mention keys use pinned Unicode 17 NFKC casefolding, and Wikidata IRIs are exposed as
QIDs while the source identifier remains in provenance metadata.

The runtime accepts caller-provided records, loaded resource rows, and final `TextDocument` values. It does not scan packages, read filesystem resources, fetch external KBs, train models, use embeddings, or replace corpus terminology extraction.

`linkEntities` and `linkTerms` consume annotations and explicit mention spans by
default. Whole-text alias scanning is an opt-in (`mentionSource:
"aliases"` or `"both"`) and is candidate generation, not named-entity
recognition. Short aliases and common words can otherwise produce convincing but
incorrect links.

Published runtime code is ESM, side-effect-free, deterministic, and portable across Node.js, Deno, Bun, browsers, and Cloudflare Workers.
