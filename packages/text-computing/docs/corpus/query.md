# Query

`corpusQuery` accepts structured predicates:

- `{ kind: "token", term }`
- `{ kind: "lemma", lemma }`
- `{ kind: "annotation", layer, type, value }`
- `{ kind: "metadata", key, value }`
- `{ kind: "partition", key, value }`
- `{ kind: "document", id }`
- `{ kind: "and" | "or", queries }`
- `{ kind: "not", query }`

The result includes matching document refs, source-addressable hits, count, and diagnostics.
