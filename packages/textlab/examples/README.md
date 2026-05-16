# @ismail-elkorchi/textlab examples

Run the package CLI against committed repository fixtures:

```sh
textlab support-status docs/specs/support-status.v1.json
textlab evidence fixtures/reports/task-evidence-manifest.v1.json
textlab conformance-report fixtures/reports/nlp-tokenization-sbd/conformance-report.json
textlab annotations fixtures/textdoc/examples/document-annotation-model-v1.json
textlab evidence-replay fixtures/reports/evidence-replay.v1.json
textlab corpus-fixture fixtures/retrieval/expected/retrieval-smoke.json
```

The commands render deterministic text summaries and reject malformed JSON inputs before rendering.
