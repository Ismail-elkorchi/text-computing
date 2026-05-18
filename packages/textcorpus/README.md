# `@ismail-elkorchi/textcorpus`

Deterministic corpus collection and fingerprint package.

Current scope:

- explicit `TextDocDocumentV1` corpus entries with declared token-view references;
- deterministic corpus collection validation and entry ordering;
- metadata-based corpus slicing without hidden tokenization changes;
- deterministic token-shingle fingerprint indexing over explicit token layers;
- deterministic raw TF, smooth TF-IDF, and Okapi BM25 outputs for the frozen issue `#14` corpus; and
- deterministic query parsing, required/prohibited term operators, metadata field filters, inverted-index retrieval, BM25 ranking, snippets, explain output, qrels evaluation, and index JSON round-trips for the frozen explicit-token retrieval slice.

This package does not yet define streaming retrieval, durable index storage, broad relevance benchmarks, broad field weighting, or corpus-level result envelopes.
