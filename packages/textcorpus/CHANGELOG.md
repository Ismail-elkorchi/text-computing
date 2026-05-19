# Changelog

## 0.1.0

- Promote package metadata to public alpha for the bounded corpus and retrieval fixture scope.

## 0.0.0

- Add the deterministic corpus collection contract, metadata slicing, and explicit-token fingerprint index.
- Add deterministic raw TF, smooth TF-IDF, and Okapi BM25 scoring for the frozen issue `#14` corpus.
- Add deterministic query parsing, inverted-index retrieval, BM25 ranking, snippets, and explain output for the frozen explicit-token retrieval slice.
- Add required/prohibited query operators, metadata field filters, retrieval-index JSON round-trips, and bounded large-corpus ordering tests.
- Add deterministic qrels evaluation for precision@k, recall@k, MRR, and nDCG@k over the frozen fielded retrieval slice.
