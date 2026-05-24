# textlab examples

```sh
textlab package packages/textlab/package.json
textlab pack packages/textpack-en-core/textpack.manifest.json
textlab document fixtures/textdoc/examples/document-annotation-model-v1.json
textlab annotations fixtures/textdoc/examples/document-annotation-model-v1.json --layer-kind relation
textlab conformance-report fixtures/reports/nlp-tokenization-sbd/conformance-report.json
textlab corpus-fixture fixtures/corpus-tfidf-bm25/expected/corpus-tfidf-bm25-smoke.json
textlab retrieval-qrels fixtures/retrieval/qrels/retrieval-fielded-qrels.json
textlab retrieval-evaluation fixtures/retrieval/evaluation/retrieval-fielded-evaluation.json
textlab release-readiness fixtures/package-release/gates.v1.json
```
