# Index

`createIndex` creates an immutable public index envelope with explicit field configs. `addToIndex` returns a new index value.

Supported field sources are final document views, metadata keys, annotation layers, stored fields, and literal values. Indexing builds inverted indexes, term dictionaries, positional postings, character n-gram terms when configured, term vectors, term frequencies, document frequencies, and average field lengths.

The public `SearchIndex` exposes only `id`, `fields`, and `stats`. Package-private postings state is attached to values created by this package.

Document records are structurally shared between immutable index versions. Adding or replacing a
document updates postings, vocabulary, document frequencies, token totals, and average field
lengths from that document's delta; previously indexed documents are not rescanned.

`termVector(index, docId, fieldId)` returns stable term counts, positions, and UTF-16 spans for a single indexed document field.
