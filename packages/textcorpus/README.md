# `@ismail-elkorchi/textcorpus`

Deterministic corpus collection and fingerprint package.

Current scope:

- explicit `TextDocDocumentV1` corpus entries with declared token-view references;
- deterministic corpus collection validation and entry ordering;
- metadata-based corpus slicing without hidden tokenization changes;
- KWIC/concordance, frequency, n-gram, co-occurrence, collocate, and pairwise document-relation APIs over explicit token layers;
- deterministic token-shingle fingerprint indexing over explicit token layers;
- deterministic raw TF, smooth TF-IDF, L2-normalized smooth TF-IDF, and Okapi BM25 parameter-variant outputs for the frozen issue `#14` corpora; and
- deterministic query parsing, required/prohibited term operators, metadata field filters, inverted-index retrieval, BM25 ranking, BM25F field-weight profiles, snippets, explain output, qrels evaluation, relevance-calibration reports over caller-provided evaluations/profiles, field-weight learning over declared BM25F search spaces, deterministic size thresholds, and index JSON round-trips for committed explicit-token retrieval slices;
- E2 corpus selection provenance for corpus-analysis, scoring, retrieval, and evaluation outputs; and
- deterministic JSON persistence helpers for declared textcorpus artifact families;
- caller-provided text-store save/load helpers for retrieval-index artifacts, with storage refs carrying byte length, checksum, corpus, formula, document-count, term-count, and field-count metadata; and
- package-owned filesystem key/path helpers for retrieval-index artifact save/load over caller-supplied filesystem IO callbacks; and
- corpus metric payload export for wrapping textcorpus artifacts in `textprotocol` corpus-metric envelopes without adding a `textprotocol` dependency to this package.

This package does not yet define broad external relevance benchmarks. Relevance calibration is deterministic comparison of caller-provided qrels/evaluation results and explicit or generated BM25F field-weight profiles. Field-weight learning is bounded to finite caller-declared search spaces over BM25F query-time weights. Filesystem storage is bounded to local retrieval-index artifact JSON.

Runnable repository examples:

- [`../../examples/textcorpus-corpus-metric-envelope-consumer.mjs`](../../examples/textcorpus-corpus-metric-envelope-consumer.mjs)
  builds a textcorpus frequency artifact, exports corpus metric payloads, wraps them with
  `textprotocol` schema-family JSON transport, and inspects the parsed envelope through `textlab`.
- [`../../examples/textcorpus-retrieval-index-storage-consumer.mjs`](../../examples/textcorpus-retrieval-index-storage-consumer.mjs)
  builds a retrieval index artifact, persists it through package-owned filesystem key/path helpers and caller-provided filesystem callbacks,
  reloads it through the storage-ref contract, and inspects the storage ref through `textlab`.
- [`../../examples/textcorpus-field-weighting-consumer.mjs`](../../examples/textcorpus-field-weighting-consumer.mjs)
  builds a BM25F retrieval index, applies a reusable field-weight profile at query time,
  and prints the disclosed effective title/body field weights.
- [`../../examples/textcorpus-relevance-calibration-consumer.mjs`](../../examples/textcorpus-relevance-calibration-consumer.mjs)
  compares baseline and caller-provided BM25F field-weight profiles against qrels and prints the selected deterministic candidate.
- [`../../examples/textcorpus-field-weight-learning-consumer.mjs`](../../examples/textcorpus-field-weight-learning-consumer.mjs)
  generates BM25F field-weight profiles from a finite search space, evaluates them against qrels, and prints the selected deterministic candidate.
