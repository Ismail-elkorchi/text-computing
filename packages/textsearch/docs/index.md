# Index

`createIndex` creates an immutable public index envelope with explicit field configs. `addToIndex` returns a new index value.

Supported field sources are final document views, metadata keys, annotation layers, stored fields, and literal values. Indexing builds inverted indexes, term dictionaries, positional postings, character n-gram terms when configured, term vectors, term frequencies, document frequencies, and average field lengths.

The public `SearchIndex` exposes only `id`, `fields`, and `stats`. Package-private postings state is attached to values created by this package.

`termVector(index, docId, fieldId)` returns stable term counts, positions, and UTF-16 spans for a single indexed document field.
