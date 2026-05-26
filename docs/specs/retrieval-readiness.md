# Retrieval readiness

## Why this document exists

Retrieval behavior combines query parsing, an inverted index, ranking, snippets, and explain output.
This document keeps those surfaces tied to explicit fixtures before broader corpus statements are made.

## Status

- Task id: `nlp-retrieval`
- Status: `slice-validated`
- Owning package: `textcorpus`
- Current verification: deterministic baseline BM25 retrieval over the frozen explicit-token corpus used by the TF-IDF/BM25 gate, fielded BM25F retrieval, standalone qrels, expected evaluation metrics, a repository-authored licensed corpus, a pinned BEIR NFCorpus title-token subset with external qrels, streaming iteration over the package index, durable index artifacts, phrase/proximity/boolean query parsing, citation windows, quote grounding, and deterministic size thresholds over committed retrieval fixtures
- Current non-verification: no broad retrieval benchmark, filesystem-specific index store, Lucene-backed relevance statement, or broad multilingual retrieval benchmark

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
- deterministic retrieval index artifact checksums;
- deterministic streaming iteration with the same output as batch retrieval;
- phrase, proximity, and boolean query controls;
- citation windows and quote grounding over `textdoc` token spans;
- committed relevance judgments and standalone qrels for fielded smoke queries;
- committed relevance judgments and standalone qrels for the repository-authored licensed retrieval corpus;
- committed external qrels for the BEIR NFCorpus title-token subset;
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
