# `@ismail-elkorchi/textcorpus`

Deterministic corpus collection and fingerprint package.

Current scope:

- explicit `TextDocDocumentV1` corpus entries with declared token-view references;
- deterministic corpus collection validation and entry ordering;
- metadata-based corpus slicing without hidden tokenization changes;
- KWIC/concordance, frequency, n-gram, co-occurrence, collocate, and pairwise document-relation APIs over explicit token layers;
- deterministic token-shingle fingerprint indexing over explicit token layers;
- deterministic raw TF, smooth TF-IDF, L2-normalized smooth TF-IDF, and Okapi BM25 parameter-variant outputs for the frozen issue `#14` corpora; and
- deterministic query parsing, required/prohibited term operators, metadata field filters, inverted-index retrieval, BM25 ranking, snippets, explain output, qrels evaluation, deterministic size thresholds, and index JSON round-trips for committed explicit-token retrieval slices;
- E2 corpus selection provenance for corpus-analysis, scoring, retrieval, and evaluation outputs; and
- deterministic JSON persistence helpers for declared textcorpus artifact families.

This package does not yet define streaming retrieval, durable filesystem index storage, external relevance benchmarks, broad field weighting, or corpus-level `textprotocol` result envelopes.
