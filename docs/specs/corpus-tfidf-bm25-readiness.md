# Corpus TF-IDF/BM25 readiness

## Why this document exists

Issue `#14` does not permit corpus scoring behavior until formulas, token policy, numeric tolerance, comparator versions, and expected-output format are frozen.

## Token policy

The readiness corpus uses explicit lower-case lexical token lists. The corpus feature package must not perform hidden tokenization for this gate.

## Formula policy

The frozen formula names are:

- `tf.raw-count`;
- `df.document-count`;
- `tfidf.sklearn-smooth-raw`;
- `bm25.okapi.k1-1.5.b-0.75`.

## Numeric tolerance

Expected numeric comparisons use absolute tolerance `1e-12` for recorded outputs. Future feature tests may use this tolerance for floating-point replay.

## Input slices

The canonical readiness corpus lives in [`../../fixtures/corpus-tfidf-bm25/slices.json`](../../fixtures/corpus-tfidf-bm25/slices.json).

It covers repeated terms, shared terms, singleton terms, an empty document, a missing-query term, and stable ordering.

## Expected-output format

Recorded expected outputs live in [`../../fixtures/corpus-tfidf-bm25/expected/`](../../fixtures/corpus-tfidf-bm25/expected/). Each artifact validates against [`../../schemas/corpus-tfidf-bm25-expected-v1.schema.json`](../../schemas/corpus-tfidf-bm25-expected-v1.schema.json).

## Comparator freeze

Frozen comparator versions live in [`../../fixtures/corpus-tfidf-bm25/tool-versions.json`](../../fixtures/corpus-tfidf-bm25/tool-versions.json).

The current comparator set includes Python and JavaScript evidence:

- `scikit-learn 1.8.0` for smooth TF-IDF;
- `rank-bm25 0.2.2` for Okapi BM25;
- `Natural 8.1.1` for JavaScript TF-IDF comparison.

## Comparator outputs

Committed comparator captures live in [`../../fixtures/corpus-tfidf-bm25/comparisons/`](../../fixtures/corpus-tfidf-bm25/comparisons/).

Comparator outputs are diagnostic evidence, not normative expected outputs when formula defaults differ from the frozen formula policy.

## Verification

`npm run -s check:fixtures` validates the corpus slice manifest, formula/version freeze, expected outputs, comparator captures, required readiness documentation headings, and support-status state before any feature PR for issue `#14`.

