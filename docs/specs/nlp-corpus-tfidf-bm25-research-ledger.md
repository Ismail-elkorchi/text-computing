# NLP corpus TF-IDF/BM25 research ledger

## Scope

This ledger covers deterministic corpus term statistics, TF-IDF vectors, and BM25 query scoring over explicit token lists.

## Primary sources

- Salton-style vector-space retrieval remains the relevant baseline for TF-IDF term weighting.
- Robertson/Sparck Jones BM25 remains the relevant baseline for probabilistic retrieval scoring.
- scikit-learn documents smooth TF-IDF behavior used by a common Python comparator.
- rank-bm25 documents an Okapi BM25 implementation used for Python comparator evidence.
- Natural documents a JavaScript TF-IDF implementation with different default idf behavior.

## Comparator capability evidence

- Python comparator coverage is split between `scikit-learn 1.8.0` and `rank-bm25 0.2.2`.
- JavaScript comparator coverage uses `Natural 8.1.1` for TF-IDF behavior.
- Registry queries on 2026-04-23 recorded the frozen versions.
- The threshold corpus records `scikit-learn` smooth TF-IDF with and without L2 normalization and `rank-bm25` Okapi BM25 with `k1=1.5` and `k1=1.2`.

## Readiness consequences

- Tokenization is not part of issue `#14`; every fixture provides explicit tokens.
- Formula names must be explicit in outputs.
- Floating-point comparisons must use the recorded tolerance rather than exact string equality.
- Larger corpus evidence must declare document, token, query, and serialized-output thresholds before it can support any scale-sensitive claim.
- Comparator defaults that differ from the canonical formula are documented non-failure differences.
