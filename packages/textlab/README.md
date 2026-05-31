# @ismail-elkorchi/textlab

`textlab` provides deterministic inspection helpers and a small CLI for public package artifacts.

It can:

- inspect package manifests;
- inspect textpack manifests;
- inspect textdoc documents and annotation graphs;
- inspect textprotocol result envelopes;
- inspect textpipeline traces;
- inspect textpipeline batch run reports;
- inspect pack-backed textrules annotation outputs;
- render textconformance report summaries and diffs;
- inspect corpus, retrieval qrels, retrieval evaluation, and release-readiness artifacts.

## CLI

```sh
textlab package packages/textlab/package.json
textlab pack packages/textpack-en-core/pack.manifest.json
textlab pack inspect packages/textpack-en-core
textlab pack validate packages/textpack-en-core
textlab pack audit packages/textpack-en-core
textlab pack list-resources packages/textpack-en-core
textlab pack add-resource ./my-pack --family stopwords --resource-id stopwords:local --resource-path resources/stopwords.local.txt --content "the\n"
textlab pack update-resource ./my-pack --resource-id stopwords:local --next-resource-id stopwords:local:v2 --resource-path resources/stopwords.local.v2.txt --content "the\nand\n"
textlab pack remove-resource ./my-pack --resource-id stopwords:local:v2
textlab document fixtures/textdoc/examples/document-annotation-model-v1.json
textlab annotations fixtures/textdoc/examples/document-annotation-model-v1.json --layer-kind relation
textlab result-envelope result-envelope.json
textlab pipeline-trace pipeline-trace.json
textlab pipeline-batch-report pipeline-batch-report.json
textlab pack-backed-rules document-with-pack-backed-rules.json --resource-id lexicon-en-core
textlab conformance-report fixtures/reports/nlp-tokenization-sbd/conformance-report.json
textlab conformance-diff expected.json actual.json
textlab corpus-fixture fixtures/corpus-tfidf-bm25/expected/corpus-tfidf-bm25-smoke.json
textlab retrieval-qrels fixtures/retrieval/qrels/retrieval-fielded-qrels.json
textlab retrieval-evaluation fixtures/retrieval/evaluation/retrieval-fielded-evaluation.json
textlab release-readiness fixtures/package-release/gates.v1.json
```
