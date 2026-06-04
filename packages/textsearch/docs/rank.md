# Rank

Ranking models are Boolean retrieval, TF-IDF cosine scoring, BM25, BM25F, language-model retrieval with smoothing, a DFR-style pure scoring hook, static metadata boosts, and pure reranking hooks.

Scores must be finite. Invalid model parameters or hook outputs are rejected.

`explain` returns query terms, matching terms, field lengths, term frequencies, document frequencies, model name, score, boosts, rerank steps, and diagnostics.
