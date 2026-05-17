# `@ismail-elkorchi/textlab`

Text-computing inspection command package.

Current scope:

- summarize `docs/specs/support-status.v1.json` deterministically;
- summarize `fixtures/reports/task-evidence-manifest.v1.json` deterministically;
- summarize one `textconformance` report deterministically;
- inspect a `textdoc` document annotation graph with deterministic layer, lifecycle, target, and graph-edge counts;
- inspect `fixtures/reports/evidence-replay.v1.json` comparator/replay status counts;
- run repository evidence replay or execution inspection commands from the CLI;
- inspect corpus and retrieval expected-output fixtures with deterministic document, term, query, hit, and explanation counts;
- expose the same summaries through the `textlab` CLI;
- reject malformed support-status, task-evidence, conformance-report, annotation, evidence-replay, and corpus-fixture inputs before rendering.

This package does not yet provide an interactive UI or browse large corpora.

## CLI

```sh
textlab support-status docs/specs/support-status.v1.json
textlab evidence fixtures/reports/task-evidence-manifest.v1.json
textlab conformance-report fixtures/reports/nlp-tokenization-sbd/conformance-report.json
textlab annotations fixtures/textdoc/examples/document-annotation-model-v1.json
textlab evidence-replay fixtures/reports/evidence-replay.v1.json
textlab evidence-run replay retrieval
textlab evidence-run execute dependency-parser
textlab corpus-fixture fixtures/retrieval/expected/retrieval-smoke.json
```
