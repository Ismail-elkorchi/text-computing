# Store

`createCorpus` accepts final `TextDocument` values and builds immutable corpus refs, token indexes, annotation indexes, metadata keys, and declared partitions.

Documents should provide a `token.*` annotation layer. Whitespace token fallback is available only when `tokenSource: "whitespace"` is explicitly set.
