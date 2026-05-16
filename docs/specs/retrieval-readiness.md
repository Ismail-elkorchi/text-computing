# Retrieval readiness

## Why this document exists

Retrieval behavior combines query parsing, an inverted index, ranking, snippets, and explain output.
This document keeps those surfaces tied to explicit fixtures before broader corpus claims are made.

## Status

- Task id: `nlp-retrieval`
- Status: `slice-proven`
- Owning package: `textcorpus`
- Current proof: deterministic retrieval over the frozen explicit-token corpus used by the TF-IDF/BM25 gate
- Current non-proof: no large-corpus index, fielded query language, relevance benchmark, streaming index, or multilingual retrieval benchmark

## Input slices

The slice manifest is [`../../fixtures/retrieval/slices.json`](../../fixtures/retrieval/slices.json).
It reuses the explicit-token corpus in
[`../../fixtures/corpus-tfidf-bm25/slices.json`](../../fixtures/corpus-tfidf-bm25/slices.json).

## Expected-output format

Expected output validates against
[`../../schemas/retrieval-expected-v1.schema.json`](../../schemas/retrieval-expected-v1.schema.json)
and records:

- parsed query tokens;
- required and prohibited lexical query operators;
- metadata field filters;
- positive BM25 hits;
- deterministic snippets;
- per-term explain values;
- deterministic index JSON round-trip behavior;
- bounded large-corpus ordering behavior;
- missing-query controls.

## Verification

Run:

```sh
node tools/validate-retrieval-feature.mjs
npm run -s check:fixtures
```
