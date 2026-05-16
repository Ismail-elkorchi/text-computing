# `@ismail-elkorchi/textcorpus`

Deterministic corpus collection and fingerprint package.

Current scope:

- explicit `TextDocDocumentV1` corpus entries with declared token-view references;
- deterministic corpus collection validation and entry ordering;
- metadata-based corpus slicing without hidden tokenization changes;
- deterministic token-shingle fingerprint indexing over explicit token layers;
- deterministic raw TF, smooth TF-IDF, and Okapi BM25 outputs for the frozen issue `#14` corpus; and
- deterministic query parsing, inverted-index retrieval, BM25 ranking, snippets, and explain output for the frozen explicit-token retrieval slice.

This package does not yet define large-corpus indexing, fielded query syntax, relevance-judgment evaluation, streaming retrieval, or corpus-level result envelopes.
