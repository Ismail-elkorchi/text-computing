# Retrieval readiness

## Why this document exists

Retrieval behavior combines query parsing, an inverted index, ranking, snippets, and explain output.
This document keeps those surfaces tied to explicit fixtures before broader corpus claims are made.

## Status

- Task id: `nlp-retrieval`
- Status: `slice-proven`
- Owning package: `textcorpus`
- Current proof: deterministic baseline BM25 retrieval over the frozen explicit-token corpus used by the TF-IDF/BM25 gate, plus fielded BM25F retrieval, standalone qrels, expected evaluation metrics, a repository-authored licensed corpus, and deterministic size thresholds over committed retrieval fixtures
- Current non-proof: no streaming index, filesystem-backed index store, external relevance benchmark, or broad multilingual retrieval benchmark

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
- explicit field specifications for fielded BM25F retrieval;
- positive BM25 hits;
- positive BM25F hits;
- deterministic snippets;
- per-term explain values;
- deterministic index JSON round-trip behavior;
- committed relevance judgments and standalone qrels for fielded smoke queries;
- committed relevance judgments and standalone qrels for the repository-authored licensed retrieval corpus;
- precision@k, recall@k, MRR, and nDCG@k evaluation output for the committed qrels;
- deterministic document-count, token-count, query-count, and serialized-index-size thresholds for the licensed retrieval corpus;
- bounded large-corpus ordering behavior;
- missing-query controls.

## Verification

Run:

```sh
node tools/validate-retrieval-feature.mjs
npm run -s check:fixtures
```
