# Corpus TF-IDF/BM25 output differences

## Documented non-failure differences

- Natural `8.1.1` uses a different default idf formula from the canonical `tfidf.sklearn-smooth-raw` fixture; this is comparator evidence, not a failure.
- rank-bm25 `0.2.2` floors or adjusts negative idf behavior according to its implementation; the frozen smoke corpus avoids negative-idf assertions and records only observed scores.
- Empty documents remain part of document count for the frozen formula policy and must preserve deterministic output ordering.
- Missing query terms score zero for every document in the frozen expected output.

