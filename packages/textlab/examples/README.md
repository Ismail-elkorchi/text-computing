# textlab examples

```sh
textlab package packages/textlab/package.json
textlab pack packages/textpack-en-core/textpack.manifest.json
textlab document fixtures/textdoc/examples/document-annotation-model-v1.json
textlab annotations fixtures/textdoc/examples/document-annotation-model-v1.json --layer-kind relation
textlab result-envelope result-envelope.json
textlab schema-family-envelope schema-family-envelope.json
textlab pipeline-trace pipeline-trace.json
textlab pipeline-batch-report pipeline-batch-report.json
textlab conformance-report fixtures/reports/nlp-tokenization-sbd/conformance-report.json
textlab benchmark-report benchmark-report.json
textlab corpus-fixture fixtures/corpus-tfidf-bm25/expected/corpus-tfidf-bm25-smoke.json
textlab corpus-artifact corpus-artifact.json
textlab retrieval-qrels fixtures/retrieval/qrels/retrieval-fielded-qrels.json
textlab retrieval-evaluation fixtures/retrieval/evaluation/retrieval-fielded-evaluation.json
textlab release-readiness fixtures/package-release/gates.v1.json
```

Runnable repository examples:

- [`../../../examples/textlab-pipeline-batch-report-consumer.mjs`](../../../examples/textlab-pipeline-batch-report-consumer.mjs)
  runs an async textpipeline batch and inspects its batch report through textlab.
- [`../../../examples/textlab-result-envelope-consumer.mjs`](../../../examples/textlab-result-envelope-consumer.mjs)
  runs a textpipeline batch, wraps the report in a textprotocol envelope, and inspects the envelope
  through textlab.
- [`../../../examples/textlab-schema-family-envelope-consumer.mjs`](../../../examples/textlab-schema-family-envelope-consumer.mjs)
  serializes textprotocol schema-family envelopes and inspects the parsed envelopes through textlab.
- [`../../../examples/textlab-benchmark-report-consumer.mjs`](../../../examples/textlab-benchmark-report-consumer.mjs)
  inspects a textconformance benchmark report through textlab while keeping benchmark metrics separate
  from pass/fail conformance reports.
- [`../../../examples/textlab-corpus-artifact-consumer.mjs`](../../../examples/textlab-corpus-artifact-consumer.mjs)
  builds a textcorpus frequency artifact and metric-envelope payload, then inspects both through textlab.
