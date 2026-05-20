# `@ismail-elkorchi/textlab`

Text-computing inspection command package.

Current scope:

- inspect package manifests and exported package surfaces;
- inspect `textpack` manifests, resource families, targets, review state, licenses, and provenance counts;
- inspect `textdoc` documents and query annotation rows by layer kind, lifecycle state, or annotation id;
- summarize `docs/specs/support-status.v1.json` deterministically;
- summarize `fixtures/reports/task-evidence-manifest.v1.json` deterministically;
- summarize one `textconformance` report deterministically;
- render deterministic `textconformance` report diffs;
- inspect `fixtures/reports/evidence-replay.v1.json` comparator/replay status counts;
- render comparator drift and not-run rows from evidence replay;
- run repository evidence replay or execution inspection commands from the CLI;
- inspect corpus and retrieval expected-output fixtures with deterministic document, term, query, hit, and explanation counts;
- inspect retrieval qrels and retrieval evaluation metric outputs;
- inspect package release-readiness gate records;
- expose the same summaries through the `textlab` CLI as text or `--json`;
- reject malformed inputs before rendering.

This package does not provide an interactive UI, standalone comparator execution engine, or large-corpus browser.

## CLI

```sh
textlab package packages/textlab/package.json
textlab pack packages/textpack-en-core/pack.manifest.json --json
textlab document fixtures/textdoc/examples/document-annotation-model-v1.json
textlab support-status docs/specs/support-status.v1.json
textlab evidence fixtures/reports/task-evidence-manifest.v1.json
textlab conformance-report fixtures/reports/nlp-tokenization-sbd/conformance-report.json
textlab conformance-diff expected-report.json actual-report.json
textlab annotations fixtures/textdoc/examples/document-annotation-model-v1.json --layer-kind entity
textlab evidence-replay fixtures/reports/evidence-replay.v1.json
textlab comparator-drift fixtures/reports/evidence-replay.v1.json
textlab evidence-run replay retrieval
textlab evidence-run execute dependency-parser
textlab corpus-fixture fixtures/retrieval/expected/retrieval-smoke.json
textlab retrieval-qrels fixtures/retrieval/qrels/retrieval-fielded-qrels.json
textlab retrieval-evaluation fixtures/retrieval/evaluation/retrieval-fielded-evaluation.json
textlab release-readiness fixtures/package-release/gates.v1.json
```
