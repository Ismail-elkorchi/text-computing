# Corpus TF-IDF/BM25 output differences

## Documented non-failure differences

- The threshold corpus records both raw and L2-normalized smooth TF-IDF outputs; normalization differences are formula variants, not drift.
- The threshold corpus records Okapi BM25 with `k1=1.5` and `k1=1.2`; parameter differences are formula variants, not drift.
- Empty documents remain part of document count for the frozen formula policy and must preserve deterministic output ordering.
- Missing query terms score zero for every document in the frozen expected output.
