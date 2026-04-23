# `@ismail-elkorchi/textcorpus`

Deterministic corpus collection and fingerprint package.

Current scope:

- explicit `TextDocDocumentV1` corpus entries with declared token-view references;
- deterministic corpus collection validation and entry ordering;
- metadata-based corpus slicing without hidden tokenization changes; and
- deterministic token-shingle fingerprint indexing over explicit token layers.

This package does not yet define TF-IDF, BM25, ranking APIs, or corpus-level result envelopes.
